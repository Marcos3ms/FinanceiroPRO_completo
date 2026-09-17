"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type ActionState } from "@/features/common/types";

/**
 * Exclui DEFINITIVAMENTE a conta do usuário logado. Apaga o usuário do auth, o
 * que remove em cascata tudo que é dele: perfil, contas, transações (receitas,
 * despesas, transferências), agendamentos, categorias e regras de importação.
 * Exige digitar o e-mail para confirmar. Ação irreversível.
 */
export async function deleteMyAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  const confirmEmail = String(formData.get("confirmEmail") ?? "")
    .trim()
    .toLowerCase();
  if (!confirmEmail || confirmEmail !== (user.email ?? "").toLowerCase())
    return {
      error: "Digite seu e-mail corretamente para confirmar a exclusão.",
      ok: false,
    };

  const admin = createAdminClient();
  if (!admin)
    return {
      error:
        "Exclusão indisponível: o servidor não tem SUPABASE_SERVICE_ROLE_KEY configurada.",
      ok: false,
    };

  // Apaga o usuário do auth; as tabelas em cascata (profiles, accounts,
  // transactions, schedules, categories, category_rules) são removidas junto.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message, ok: false };

  // Encerra a sessão e leva para o login.
  await supabase.auth.signOut();
  redirect("/login");
}
