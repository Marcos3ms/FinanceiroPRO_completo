import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import CompanyHeader from "@/components/layout/CompanyHeader";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard, { EmptyState } from "@/components/ui/ChartCard";
import DespesasPorCategoria from "@/components/reports/DespesasPorCategoria";
import SaldoMensalContas from "@/components/dashboard/SaldoMensalContas";
import { createClient } from "@/lib/supabase/server";
import {
  formatBRL,
  currentMonthBR,
  nextMonthStart,
} from "@/features/common/types";

export const metadata = { title: "Visão Geral — FinanceiroPro" };

const MONTH_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, { data: accounts }, { data: profile }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, valor, data, categoria, transfer_id, account_id")
        .eq("user_id", user.id)
        .order("data", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, nome")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("company_name, cnpj")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const all = rows ?? [];
  const realOnly = all.filter((t) => !t.transfer_id);

  const totalReceita = realOnly
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + Number(t.valor), 0);
  const totalDespesa = realOnly
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + Number(t.valor), 0);
  const saldo = totalReceita - totalDespesa;

  // Despesas por categoria, ordenadas da maior para a menor (top 8).
  const despesasPorCategoria = (() => {
    const map = new Map<string, number>();
    for (const t of realOnly) {
      if (t.type !== "despesa") continue;
      const cat = t.categoria ?? "Sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + Number(t.valor));
    }
    return Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  // Saldo mensal por conta — últimos 6 meses (inclui o mês corrente).
  // Para cada conta, o saldo acumulado (receitas − despesas, incluindo
  // transferências) até o fim de cada mês.
  const [cy, cm] = currentMonthBR().split("-").map(Number);
  const monthBuckets = Array.from({ length: 6 }, (_, k) => {
    const i = 5 - k; // 5,4,3,2,1,0 → do mais antigo ao mais recente
    const d = new Date(Date.UTC(cy, cm - 1 - i, 1));
    const y = d.getUTCFullYear();
    const mIdx = d.getUTCMonth();
    const mes = `${y}-${String(mIdx + 1).padStart(2, "0")}`;
    return {
      label: `${MONTH_SHORT[mIdx]}/${String(y).slice(2)}`,
      endExclusive: nextMonthStart(mes),
    };
  });

  const contas = (accounts ?? []).map((acc) => {
    const saldos = monthBuckets.map((b) => {
      let s = 0;
      for (const t of all) {
        if (t.account_id !== acc.id) continue;
        if (t.data >= b.endExclusive) continue;
        s += t.type === "receita" ? Number(t.valor) : -Number(t.valor);
      }
      return s;
    });
    return { id: acc.id, nome: acc.nome, saldos };
  });

  const monthLabels = monthBuckets.map((b) => b.label);
  const monthTotals = monthBuckets.map((_, i) =>
    contas.reduce((s, c) => s + c.saldos[i], 0),
  );

  return (
    <>
      <PageHeader
        eyebrow="01 · Visão Geral"
        title="Painel financeiro"
        subtitle="Síntese das movimentações do período."
        actions={<HeaderActions />}
      />

      <section className="px-4 pb-10 pt-6 sm:px-8">
        <CompanyHeader
          companyName={profile?.company_name ?? null}
          cnpj={profile?.cnpj ?? null}
          mode="screen"
        />

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SummaryCard
            label="Crédito acumulado"
            value={formatBRL(totalReceita)}
            icon={TrendingUp}
            variant="green"
          />
          <SummaryCard
            label="Débito acumulado"
            value={formatBRL(totalDespesa)}
            icon={TrendingDown}
            variant="red"
          />
          <SummaryCard
            label="Saldo apurado"
            value={formatBRL(saldo)}
            icon={Wallet}
            variant={saldo >= 0 ? "green" : "red"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ChartCard eyebrow="Acumulado" title="Despesas por categoria">
              <DespesasPorCategoria data={despesasPorCategoria} />
            </ChartCard>
          </div>

          <div className="lg:col-span-3">
            <ChartCard
              eyebrow="Últimos 6 meses"
              title="Saldo mensal por conta"
            >
              {contas.length === 0 ? (
                <EmptyState>Nenhuma conta cadastrada.</EmptyState>
              ) : (
                <SaldoMensalContas
                  months={monthLabels}
                  contas={contas}
                  totals={monthTotals}
                />
              )}
            </ChartCard>
          </div>
        </div>
      </section>
    </>
  );
}
