import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import CompanyHeader from "@/components/layout/CompanyHeader";
import SummaryCard from "@/components/ui/SummaryCard";
import ChartCard, { EmptyState } from "@/components/ui/ChartCard";
import DespesasPorCategoria from "@/components/reports/DespesasPorCategoria";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/features/common/types";

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

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

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

  // Running total — saldo da empresa após cada movimentação real (sem transferências).
  let running = 0;
  const ledger = realOnly.map((t) => {
    running += t.type === "receita" ? Number(t.valor) : -Number(t.valor);
    return { ...t, saldoApos: running };
  });

  const totalReceita = realOnly
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + Number(t.valor), 0);
  const totalDespesa = realOnly
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + Number(t.valor), 0);
  const saldo = totalReceita - totalDespesa;

  // Mais recentes no topo, livro-razão à la extrato bancário.
  const recent = ledger.slice(-6).reverse();

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
            <ChartCard
              eyebrow="Acumulado"
              title="Despesas por categoria"
            >
              <DespesasPorCategoria data={despesasPorCategoria} />
            </ChartCard>
          </div>

          <div className="lg:col-span-3">
            <ChartCard
              eyebrow="Livro-razão"
              title="Últimas movimentações"
            >
              {recent.length === 0 ? (
                <EmptyState>Nenhuma movimentação registrada ainda.</EmptyState>
              ) : (
                <RecentLedger rows={recent} />
              )}
            </ChartCard>
          </div>
        </div>
      </section>
    </>
  );
}

type LedgerRow = {
  id: string;
  type: "receita" | "despesa";
  descricao: string;
  valor: number | string;
  data: string;
  categoria: string | null;
  saldoApos: number;
};

function RecentLedger({ rows }: { rows: LedgerRow[] }) {
  return (
    <div className="-mx-1">
      {/* Cabeçalho de coluna — exibido só em md+ (no mobile o layout é empilhado). */}
      <div className="hidden md:grid md:grid-cols-[14px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border px-1 pb-2">
        <span aria-hidden />
        <span className="eyebrow">Lançamento</span>
        <span className="eyebrow text-right">Valor</span>
        <div className="ml-2 min-w-[110px] border-l border-border pl-3 text-right">
          <span className="eyebrow text-accent">Saldo após</span>
        </div>
      </div>
      <ul>
        {rows.map((t, idx) => (
          <LedgerRowItem
            key={t.id}
            row={t}
            isLast={idx === rows.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}

function LedgerRowItem({ row, isLast }: { row: LedgerRow; isLast: boolean }) {
  const isCredit = row.type === "receita";
  const valor = Number(row.valor);
  const sign = isCredit ? "+" : "−";
  const valorClass = isCredit ? "text-credit" : "text-debit";
  const saldoClass = row.saldoApos >= 0 ? "text-accent" : "text-debit";
  const meta = `${formatShortDate(row.data)}${row.categoria ? ` · ${row.categoria}` : ""}`;
  const borderClass = isLast ? "" : "border-b border-border";

  return (
    <li className={`px-1 py-3 ${borderClass}`}>
      {/* Mobile: layout empilhado em duas linhas. */}
      <div className="flex items-start gap-2 md:hidden">
        <span
          aria-hidden
          className={`mt-1 h-9 w-[2px] shrink-0 ${
            isCredit ? "bg-credit" : "bg-debit"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.88rem] font-medium text-fg-primary">
                {row.descricao}
              </div>
              <div className="num-mono mt-0.5 truncate text-[0.66rem] uppercase tracking-wider text-fg-muted">
                {meta}
              </div>
            </div>
            <div
              className={`num-mono shrink-0 whitespace-nowrap text-right text-[0.85rem] font-medium tabular-nums ${valorClass}`}
            >
              {sign}
              {formatBRL(valor)}
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-end gap-2 border-t border-border pt-2">
            <span className="eyebrow text-[0.6rem] text-accent">Saldo</span>
            <span
              className={`num-mono text-[0.88rem] tabular-nums ${saldoClass}`}
            >
              {formatBRL(row.saldoApos)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop: grid em 4 colunas com gutter de saldo dedicado. */}
      <div className="hidden md:grid md:grid-cols-[14px_minmax(0,1fr)_auto_auto] items-center gap-3">
        <span
          aria-hidden
          className={`h-7 w-[2px] ${isCredit ? "bg-credit" : "bg-debit"}`}
        />

        <div className="min-w-0">
          <div className="truncate text-[0.88rem] font-medium text-fg-primary">
            {row.descricao}
          </div>
          <div className="num-mono mt-0.5 text-[0.68rem] uppercase tracking-wider text-fg-muted">
            {meta}
          </div>
        </div>

        <div
          className={`num-mono whitespace-nowrap text-right text-[0.9rem] font-medium tabular-nums ${valorClass}`}
        >
          {sign}
          {formatBRL(valor)}
        </div>

        <div className="ml-2 min-w-[110px] border-l border-border pl-3 text-right">
          <div
            className={`num-mono text-[0.92rem] tabular-nums ${saldoClass}`}
          >
            {formatBRL(row.saldoApos)}
          </div>
        </div>
      </div>
    </li>
  );
}
