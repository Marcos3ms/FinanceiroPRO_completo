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

export async function deleteAccountAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  await supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/", "layout");
}
