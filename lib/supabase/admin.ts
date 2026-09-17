import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client administrativo (service role). Só pode ser usado no servidor — a chave
 * NUNCA vai para o navegador. Usado para operações privilegiadas como excluir o
 * próprio usuário do auth (que cascata todas as tabelas). Retorna null se a
 * variável SUPABASE_SERVICE_ROLE_KEY não estiver configurada.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
