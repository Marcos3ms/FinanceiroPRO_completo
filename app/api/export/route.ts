import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isValidMonth,
  isValidDate,
  nextMonthStart,
  nextDay,
} from "@/features/common/types";
import { buildOfx, type ExportTxn } from "@/features/import/ofx";

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
  const periodo = params.get("periodo") ?? "";
  const inicio = params.get("inicio") ?? "";
  const fim = params.get("fim") ?? "";
  const isCustomPeriod =
    periodo === "personalizado" &&
    isValidDate(inicio) &&
    isValidDate(fim) &&
    inicio <= fim;

  let query = supabase
    .from("transactions")
    .select("id, type, descricao, valor, data, categoria")
    .eq("user_id", user.id)
    .order("data", { ascending: true })
    .order("created_at", { ascending: true });

  if (tipo === "receitas") query = query.eq("type", "receita");
  else if (tipo === "despesas") query = query.eq("type", "despesa");
  if (accountId) query = query.eq("account_id", accountId);
  if (categoria) query = query.eq("categoria", categoria);
  if (isCustomPeriod) {
    query = query.gte("data", inicio).lt("data", nextDay(fim));
  } else if (isValidMonth(mes)) {
    query = query.gte("data", `${mes}-01`).lt("data", nextMonthStart(mes));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const txns: ExportTxn[] = (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    valor: Number(row.valor),
    data: row.data,
    descricao: row.descricao,
    categoria: row.categoria,
  }));

  const ofx = buildOfx(txns);
  const filename = `financeiro-pro-${tipo}-${new Date()
    .toISOString()
    .slice(0, 10)}.ofx`;

  return new NextResponse(ofx, {
    headers: {
      "Content-Type": "application/x-ofx; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
