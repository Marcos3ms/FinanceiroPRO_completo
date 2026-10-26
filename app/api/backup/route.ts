import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * GET /api/backup          -> backup completo em JSON (todas as tabelas do usuário)
 * GET /api/backup?format=csv -> lançamentos (receitas/despesas) em CSV
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const format = new URL(request.url).searchParams.get("format");
  const today = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const { data: rows } = await supabase
      .from("transactions")
      .select(
        "data, type, descricao, categoria, valor, desconto, acrescimo, payment_method, payment_details, accounts(nome)",
      )
      .eq("user_id", user.id)
      .order("data", { ascending: true });

    const header = [
      "Data",
      "Tipo",
      "Descrição",
      "Categoria",
      "Conta",
      "Valor",
      "Desconto",
      "Acréscimo",
      "Forma de pagamento",
      "Detalhes do pagamento",
    ];
    const lines = [header.join(";")];
    for (const r of rows ?? []) {
      const conta = Array.isArray(r.accounts)
        ? (r.accounts[0]?.nome ?? "")
        : ((r.accounts as { nome: string } | null)?.nome ?? "");
      lines.push(
        [
          r.data,
          r.type,
          r.descricao,
          r.categoria ?? "",
          conta,
          r.valor,
          r.desconto ?? 0,
          r.acrescimo ?? 0,
          r.payment_method ?? "",
          r.payment_details ?? "",
        ]
          .map(csvCell)
          .join(";"),
      );
    }
    // BOM para o Excel reconhecer acentuação (UTF-8).
    const csv = "﻿" + lines.join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="financeiropro-lancamentos-${today}.csv"`,
      },
    });
  }

  const [profile, accounts, transactions, schedules, categories, categoryRules] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: true }),
      supabase
        .from("schedules")
        .select("*")
        .eq("user_id", user.id)
        .order("vencimento", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("nome", { ascending: true }),
      supabase.from("category_rules").select("*").eq("user_id", user.id),
    ]);

  const backup = {
    app: "FinanceiroPro",
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile: profile.data ?? null,
    accounts: accounts.data ?? [],
    transactions: transactions.data ?? [],
    schedules: schedules.data ?? [],
    categories: categories.data ?? [],
    categoryRules: categoryRules.data ?? [],
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiropro-backup-${today}.json"`,
    },
  });
}
