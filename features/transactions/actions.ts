"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor, type ActionState } from "@/features/common/types";
import { TRANSFER_CATEGORY } from "@/lib/categories";

const VALID_PAYMENT_METHODS = new Set([
  "pix",
  "transferencia",
  "boleto",
  "cartao",
]);

/**
 * Edição de transferência: só permite trocar as contas de origem e destino.
 * Descrição, valor e data ficam inalterados (as duas pernas são preservadas).
 */
async function updateTransferAccounts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transferId: string,
  formData: FormData,
): Promise<ActionState> {
  const origem = String(formData.get("account_origem") ?? "").trim();
  const destino = String(formData.get("account_destino") ?? "").trim();

  if (!origem) return { error: "Selecione a conta de origem.", ok: false };
  if (!destino) return { error: "Selecione a conta de destino.", ok: false };
  if (origem === destino)
    return {
      error: "Conta de origem e destino devem ser diferentes.",
      ok: false,
    };

  // Garante que as duas contas pertencem ao usuário.
  const { data: owned } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", userId)
    .in("id", [origem, destino]);
  if (!owned || owned.length < 2)
    return { error: "Conta inválida.", ok: false };

  // Perna de saída (despesa) -> origem; perna de entrada (receita) -> destino.
  const { error: e1 } = await supabase
    .from("transactions")
    .update({ account_id: origem })
    .eq("transfer_id", transferId)
    .eq("type", "despesa")
    .eq("user_id", userId);
  if (e1) return { error: e1.message, ok: false };

  const { error: e2 } = await supabase
    .from("transactions")
    .update({ account_id: destino })
    .eq("transfer_id", transferId)
    .eq("type", "receita")
    .eq("user_id", userId);
  if (e2) return { error: e2.message, ok: false };

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

async function saveTransaction(
  type: "receita" | "despesa",
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  // Edição de transferência é tratada à parte (só origem/destino).
  if (id) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("transfer_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return { error: "Lançamento não encontrado.", ok: false };
    if (existing.transfer_id) {
      return updateTransferAccounts(
        supabase,
        user.id,
        existing.transfer_id,
        formData,
      );
    }
  }

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valorBruto = parseValor(String(formData.get("valor") ?? ""));
  const data = String(formData.get("data") ?? "");
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const accountId = String(formData.get("account_id") ?? "").trim() || null;
  const isTransfer = categoria === TRANSFER_CATEGORY;

  // Desconto e acréscimo (apenas despesas; não se aplica a transferências)
  const desconto =
    type === "despesa" && !isTransfer
      ? (parseValor(String(formData.get("desconto") ?? "")) ?? 0)
      : 0;
  const acrescimo =
    type === "despesa" && !isTransfer
      ? (parseValor(String(formData.get("acrescimo") ?? "")) ?? 0)
      : 0;

  const rawPaymentMethod = String(formData.get("payment_method") ?? "").trim();
  const paymentMethod =
    type === "despesa" && VALID_PAYMENT_METHODS.has(rawPaymentMethod)
      ? rawPaymentMethod
      : null;
  const paymentDetails = paymentMethod
    ? String(formData.get("payment_details") ?? "").trim() || null
    : null;

  if (!descricao) return { error: "Informe a descrição.", ok: false };
  if (valorBruto === null || valorBruto <= 0)
    return { error: "Informe um valor válido.", ok: false };
  if (!data) return { error: "Informe a data.", ok: false };

  // Calcula valor final aplicando desconto e acréscimo
  const valor = Math.max(valorBruto - desconto + acrescimo, 0);
  if (valor <= 0)
    return { error: "O valor final após desconto/acréscimo deve ser maior que zero.", ok: false };

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
    desconto,
    acrescimo,
  };

  if (id) {
    // Edição normal (transferências já foram tratadas acima e retornaram).
    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: row } = await supabase
    .from("transactions")
    .select("transfer_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return;

  if (row.transfer_id) {
    await supabase
      .from("transactions")
      .delete()
      .eq("transfer_id", row.transfer_id)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
  }

  revalidatePath("/", "layout");
}
