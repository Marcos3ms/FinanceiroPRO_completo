import type { createClient } from "@/lib/supabase/server";

export type CategoryRow = { id: string; nome: string };

/** Categorias do usuário, ordenadas em pt-BR. */
export async function getCategories(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<CategoryRow[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, nome")
    .eq("user_id", userId);
  return (data ?? []).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Só os nomes das categorias do usuário (para os seletores). */
export async function getCategoryNames(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  return (await getCategories(supabase, userId)).map((c) => c.nome);
}
