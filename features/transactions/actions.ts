"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor, type ActionState } from "@/features/common/types";
import { TRANSFER_CATEGORY } from "@/lib/categories";

const VALID_PAYMENT_METHODS = new Set(["pix", "transferencia", "boleto"]);

async function saveTransaction(
  type: "receita" | "despesa",
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const accountId = String(formData.get("account_id") ?? "").trim() || null;

  const rawPaymentMethod = String(formData.get("payment_method") ?? "").trim();
  const paymentMethod =
    type === "despesa" && VALID_PAYMENT_METHODS.has(rawPaymentMethod)
      ? rawPaymentMethod
      : null;
  const paymentDetails =
    paymentMethod === "pix" || paymentMethod === "transferencia"
      ? String(formData.get("payment_details") ?? "").trim() || null
      : null;

  if (!descricao) return { error: "Informe a descrição.", ok: false };
  if (valor === null || valor <= 0)
    return { error: "Informe um valor válido.", ok: false };
  if (!data) return { error: "Informe a data.", ok: false };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  // Transferência entre contas: cria duas transações vinculadas (apenas no create)
  if (type === "despesa" && categoria === TRANSFER_CATEGORY && !id) {
    const origem = String(formData.get("account_origem") ?? "").trim();
    const destino = String(formData.get("account_destino") ?? "").trim();

    if (!origem)
      return { error: "Selecione a conta de origem.", ok: false };
    if (!destino)
      return { error: "Selecione a conta de destino.", ok: false };
    if (origem === destino)
      return {
        error: "Conta de origem e destino devem ser diferentes.",
        ok: false,
      };

    const transferId = randomUUID();
    const { error } = await supabase.from("transactions").insert([
      {
        user_id: user.id,
        type: "despesa",
        descricao,
        valor,
        data,
        categoria: TRANSFER_CATEGORY,
        account_id: origem,
        transfer_id: transferId,
      },
      {
        user_id: user.id,
        type: "receita",
        descricao,
        valor,
        data,
        categoria: TRANSFER_CATEGORY,
        account_id: destino,
        transfer_id: transferId,
      },
    ]);
    if (error) return { error: error.message, ok: false };

    revalidatePath("/", "layout");
    return { error: null, ok: true };
  }

  const payload = {
    descricao,
    valor,
    data,
    categoria,
    account_id: accountId,
    payment_method: paymentMethod,
    payment_details: paymentDetails,
  };

  if (id) {
    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", id);
    if (error) return { error: error.message, ok: false };
  } else {
    const { error } = await supabase
      .from("transactions")
      .insert({ ...payload, user_id: user.id, type });
    if (error) return { error: error.message, ok: false };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function saveReceitaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveTransaction("receita", formData);
}

export async function saveDespesaAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return saveTransaction("despesa", formData);
}

export async function deleteTransactionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();

  const { data: row } = await supabase
    .from("transactions")
    .select("transfer_id")
    .eq("id", id)
    .maybeSingle();

  if (row?.transfer_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("transfer_id", row.transfer_id);
  } else {
    await supabase.from("transactions").delete().eq("id", id);
  }

  revalidatePath("/", "layout");
}
