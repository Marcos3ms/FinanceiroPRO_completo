import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import CompanyHeader from "@/components/layout/CompanyHeader";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard, { EmptyState } from "@/components/ui/ChartCard";
import FluxoCaixaChart from "@/components/dashboard/FluxoCaixaChart";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/features/common/types";

export const metadata = { title: "Visão Geral - FinanceiroPro" };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, descricao, valor, data, categoria, transfer_id")
      .eq("user_id", user.id)
      .order("data", { ascending: true })
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
  const recent = all.slice(-5);

  return (
    <>
      <PageHeader
        title="Visão Geral"
        subtitle="Bem-vindo de volta ao seu controle financeiro."
        actions={<HeaderActions />}
      />

      <section className="px-8 pb-8">
        <CompanyHeader
          companyName={profile?.company_name ?? null}
          cnpj={profile?.cnpj ?? null}
          mode="screen"
        />

        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <SummaryCard
            label="Receita Total"
            value={formatBRL(totalReceita)}
            icon={TrendingUp}
            variant="green"
          />
          <SummaryCard
            label="Despesa Total"
            value={formatBRL(totalDespesa)}
            icon={TrendingDown}
            variant="red"
          />
          <SummaryCard
            label="Saldo Atual"
            value={formatBRL(saldo)}
            icon={DollarSign}
            variant="blue"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Fluxo de Caixa">
            <FluxoCaixaChart
              receita={totalReceita}
              despesa={totalDespesa}
            />
          </ChartCard>

          <ChartCard title="Transações Recentes">
            {recent.length === 0 ? (
              <EmptyState>Nenhuma transação encontrada.</EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {recent.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[0.9rem] font-medium text-fg-primary">
                        {t.descricao}
                      </div>
                      <div className="text-[0.75rem] text-fg-muted">
                        {t.categoria ?? "—"} ·{" "}
                        {new Date(t.data).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })}
                      </div>
                    </div>
                    <div
                      className={`whitespace-nowrap text-[0.9rem] font-semibold ${
                        t.type === "receita"
                          ? "text-brand-green"
                          : "text-brand-red"
                      }`}
                    >
                      {t.type === "despesa" ? "−" : "+"}
                      {formatBRL(Number(t.valor))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      </section>
    </>
  );
}
