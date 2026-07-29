"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseOfx } from "@/features/import/ofx";

export type ImportResult = {
  ok: boolean;
  error: string | null;
  imported: number;
  duplicated: number;
};

/**
 * Importa lançamentos de um extrato OFX para uma conta.
 * O conteúdo é reprocessado no servidor (fonte da verdade); só as chaves
 * selecionadas entram, e as que já existem (mesmo import_fitid) são puladas.
 */
export async function importOfxAction(
  content: string,
  accountId: string,
  selectedKeys: string[],
): Promise<ImportResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, error: "Sessão expirada.", imported: 0, duplicated: 0 };

  if (!accountId)
    return { ok: false, error: "Selecione a conta.", imported: 0, duplicated: 0 };

  // Garante que a conta pertence ao usuário.
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account)
    return { ok: false, error: "Conta inválida.", imported: 0, duplicated: 0 };

  const selected = new Set(selectedKeys);
  const parsed = parseOfx(content).filter((t) => selected.has(t.key));
  if (parsed.length === 0)
    return {
      ok: false,
      error: "Nenhum lançamento selecionado.",
      imported: 0,
      duplicated: 0,
    };

  // Deduplicação: busca os import_fitid já existentes nessa conta.
  const { data: existingRows } = await supabase
    .from("transactions")
    .select("import_fitid")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .not("import_fitid", "is", null);
  const existing = new Set(
    (existingRows ?? []).map((r) => r.import_fitid as string),
  );

  const toInsert = parsed.filter((t) => !existing.has(t.key));
  const duplicated = parsed.length - toInsert.length;

  if (toInsert.length === 0)
    return { ok: true, error: null, imported: 0, duplicated };

  const rows = toInsert.map((t) => ({
    user_id: user.id,
    type: t.type,
    descricao: t.descricao,
    valor: t.valor,
    data: t.data,
    categoria: null,
    account_id: accountId,
    import_fitid: t.key,
  }));

  const { error } = await supabase.from("transactions").insert(rows);
  if (error)
    return { ok: false, error: error.message, imported: 0, duplicated };

  revalidatePath("/", "layout");
  return { ok: true, error: null, imported: rows.length, duplicated };
}
