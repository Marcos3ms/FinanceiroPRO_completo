"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState } from "@/features/common/types";

export async function saveAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const banco = String(formData.get("banco") ?? "").trim() || null;
  const agencia = String(formData.get("agencia") ?? "").trim() || null;
  const conta = String(formData.get("conta") ?? "").trim() || null;

  if (!nome) return { error: "Informe o nome da conta.", ok: false };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  if (id) {
    const { error } = await supabase
      .from("accounts")
      .update({ nome, banco, agencia, conta })
      .eq("id", id);
    if (error) return { error: error.message, ok: false };
  } else {
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      nome,
      banco,
      agencia,
      conta,
    });
    if (error) return { error: error.message, ok: false };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

/**
 * Move uma conta para cima ou para baixo na ordem de exibição (relatórios e
 * listas). Normaliza a ordem de todas as contas do usuário (0..n-1) a cada
 * movimento, para não depender de valores esparsos/nulos.
 */
export async function moveAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: accts } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .order("ordem", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const list = (accts ?? []).map((a) => a.id as string);
  const idx = list.indexOf(id);
  if (idx === -1) return;

  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= list.length) return;

  [list[idx], list[target]] = [list[target], list[idx]];

  // Grava a nova ordem sequencial para todas as contas.
  await Promise.all(
    list.map((accId, i) =>
      supabase
        .from("accounts")
        .update({ ordem: i })
        .eq("id", accId)
        .eq("user_id", user.id),
    ),
  );

  revalidatePath("/", "layout");
}

export async function deleteAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Descobre as transferências que envolvem esta conta, para remover também a
  // perna correspondente que fica em OUTRA conta (uma transferência é uma
  // operação única entre duas contas — não deve sobrar meia transferência).
  const { data: legs } = await supabase
    .from("transactions")
    .select("transfer_id")
    .eq("user_id", user.id)
    .eq("account_id", id)
    .not("transfer_id", "is", null);
  const transferIds = Array.from(
    new Set((legs ?? []).map((l) => l.transfer_id as string)),
  );

  // Remove todos os lançamentos (receitas/despesas) da conta. Isso cobre também
  // relatórios, visão geral e importações, que derivam das transações.
  await supabase
    .from("transactions")
    .delete()
    .eq("user_id", user.id)
    .eq("account_id", id);

  // Remove a contraparte das transferências (a perna que está na outra conta).
  if (transferIds.length > 0) {
    await supabase
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .in("transfer_id", transferIds);
  }

  // Remove os agendamentos vinculados à conta.
  await supabase
    .from("schedules")
    .delete()
    .eq("user_id", user.id)
    .eq("account_id", id);

  // Por fim, remove a própria conta.
  await supabase.from("accounts").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/", "layout");
}
