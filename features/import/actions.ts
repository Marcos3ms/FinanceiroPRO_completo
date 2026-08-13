"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOfx } from "@/features/import/ofx";
import { normalizeDescricao } from "@/features/import/categorize";
import { getCategoryNames } from "@/features/categories/queries";
import { TRANSFER_CATEGORY } from "@/lib/categories";
import {
  classifyOfxRows,
  type ExistingTxn,
  type ParsedRow,
  type RowStatus,
} from "@/features/import/classify";

export type { RowStatus };

/** Resultado da análise por linha (para exibir na prévia). */
export type AnalyzedRow = {
  status: RowStatus;
  /** Nome da conta da contraparte, quando for transferência. */
  counterpartName?: string;
};

export type ImportResult = {
  ok: boolean;
  error: string | null;
  imported: number;
  reconciled: number;
  transfers: number;
  duplicated: number;
};

const emptyResult = (error: string | null): ImportResult => ({
  ok: false,
  error,
  imported: 0,
  reconciled: 0,
  transfers: 0,
  duplicated: 0,
});

async function requireAccount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
) {
  const { data } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/**
 * Busca os FITIDs já importados na conta e os lançamentos existentes (sem
 * transfer_id) do usuário no intervalo do extrato, para classificação.
 */
async function loadContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
  parsed: ParsedRow[],
): Promise<{ importedFitids: Set<string>; existing: ExistingTxn[] }> {
  const { data: importedRows } = await supabase
    .from("transactions")
    .select("import_fitid")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .not("import_fitid", "is", null);
  const importedFitids = new Set(
    (importedRows ?? []).map((r) => r.import_fitid as string),
  );

  const datas = parsed.map((t) => t.data).sort();
  // Lançamentos que ainda não fazem parte de uma transferência, no intervalo.
  // Mesma conta (sem import_fitid) -> conciliação; outras contas -> transferência.
  const { data: existingRows } = await supabase
    .from("transactions")
    .select("id, account_id, type, valor, data, import_fitid")
    .eq("user_id", userId)
    .is("transfer_id", null)
    .gte("data", datas[0])
    .lte("data", datas[datas.length - 1]);

  return { importedFitids, existing: (existingRows ?? []) as ExistingTxn[] };
}

function toParsedRows(
  parsed: { key: string; type: "receita" | "despesa"; valor: number; data: string }[],
): ParsedRow[] {
  return parsed.map((t) => ({
    key: t.key,
    type: t.type,
    valor: t.valor,
    data: t.data,
  }));
}

/**
 * Analisa o extrato contra o que já existe, sem gravar nada:
 * - "importado": FITID já importado antes (será ignorado).
 * - "concilia": casa com um lançamento manual da MESMA conta (será vinculado).
 * - "transferencia": casa com um lançamento de tipo OPOSTO em OUTRA conta
 *   (as duas pernas viram uma transferência).
 * - "novo": lançamento novo (será inserido).
 */
export async function analyzeOfxAction(
  content: string,
  accountId: string,
  keys: string[],
): Promise<Record<string, AnalyzedRow>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !accountId) return {};
  if (!(await requireAccount(supabase, user.id, accountId))) return {};

  const selected = new Set(keys);
  const parsed = toParsedRows(parseOfx(content).filter((t) => selected.has(t.key)));
  if (parsed.length === 0) return {};

  const { importedFitids, existing } = await loadContext(
    supabase,
    user.id,
    accountId,
    parsed,
  );

  // Nomes das contas, para exibir a contraparte de uma transferência.
  const { data: accts } = await supabase
    .from("accounts")
    .select("id, nome")
    .eq("user_id", user.id);
  const acctName = new Map((accts ?? []).map((a) => [a.id, a.nome as string]));
  const acctOf = new Map(existing.map((e) => [e.id, e.account_id]));

  const classification = classifyOfxRows(
    parsed,
    accountId,
    importedFitids,
    existing,
  );

  const out: Record<string, AnalyzedRow> = {};
  for (const [key, c] of classification) {
    if (c.status === "transferencia" && c.counterpartId) {
      const otherAcct = acctOf.get(c.counterpartId) ?? null;
      out[key] = {
        status: c.status,
        counterpartName: otherAcct ? acctName.get(otherAcct) : undefined,
      };
    } else {
      out[key] = { status: c.status };
    }
  }
  return out;
}

/**
 * Importa o extrato: insere os novos, concilia os que já existiam à mão,
 * vincula transferências entre contas, ignora os já importados, e aprende as
 * categorias escolhidas.
 */
export async function importOfxAction(
  content: string,
  accountId: string,
  selectedKeys: string[],
  categoriasByKey: Record<string, string>,
  transferAccountsByKey: Record<string, { origem: string; destino: string }> = {},
): Promise<ImportResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyResult("Sessão expirada.");
  if (!accountId) return emptyResult("Selecione a conta.");
  if (!(await requireAccount(supabase, user.id, accountId)))
    return emptyResult("Conta inválida.");

  // Contas do usuário, para validar origem/destino de transferências manuais.
  const { data: acctRows } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id);
  const ownedAccounts = new Set((acctRows ?? []).map((a) => a.id as string));

  const selected = new Set(selectedKeys);
  const parsedFull = parseOfx(content).filter((t) => selected.has(t.key));
  if (parsedFull.length === 0)
    return emptyResult("Nenhum lançamento selecionado.");
  const parsed = toParsedRows(parsedFull);
  const rowByKey = new Map(parsedFull.map((t) => [t.key, t]));

  // Categorias válidas do usuário (para não gravar nome arbitrário).
  // "Transferência entre contas" é aceita mesmo não sendo gerenciável.
  const validCategorias = new Set(await getCategoryNames(supabase, user.id));
  validCategorias.add(TRANSFER_CATEGORY);
  const categoriaFor = (key: string): string | null => {
    const c = categoriasByKey[key];
    return c && validCategorias.has(c) ? c : null;
  };

  const { importedFitids, existing } = await loadContext(
    supabase,
    user.id,
    accountId,
    parsed,
  );

  const classification = classifyOfxRows(
    parsed,
    accountId,
    importedFitids,
    existing,
  );

  const toInsert: { key: string; categoria: string | null }[] = [];
  const toReconcile: { id: string; key: string; categoria: string | null }[] =
    [];
  const toTransfer: { key: string; counterpartId: string }[] = [];
  const toManualTransfer: { key: string; origem: string; destino: string }[] =
    [];
  let duplicated = 0;

  for (const [key, c] of classification) {
    if (c.status === "importado") {
      duplicated++;
      continue;
    }
    // Transferência detectada automaticamente (contraparte já existe).
    if (c.status === "transferencia" && c.counterpartId) {
      toTransfer.push({ key, counterpartId: c.counterpartId });
      continue;
    }
    // Transferência marcada manualmente: usuário escolheu a categoria e as
    // contas de origem e destino (cria as duas pernas).
    const ta = transferAccountsByKey[key];
    const isManualTransfer =
      categoriasByKey[key] === TRANSFER_CATEGORY &&
      !!ta &&
      !!ta.origem &&
      !!ta.destino &&
      ta.origem !== ta.destino &&
      ownedAccounts.has(ta.origem) &&
      ownedAccounts.has(ta.destino);
    if (isManualTransfer) {
      toManualTransfer.push({ key, origem: ta.origem, destino: ta.destino });
      continue;
    }
    if (c.status === "concilia" && c.counterpartId) {
      toReconcile.push({
        id: c.counterpartId,
        key,
        categoria: categoriaFor(key),
      });
      continue;
    }
    toInsert.push({ key, categoria: categoriaFor(key) });
  }

  // Insere os novos.
  if (toInsert.length > 0) {
    const rows = toInsert.map(({ key, categoria }) => {
      const t = rowByKey.get(key)!;
      return {
        user_id: user.id,
        type: t.type,
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        categoria,
        account_id: accountId,
        import_fitid: t.key,
      };
    });
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) return { ...emptyResult(error.message), duplicated };
  }

  // Concilia: vincula o FITID ao lançamento manual existente.
  for (const r of toReconcile) {
    const patch: Record<string, unknown> = { import_fitid: r.key };
    if (r.categoria) patch.categoria = r.categoria;
    await supabase
      .from("transactions")
      .update(patch)
      .eq("id", r.id)
      .eq("user_id", user.id);
  }

  // Transferência: insere a perna do extrato e vincula a contraparte (que está
  // em outra conta) pelo mesmo transfer_id, marcando ambas como transferência.
  for (const tr of toTransfer) {
    const t = rowByKey.get(tr.key)!;
    const transferId = randomUUID();
    const { error: insErr } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: t.type,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data,
      categoria: TRANSFER_CATEGORY,
      account_id: accountId,
      import_fitid: t.key,
      transfer_id: transferId,
    });
    if (insErr) continue;
    await supabase
      .from("transactions")
      .update({ transfer_id: transferId, categoria: TRANSFER_CATEGORY })
      .eq("id", tr.counterpartId)
      .eq("user_id", user.id);
  }

  // Transferência manual: cria as duas pernas (despesa na origem, receita no
  // destino) com o mesmo transfer_id. O FITID fica na perna que está na conta
  // do extrato, para o dedup funcionar em reimportações.
  for (const mt of toManualTransfer) {
    const t = rowByKey.get(mt.key)!;
    const transferId = randomUUID();
    await supabase.from("transactions").insert([
      {
        user_id: user.id,
        type: "despesa",
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        categoria: TRANSFER_CATEGORY,
        account_id: mt.origem,
        transfer_id: transferId,
        import_fitid: mt.origem === accountId ? t.key : null,
      },
      {
        user_id: user.id,
        type: "receita",
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        categoria: TRANSFER_CATEGORY,
        account_id: mt.destino,
        transfer_id: transferId,
        import_fitid: mt.destino === accountId ? t.key : null,
      },
    ]);
  }

  // Aprende as categorias escolhidas (descrição normalizada -> categoria).
  // Não aprende de transferências (categoria é fixa).
  const learned = new Map<string, string>();
  for (const r of [...toInsert, ...toReconcile]) {
    const categoria = "categoria" in r ? r.categoria : null;
    if (!categoria || categoria === TRANSFER_CATEGORY) continue;
    const t = rowByKey.get(r.key);
    if (!t) continue;
    const pattern = normalizeDescricao(t.descricao);
    if (pattern) learned.set(pattern, categoria);
  }
  if (learned.size > 0) {
    const ruleRows = Array.from(learned.entries()).map(([pattern, categoria]) => ({
      user_id: user.id,
      pattern,
      categoria,
    }));
    await supabase
      .from("category_rules")
      .upsert(ruleRows, { onConflict: "user_id,pattern" });
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    error: null,
    imported: toInsert.length,
    reconciled: toReconcile.length,
    transfers: toTransfer.length + toManualTransfer.length,
    duplicated,
  };
}
