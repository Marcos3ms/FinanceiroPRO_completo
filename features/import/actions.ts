"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOfx, type OfxTransaction } from "@/features/import/ofx";
import { normalizeDescricao } from "@/features/import/categorize";
import { getCategoryNames } from "@/features/categories/queries";

export type RowStatus = "novo" | "importado" | "concilia";

export type ImportResult = {
  ok: boolean;
  error: string | null;
  imported: number;
  reconciled: number;
  duplicated: number;
};

function valorCents(v: number): number {
  return Math.round(v * 100);
}

function matchKey(data: string, type: string, valor: number): string {
  return `${data}|${type}|${valorCents(valor)}`;
}

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
 * Analisa o extrato contra o que já existe na conta, sem gravar nada:
 * - "importado": FITID já importado antes (será ignorado).
 * - "concilia": casa com um lançamento existente feito à mão (será vinculado).
 * - "novo": lançamento novo (será inserido).
 */
export async function analyzeOfxAction(
  content: string,
  accountId: string,
  keys: string[],
): Promise<Record<string, RowStatus>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !accountId) return {};
  if (!(await requireAccount(supabase, user.id, accountId))) return {};

  const selected = new Set(keys);
  const parsed = parseOfx(content).filter((t) => selected.has(t.key));
  if (parsed.length === 0) return {};

  // FITIDs já importados nessa conta.
  const { data: importedRows } = await supabase
    .from("transactions")
    .select("import_fitid")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .not("import_fitid", "is", null);
  const importedFitids = new Set(
    (importedRows ?? []).map((r) => r.import_fitid as string),
  );

  // Lançamentos manuais (sem import_fitid) no intervalo do extrato.
  const datas = parsed.map((t) => t.data).sort();
  const { data: manualRows } = await supabase
    .from("transactions")
    .select("id, data, valor, type")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .is("import_fitid", null)
    .gte("data", datas[0])
    .lte("data", datas[datas.length - 1]);

  const manualCount = new Map<string, number>();
  for (const r of manualRows ?? []) {
    const k = matchKey(r.data, r.type, Number(r.valor));
    manualCount.set(k, (manualCount.get(k) ?? 0) + 1);
  }

  const statuses: Record<string, RowStatus> = {};
  for (const t of parsed) {
    if (importedFitids.has(t.key)) {
      statuses[t.key] = "importado";
      continue;
    }
    const k = matchKey(t.data, t.type, t.valor);
    const avail = manualCount.get(k) ?? 0;
    if (avail > 0) {
      manualCount.set(k, avail - 1);
      statuses[t.key] = "concilia";
    } else {
      statuses[t.key] = "novo";
    }
  }
  return statuses;
}

/**
 * Importa o extrato: insere os novos, concilia (vincula) os que já existiam à
 * mão, ignora os já importados, e aprende as categorias escolhidas.
 */
export async function importOfxAction(
  content: string,
  accountId: string,
  selectedKeys: string[],
  categoriasByKey: Record<string, string>,
): Promise<ImportResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      ok: false,
      error: "Sessão expirada.",
      imported: 0,
      reconciled: 0,
      duplicated: 0,
    };
  if (!accountId)
    return {
      ok: false,
      error: "Selecione a conta.",
      imported: 0,
      reconciled: 0,
      duplicated: 0,
    };
  if (!(await requireAccount(supabase, user.id, accountId)))
    return {
      ok: false,
      error: "Conta inválida.",
      imported: 0,
      reconciled: 0,
      duplicated: 0,
    };

  const selected = new Set(selectedKeys);
  const parsed = parseOfx(content).filter((t) => selected.has(t.key));
  if (parsed.length === 0)
    return {
      ok: false,
      error: "Nenhum lançamento selecionado.",
      imported: 0,
      reconciled: 0,
      duplicated: 0,
    };

  // Categorias válidas do usuário (para não gravar nome arbitrário).
  const validCategorias = new Set(await getCategoryNames(supabase, user.id));
  const categoriaFor = (key: string): string | null => {
    const c = categoriasByKey[key];
    return c && validCategorias.has(c) ? c : null;
  };

  // FITIDs já importados → ignorar.
  const { data: importedRows } = await supabase
    .from("transactions")
    .select("import_fitid")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .not("import_fitid", "is", null);
  const importedFitids = new Set(
    (importedRows ?? []).map((r) => r.import_fitid as string),
  );

  // Lançamentos manuais para conciliação (id disponível para vincular).
  const datas = parsed.map((t) => t.data).sort();
  const { data: manualRows } = await supabase
    .from("transactions")
    .select("id, data, valor, type")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .is("import_fitid", null)
    .gte("data", datas[0])
    .lte("data", datas[datas.length - 1]);

  const manualByKey = new Map<string, string[]>();
  for (const r of manualRows ?? []) {
    const k = matchKey(r.data, r.type, Number(r.valor));
    const list = manualByKey.get(k) ?? [];
    list.push(r.id as string);
    manualByKey.set(k, list);
  }

  const toInsert: (OfxTransaction & { categoria: string | null })[] = [];
  const toReconcile: { id: string; key: string; categoria: string | null }[] =
    [];
  let duplicated = 0;

  for (const t of parsed) {
    if (importedFitids.has(t.key)) {
      duplicated++;
      continue;
    }
    const k = matchKey(t.data, t.type, t.valor);
    const pool = manualByKey.get(k);
    if (pool && pool.length > 0) {
      const id = pool.shift()!;
      toReconcile.push({ id, key: t.key, categoria: categoriaFor(t.key) });
    } else {
      toInsert.push({ ...t, categoria: categoriaFor(t.key) });
    }
  }

  // Insere os novos.
  if (toInsert.length > 0) {
    const rows = toInsert.map((t) => ({
      user_id: user.id,
      type: t.type,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data,
      categoria: t.categoria,
      account_id: accountId,
      import_fitid: t.key,
    }));
    const { error } = await supabase.from("transactions").insert(rows);
    if (error)
      return {
        ok: false,
        error: error.message,
        imported: 0,
        reconciled: 0,
        duplicated,
      };
  }

  // Concilia: vincula o FITID ao lançamento manual existente (e completa a
  // categoria se o usuário escolheu uma).
  for (const r of toReconcile) {
    const patch: Record<string, unknown> = { import_fitid: r.key };
    if (r.categoria) patch.categoria = r.categoria;
    await supabase
      .from("transactions")
      .update(patch)
      .eq("id", r.id)
      .eq("user_id", user.id);
  }

  // Aprende as categorias escolhidas (descrição normalizada -> categoria).
  const processed = new Set<string>([
    ...toInsert.map((t) => t.key),
    ...toReconcile.map((r) => r.key),
  ]);
  const learned = new Map<string, string>();
  for (const t of parsed) {
    if (!processed.has(t.key)) continue;
    const categoria = categoriaFor(t.key);
    if (!categoria) continue;
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
    duplicated,
  };
}
