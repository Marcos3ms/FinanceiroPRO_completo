import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidMonth, nextMonthStart } from "@/features/common/types";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = req.nextUrl.searchParams;
  const tipo = params.get("tipo") ?? "todos";
  const accountId = params.get("account_id") ?? "";
  const categoria = params.get("categoria") ?? "";
  const mes = params.get("mes") ?? "";

  let query = supabase
    .from("transactions")
    .select(
      "id, type, descricao, valor, data, categoria, desconto, acrescimo, payment_method, payment_details, accounts(nome)",
    )
    .eq("user_id", user.id)
    .order("data", { ascending: true })
    .order("created_at", { ascending: true });

  if (tipo === "receitas") query = query.eq("type", "receita");
  else if (tipo === "despesas") query = query.eq("type", "despesa");
  if (accountId) query = query.eq("account_id", accountId);
  if (categoria) query = query.eq("categoria", categoria);
  if (isValidMonth(mes)) {
    query = query.gte("data", `${mes}-01`).lt("data", nextMonthStart(mes));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const PAYMENT_LABEL: Record<string, string> = {
    pix: "PIX",
    transferencia: "Transferência",
    boleto: "Boleto",
    cartao: "Cartão",
  };

  const fmtNum = (n: number) => n.toFixed(2).replace(".", ",");

  const header = [
    "Tipo",
    "Descrição",
    "Categoria",
    "Conta",
    "Data",
    "Valor Base",
    "Desconto",
    "Acréscimo",
    "Valor",
    "Forma de Pagamento",
    "Dados de Pagamento",
  ];
  const lines = [header.join(";")];

  for (const row of data ?? []) {
    const accountName =
      Array.isArray(row.accounts)
        ? (row.accounts[0]?.nome ?? "")
        : ((row.accounts as { nome: string } | null)?.nome ?? "");
    const paymentLabel = row.payment_method
      ? (PAYMENT_LABEL[row.payment_method] ?? row.payment_method)
      : "";
    const desconto = Number(row.desconto ?? 0);
    const acrescimo = Number(row.acrescimo ?? 0);
    const valorFinal = Number(row.valor);
    const valorBase = valorFinal + desconto - acrescimo;
    lines.push(
      [
        row.type,
        csvEscape(row.descricao),
        csvEscape(row.categoria ?? ""),
        csvEscape(accountName),
        row.data,
        fmtNum(valorBase),
        fmtNum(desconto),
        fmtNum(acrescimo),
        fmtNum(valorFinal),
        csvEscape(paymentLabel),
        csvEscape(row.payment_details ?? ""),
      ].join(";"),
    );
  }

  const csv = "﻿" + lines.join("\r\n");
  const filename = `financeiro-pro-${tipo}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
