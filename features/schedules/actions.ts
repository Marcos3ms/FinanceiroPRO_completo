"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseValor, type ActionState } from "@/features/common/types";

const VALID_FREQ = new Set(["mensal", "semanal", "anual"]);
const VALID_PAYMENT_METHODS = new Set(["pix", "transferencia", "boleto"]);

export async function saveScheduleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = parseValor(String(formData.get("valor") ?? ""));
  const frequencia = String(formData.get("frequencia") ?? "").trim();
  const vencimento = String(formData.get("vencimento") ?? "");
  const categoria = String(formData.get("categoria") ?? "").trim() || null;
  const accountId = String(formData.get("account_id") ?? "").trim() || null;
  const lembretes = formData.getAll("lembretes").map(String).filter(Boolean);
  const rawPaymentMethod = String(formData.get("payment_method") ?? "").trim();
  const paymentMethod = VALID_PAYMENT_METHODS.has(rawPaymentMethod)
    ? rawPaymentMethod
    : null;
  const paymentDetails =
    paymentMethod === "pix" || paymentMethod === "transferencia"
      ? String(formData.get("payment_details") ?? "").trim() || null
      : null;

  if (!descricao) return { error: "Informe a descrição.", ok: false };
  if (valor === null || valor <= 0)
    return { error: "Informe um valor válido.", ok: false };
  if (!VALID_FREQ.has(frequencia))
    return { error: "Frequência inválida.", ok: false };
  if (!vencimento) return { error: "Informe o vencimento.", ok: false };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  const payload = {
    descricao,
    valor,
    frequencia,
    vencimento,
    categoria,
    account_id: accountId,
    lembretes,
    payment_method: paymentMethod,
    payment_details: paymentDetails,
  };

  if (id) {
    const { error } = await supabase
      .from("schedules")
      .update(payload)
      .eq("id", id);
    if (error) return { error: error.message, ok: false };
  } else {
    const { error } = await supabase
      .from("schedules")
      .insert({ ...payload, user_id: user.id });
    if (error) return { error: error.message, ok: false };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function deleteScheduleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("schedules").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function markScheduleAsPaidAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: schedule } = await supabase
    .from("schedules")
    .select(
      "id, descricao, valor, vencimento, categoria, account_id, paid_at, payment_method, payment_details",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!schedule || schedule.paid_at) return;

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    type: "despesa",
    descricao: schedule.descricao,
    valor: schedule.valor,
    data: schedule.vencimento,
    categoria: schedule.categoria,
    account_id: schedule.account_id,
    payment_method: schedule.payment_method ?? null,
    payment_details: schedule.payment_details ?? null,
  });
  if (insertError) return;

  await supabase
    .from("schedules")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/", "layout");
}
