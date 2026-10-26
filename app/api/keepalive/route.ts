import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Endpoint chamado por um cron diário (ver vercel.json) para "tocar" o banco e
 * impedir que o projeto Supabase (plano free) seja pausado por inatividade.
 * Faz uma consulta mínima — a RLS retorna vazio sem sessão, mas o acesso já
 * conta como atividade.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, error: "Variáveis do Supabase ausentes." },
      { status: 500 },
    );
  }

  const supabase = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("accounts").select("id").limit(1);

  return NextResponse.json({
    ok: !error,
    at: new Date().toISOString(),
    error: error?.message ?? null,
  });
}
