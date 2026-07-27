"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionState } from "@/features/common/types";
import { RESERVED_CATEGORIES } from "@/lib/categories";

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const nome = String(formData.get("nome") ?? "").trim();

  if (!nome) return { error: "Informe o nome da categoria.", ok: false };
  if (nome.length > 60)
    return { error: "Nome muito longo (máx. 60 caracteres).", ok: false };
  if ((RESERVED_CATEGORIES as readonly string[]).includes(nome))
    return { error: "Esse nome é reservado pelo sistema.", ok: false };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada.", ok: false };

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, nome });

  if (error) {
    // 23505 = unique_violation (categoria já existe)
    if (error.code === "23505")
      return { error: "Essa categoria já existe.", ok: false };
    return { error: error.message, ok: false };
  }

  revalidatePath("/", "layout");
  return { error: null, ok: true };
}

export async function deleteCategoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Não altera as transações existentes — elas mantêm o nome da categoria
  // como texto; apenas some da lista de opções.
  await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
}
