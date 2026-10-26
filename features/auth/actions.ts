"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null };
export type ResetState = { error: string | null; sent: boolean };

const SERVER_DOWN_MSG =
  "Não foi possível conectar ao servidor de autenticação. Ele pode estar temporariamente indisponível. Tente novamente em alguns minutos.";

/** Normaliza o erro do Supabase numa mensagem legível (evita exibir "{}"). */
function authErrorMessage(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message ?? "").trim()
      : String(err ?? "").trim();
  if (!msg || msg === "{}" || /gateway timeout|fetch failed|timeout/i.test(msg))
    return SERVER_DOWN_MSG;
  if (/invalid login credentials/i.test(msg))
    return "E-mail ou senha incorretos.";
  return msg;
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = createClient();
  let authError: unknown = null;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    authError = error;
  } catch (e) {
    authError = e;
  }

  if (authError) return { error: authErrorMessage(authError) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password || !fullName || !username) {
    return { error: "Preencha todos os campos." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter ao menos 6 caracteres." };
  }

  const supabase = createClient();
  let authError: unknown = null;
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, username },
      },
    });
    authError = error;
  } catch (e) {
    authError = e;
  }

  if (authError) return { error: authErrorMessage(authError) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function requestPasswordResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail.", sent: false };

  const origin =
    headers().get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";

  const supabase = createClient();
  let authError: unknown = null;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
    });
    authError = error;
  } catch (e) {
    authError = e;
  }

  if (authError) return { error: authErrorMessage(authError), sent: false };
  return { error: null, sent: true };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6)
    return { error: "A senha deve ter ao menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não conferem." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error:
        "Link inválido ou expirado. Solicite a redefinição de senha novamente.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
