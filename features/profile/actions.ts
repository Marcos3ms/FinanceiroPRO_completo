"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState } from "@/features/common/types";

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !username || !email) {
    return { error: "Preencha todos os campos.", ok: false };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, username })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message, ok: false };

  if (email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { error: emailError.message, ok: false };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: fullName, username },
  });
  if (metaError) return { error: metaError.message, ok: false };

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function updatePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < 6) {
    return { error: "A senha deve ter ao menos 6 caracteres.", ok: false };
  }
  if (password !== confirm) {
    return { error: "As senhas não conferem.", ok: false };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, ok: false };

  return { error: null, ok: true };
}

export async function updateCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const companyName = String(formData.get("company_name") ?? "").trim() || null;
  const cnpj = String(formData.get("cnpj") ?? "").trim() || null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, company_name: companyName, cnpj },
      { onConflict: "id" },
    );
  if (error) return { error: error.message, ok: false };

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}
