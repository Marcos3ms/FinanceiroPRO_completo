import type { createClient } from "@/lib/supabase/server";
import type { CategoryRule } from "@/features/import/categorize";

/** Regras de categorização aprendidas nas importações do usuário. */
export async function getCategoryRules(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<CategoryRule[]> {
  const { data } = await supabase
    .from("category_rules")
    .select("pattern, categoria")
    .eq("user_id", userId);
  return (data ?? []) as CategoryRule[];
}
