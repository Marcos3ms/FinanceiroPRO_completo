import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import { FilterGroup } from "@/components/ui/FilterBar";
import CompanyForm from "@/components/reports/CompanyForm";
import DespesasPorCategoria from "@/components/reports/DespesasPorCategoria";
import ReceitasVsDespesas from "@/components/reports/ReceitasVsDespesas";
import Extrato from "@/components/reports/Extrato";
import AgendamentosRelatorio from "@/components/reports/AgendamentosRelatorio";
import PrintButton from "@/components/reports/PrintButton";
import { createClient } from "@/lib/supabase/server";
import {
  formatBRL,
  todayBR,
  currentMonthBR,
  isValidMonth,
  nextMonthStart,
} from "@/features/common/types";

export const metadata = { title: "Relatórios - FinanceiroPro" };

type SP = {
  tipo?: "receitas" | "despesas" | "comparativo" | "extrato" | "agendamentos";
  account_id?: string;
  mes?: string;
};

const MONTH_NAMES = [
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

const MONTH_NAMES_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type ScheduleStatus = "pago" | "atrasado" | "vence_hoje" | "pendente";

function computeStatus(vencimento: string, paidAt: string | null): ScheduleStatus {
  if (paidAt) return "pago";
  const today = todayBR();
  if (vencimento < today) return "atrasado";
  if (vencimento === today) return "vence_hoje";
  return "pendente";
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tipo = searchParams.tipo ?? "extrato";
  const accountId = searchParams.account_id ?? "";
  const mes = isValidMonth(searchParams.mes ?? "")
    ? searchParams.mes!
    : currentMonthBR();

  const isExtrato = tipo === "extrato";
  const isAgendamentos = tipo === "agendamentos";

  const [{ data: profile }, { data: accounts }, { data: filteredRows }, { data: last6Rows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("company_name, cnpj")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("id, nome, banco, agencia, conta")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      (() => {
        if (isAgendamentos) {
          // Não buscar transações quando é agendamentos
          return Promise.resolve({ data: [], error: null });
        }
        let q = supabase
          .from("transactions")
          .select(
            "id, type, descricao, valor, data, categoria, transfer_id, account_id, payment_method, payment_details, accounts(nome)",
          )
          .eq("user_id", user.id)
          .order("data", { ascending: true })
          .order("created_at", { ascending: true });
        if (!isExtrato) q = q.is("transfer_id", null);
        if (tipo === "receitas") q = q.eq("type", "receita");
        else if (tipo === "despesas") q = q.eq("type", "despesa");
        if (accountId) q = q.eq("account_id", accountId);
        q = q.gte("data", `${mes}-01`).lt("data", nextMonthStart(mes));
        return q;
      })(),
      (() => {
        if (isAgendamentos) {
          return Promise.resolve({ data: [], error: null });
        }
        const since = new Date();
        since.setMonth(since.getMonth() - 5);
        since.setDate(1);
        const sinceStr = since.toISOString().slice(0, 10);
        return supabase
          .from("transactions")
          .select("type, valor, data")
          .eq("user_id", user.id)
          .is("transfer_id", null)
          .gte("data", sinceStr);
      })(),
    ]);

  // ─── Buscar agendamentos quando tipo = "agendamentos" ───
  let scheduleRows: {
    id: string;
    descricao: string;
    valor: number;
    frequencia: string;
    vencimento: string;
    categoria: string | null;
    accountName: string;
    status: ScheduleStatus;
  }[] = [];
  let scheduleMonthLabel = "";

  if (isAgendamentos) {
    const startOfMonth = `${mes}-01`;
    const startOfNextMonth = nextMonthStart(mes);
    const [year, monthIdx] = mes.split("-").map(Number);
    scheduleMonthLabel = `${MONTH_NAMES_FULL[monthIdx - 1]} de ${year}`;

    const { data: schedulesData } = await supabase
      .from("schedules")
      .select(
        "id, descricao, valor, frequencia, vencimento, categoria, paid_at, account_id, accounts(nome)",
      )
      .eq("user_id", user.id)
      .gte("vencimento", startOfMonth)
      .lt("vencimento", startOfNextMonth)
      .order("vencimento", { ascending: true });

    scheduleRows = (schedulesData ?? []).map((s) => {
      const accountName = Array.isArray(s.accounts)
        ? (s.accounts[0]?.nome ?? "—")
        : ((s.accounts as { nome: string } | null)?.nome ?? "—");
      return {
        id: s.id,
        descricao: s.descricao,
        valor: Number(s.valor),
        frequencia: s.frequencia,
        vencimento: s.vencimento,
        categoria: s.categoria,
        accountName,
        status: computeStatus(s.vencimento, s.paid_at),
      };
    });
  }

  const rows = filteredRows ?? [];

  // Despesas por categoria (a partir de filteredRows quando há despesas)
  const despesasPorCategoria = (() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.type !== "despesa") continue;
      const cat = r.categoria ?? "Sem categoria";
      map.set(cat, (map.get(cat) ?? 0) + Number(r.valor));
    }
    return Array.from(map.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  // Receitas vs Despesas — últimos 6 meses
  const monthly = (() => {
    const now = new Date();
    const buckets: { key: string; label: string; receita: number; despesa: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: MONTH_NAMES[d.getMonth()],
        receita: 0,
        despesa: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const r of last6Rows ?? []) {
      const k = r.data.slice(0, 7);
      const i = idx.get(k);
      if (i === undefined) continue;
      if (r.type === "receita") buckets[i].receita += Number(r.valor);
      else buckets[i].despesa += Number(r.valor);
    }
    return buckets;
  })();

  const totalReceita = rows
    .filter((r) => r.type === "receita")
    .reduce((s, r) => s + Number(r.valor), 0);
  const totalDespesa = rows
    .filter((r) => r.type === "despesa")
    .reduce((s, r) => s + Number(r.valor), 0);

  const exportParams = new URLSearchParams();
  exportParams.set("tipo", tipo);
  if (accountId) exportParams.set("account_id", accountId);
  exportParams.set("mes", mes);

  const selectedAccount = accountId
    ? (accounts ?? []).find((a) => a.id === accountId)
    : null;

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Visualize e exporte relatórios financeiros."
        actions={<HeaderActions />}
      />

      <section className="px-4 pb-8 sm:px-8">
        {selectedAccount && (
          <div className="mb-6 hidden border-b border-border pb-4 text-center print:block">
            <p className="text-[0.85rem] font-semibold uppercase tracking-wider text-brand-blue">
              Conta: {selectedAccount.nome}
              {selectedAccount.banco && ` · Banco: ${selectedAccount.banco}`}
              {selectedAccount.agencia &&
                ` · Agência: ${selectedAccount.agencia}`}
              {selectedAccount.conta && ` · Conta: ${selectedAccount.conta}`}
            </p>
          </div>
        )}

        <CompanyForm
          initialName={profile?.company_name ?? ""}
          initialCnpj={profile?.cnpj ?? ""}
        />

        <form
          method="get"
          className="no-print mb-6 rounded-lg border border-border bg-bg-card px-6 py-5"
        >
          <div className="mb-4 flex flex-wrap items-end gap-5">
            <FilterGroup label="Tipo de Relatório">
              <select name="tipo" className="form-select" defaultValue={tipo}>
                <option value="extrato">Extrato</option>
                <option value="comparativo">Comparativo</option>
                <option value="receitas">Receitas</option>
                <option value="despesas">Despesas</option>
                <option value="agendamentos">Agendamentos</option>
              </select>
            </FilterGroup>
            {!isAgendamentos && (
              <FilterGroup label="Conta">
                <select
                  name="account_id"
                  className="form-select"
                  defaultValue={accountId}
                >
                  <option value="">Todas</option>
                  {(accounts ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </FilterGroup>
            )}
            <FilterGroup label="Competência">
              <input
                name="mes"
                type="month"
                className="form-input"
                defaultValue={mes}
              />
            </FilterGroup>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-blue">
              Filtrar
            </button>
            <Link href="/relatorios" className="btn btn-outline">
              Limpar
            </Link>
            <PrintButton />
            {!isAgendamentos && (
              <a
                href={`/api/export?${exportParams.toString()}`}
                className="btn btn-blue"
              >
                Exportar CSV
              </a>
            )}
          </div>
        </form>

        {isAgendamentos ? (
          <AgendamentosRelatorio
            rows={scheduleRows}
            monthLabel={scheduleMonthLabel}
          />
        ) : isExtrato ? (
          <Extrato
            rows={rows.map((r) => ({
              id: r.id,
              type: r.type,
              descricao: r.descricao,
              valor: Number(r.valor),
              data: r.data,
              categoria: r.categoria,
              accountName: Array.isArray(r.accounts)
                ? (r.accounts[0]?.nome ?? "—")
                : ((r.accounts as { nome: string } | null)?.nome ?? "—"),
              paymentMethod: r.payment_method ?? null,
              paymentDetails: r.payment_details ?? null,
            }))}
          />
        ) : (
          <>
            <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
                  Receitas no período
                </div>
                <div className="mt-2 text-xl font-bold text-brand-green">
                  {formatBRL(totalReceita)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
                  Despesas no período
                </div>
                <div className="mt-2 text-xl font-bold text-brand-red">
                  {formatBRL(totalDespesa)}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-bg-card p-5">
                <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
                  Saldo do período
                </div>
                <div className="mt-2 text-xl font-bold text-brand-blue">
                  {formatBRL(totalReceita - totalDespesa)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="min-h-[300px] rounded-lg border border-border bg-bg-card p-6">
                <div className="mb-5 flex items-start justify-between">
                  <h2 className="text-base font-semibold">
                    Despesas por Categoria
                  </h2>
                </div>
                <DespesasPorCategoria data={despesasPorCategoria} />
              </div>

              <div className="min-h-[300px] rounded-lg border border-border bg-bg-card p-6">
                <div className="mb-5 flex items-start justify-between">
                  <h2 className="text-base font-semibold">
                    Receitas vs Despesas (6 Meses)
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    Período (meses):
                    <span className="rounded-sm border border-border bg-bg-elevated px-2.5 py-1 font-semibold text-fg-primary">
                      6
                    </span>
                  </div>
                </div>
                <div className="mb-3 flex justify-end gap-4">
                  <div className="flex items-center gap-1.5 text-[0.8rem]">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-red" />
                    despesas
                  </div>
                  <div className="flex items-center gap-1.5 text-[0.8rem]">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
                    receitas
                  </div>
                </div>
                <ReceitasVsDespesas data={monthly} />
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
