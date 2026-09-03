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
import ConsolidadoPorConta, {
  type AccountConsolidado,
  type ConsolidadoRow,
} from "@/components/reports/ConsolidadoPorConta";
import ResumoGeral, {
  type ResumoConta,
} from "@/components/reports/ResumoGeral";
import PrintButton from "@/components/reports/PrintButton";
import PeriodoFilter from "@/components/reports/PeriodoFilter";
import { saldoAnteriorByAccount } from "@/features/reports/saldoAnterior";
import { createClient } from "@/lib/supabase/server";
import { getCategoryNames } from "@/features/categories/queries";
import {
  filterCategoryOptions,
  SALDO_ANTERIOR_CATEGORY,
} from "@/lib/categories";
import {
  formatBRL,
  todayBR,
  currentMonthBR,
  isValidMonth,
  isValidDate,
  nextMonthStart,
  nextDay,
  prevDay,
} from "@/features/common/types";

export const metadata = { title: "Relatórios - FinanceiroPro" };

type SP = {
  tipo?:
    | "receitas"
    | "despesas"
    | "comparativo"
    | "extrato"
    | "agendamentos"
    | "consolidado"
    | "resumo";
  account_id?: string;
  categoria?: string;
  mes?: string;
  periodo?: "mes" | "personalizado";
  inicio?: string;
  fim?: string;
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

type ScheduleReportRow = {
  id: string;
  descricao: string;
  valor: number;
  frequencia: string;
  vencimento: string;
  categoria: string | null;
  accountName: string;
  status: ScheduleStatus;
  paymentMethod: string | null;
  paymentDetails: string | null;
};

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
  const categoria = searchParams.categoria ?? "";
  const mes = isValidMonth(searchParams.mes ?? "")
    ? searchParams.mes!
    : currentMonthBR();

  const categoryOptions = filterCategoryOptions(
    await getCategoryNames(supabase, user.id),
  );

  const isExtrato = tipo === "extrato";
  const isAgendamentos = tipo === "agendamentos";
  const isConsolidado = tipo === "consolidado";
  const isResumo = tipo === "resumo";

  // Período: "mes" (padrão) usa o mês inteiro; "personalizado" usa um intervalo
  // de datas dentro/através de meses, definido por `inicio` e `fim` (inclusivos).
  const inicio = searchParams.inicio ?? "";
  const fim = searchParams.fim ?? "";
  const isCustomPeriod =
    searchParams.periodo === "personalizado" &&
    isValidDate(inicio) &&
    isValidDate(fim) &&
    inicio <= fim;

  // `rangeStart` é inclusivo, `rangeEnd` é exclusivo (compatível com `.lt()`).
  const rangeStart = isCustomPeriod ? inicio : `${mes}-01`;
  const rangeEnd = isCustomPeriod ? nextDay(fim) : nextMonthStart(mes);

  // Competência exibida no cabeçalho impresso de todos os relatórios.
  const competenciaLabel = (() => {
    if (isCustomPeriod) {
      const [yA, mA, dA] = inicio.split("-");
      const [yB, mB, dB] = fim.split("-");
      return `${dA}/${mA}/${yA} a ${dB}/${mB}/${yB}`;
    }
    const [year, monthIdx] = mes.split("-").map(Number);
    return `${MONTH_NAMES_FULL[monthIdx - 1]} de ${year}`;
  })();

  const [
    { data: profile },
    { data: accounts },
    { data: filteredRows },
    { data: last6Rows },
    { data: priorRows },
  ] = await Promise.all([
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
        // Extrato e Consolidado precisam das duas pernas das transferências;
        // demais relatórios ignoram esses lançamentos.
        if (!isExtrato && !isConsolidado) q = q.is("transfer_id", null);
        if (tipo === "receitas") q = q.eq("type", "receita");
        else if (tipo === "despesas") q = q.eq("type", "despesa");
        if (accountId) q = q.eq("account_id", accountId);
        if (categoria) q = q.eq("categoria", categoria);
        q = q.gte("data", rangeStart).lt("data", rangeEnd);
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
      (() => {
        // Extrato e Consolidado abrem com o saldo anterior calculado
        // automaticamente a partir de TODAS as movimentações antes do período.
        if (!isExtrato && !isConsolidado) {
          return Promise.resolve({ data: [], error: null });
        }
        // Extrato filtrado por categoria específica não é um saldo real.
        if (categoria && categoria !== SALDO_ANTERIOR_CATEGORY) {
          return Promise.resolve({ data: [], error: null });
        }
        // Busca todo o histórico antes do início do período (inclui as duas
        // pernas das transferências, pois afetam o saldo por conta).
        let q = supabase
          .from("transactions")
          .select("type, valor, data, categoria, account_id")
          .eq("user_id", user.id)
          .lt("data", rangeStart)
          .order("data", { ascending: true })
          .order("created_at", { ascending: true });
        if (accountId) q = q.eq("account_id", accountId);
        return q;
      })(),
    ]);

  // ─── Buscar agendamentos quando tipo = "agendamentos" ───
  let scheduleRows: ScheduleReportRow[] = [];
  let scheduleMonthLabel = "";

  if (isAgendamentos) {
    if (isCustomPeriod) {
      const [yA, mA, dA] = inicio.split("-");
      const [yB, mB, dB] = fim.split("-");
      scheduleMonthLabel = `${dA}/${mA}/${yA} a ${dB}/${mB}/${yB}`;
    } else {
      const [year, monthIdx] = mes.split("-").map(Number);
      scheduleMonthLabel = `${MONTH_NAMES_FULL[monthIdx - 1]} de ${year}`;
    }

    let schedulesQuery = supabase
      .from("schedules")
      .select(
        "id, descricao, valor, frequencia, vencimento, categoria, paid_at, account_id, payment_method, payment_details, accounts(nome)",
      )
      .eq("user_id", user.id)
      .gte("vencimento", rangeStart)
      .lt("vencimento", rangeEnd);
    if (categoria) schedulesQuery = schedulesQuery.eq("categoria", categoria);
    const { data: schedulesData } = await schedulesQuery.order(
      "vencimento",
      { ascending: true },
    );

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
        paymentMethod: s.payment_method ?? null,
        paymentDetails: s.payment_details ?? null,
      };
    });
  }

  const rows = filteredRows ?? [];

  // Saldo anterior automático, por conta. Para cada conta: parte do último
  // "Saldo anterior" lançado (checkpoint) antes do período e soma todas as
  // movimentações reais (receitas − despesas, incluindo transferências) até o
  // início do período. Se não houver checkpoint, acumula desde o começo.
  const saldoAnteriorMap =
    isExtrato || isConsolidado
      ? saldoAnteriorByAccount(
          (priorRows ?? []).map((r) => ({
            type: r.type,
            valor: r.valor,
            data: r.data,
            categoria: r.categoria,
            account_id: r.account_id,
          })),
        )
      : new Map<string, number>();

  const accountNameById = new Map(
    (accounts ?? []).map((a) => [a.id, a.nome]),
  );

  // Movimentações do período (exclui os "Saldo anterior" lançados no próprio
  // período — esses abrem o extrato do período seguinte).
  const periodRows = rows.filter(
    (r) => !(r.type === "receita" && r.categoria === SALDO_ANTERIOR_CATEGORY),
  );

  // Data exibida no saldo anterior: último dia antes do período (para o modo
  // mensal, o último dia do mês anterior).
  const saldoAnteriorDate = prevDay(rangeStart);

  // Extrato: uma única linha sintética de abertura com o saldo anterior
  // combinado das contas do escopo (conta filtrada ou soma de todas).
  const extratoRows = (() => {
    if (!isExtrato) return [] as typeof rows;
    const hasPrior = (priorRows ?? []).length > 0;
    if (!hasPrior) return periodRows;
    const openingValue = accountId
      ? (saldoAnteriorMap.get(accountId) ?? 0)
      : Array.from(saldoAnteriorMap.values()).reduce((s, v) => s + v, 0);
    const opening = {
      id: "__saldo_anterior__",
      type: "receita" as const,
      descricao: "Saldo anterior",
      valor: openingValue,
      data: saldoAnteriorDate,
      categoria: SALDO_ANTERIOR_CATEGORY,
      transfer_id: null,
      account_id: accountId || null,
      payment_method: null,
      payment_details: null,
      accounts: accountId
        ? { nome: accountNameById.get(accountId) ?? "—" }
        : null,
    };
    return [opening, ...periodRows];
  })();

  // Consolidado: agrupa por conta e injeta o saldo anterior no topo de cada uma.
  const consolidadoAccounts: AccountConsolidado[] = (() => {
    if (!isConsolidado) return [];
    const byAccount = new Map<
      string,
      { accountName: string; rows: ConsolidadoRow[] }
    >();

    const ensure = (key: string, fallbackName: string) => {
      const existing = byAccount.get(key);
      if (existing) return existing;
      const created = {
        accountName: accountNameById.get(key) ?? fallbackName,
        rows: [] as ConsolidadoRow[],
      };
      byAccount.set(key, created);
      return created;
    };

    for (const r of periodRows) {
      const accountName = Array.isArray(r.accounts)
        ? (r.accounts[0]?.nome ?? "—")
        : ((r.accounts as { nome: string } | null)?.nome ?? "—");
      const key = r.account_id ?? "sem-conta";
      ensure(key, accountName).rows.push({
        id: r.id,
        type: r.type,
        descricao: r.descricao,
        valor: Number(r.valor),
        data: r.data,
        categoria: r.categoria,
        transferId: r.transfer_id ?? null,
      });
    }

    // Injeta o saldo anterior no topo das contas que têm histórico anterior.
    for (const [key, value] of saldoAnteriorMap) {
      const entry = ensure(key, "—");
      entry.rows.unshift({
        id: `__saldo_anterior__${key}`,
        type: "receita",
        descricao: "Saldo anterior",
        valor: value,
        data: saldoAnteriorDate,
        categoria: SALDO_ANTERIOR_CATEGORY,
        transferId: null,
      });
    }

    return Array.from(byAccount.entries())
      .map(([accountId, { accountName, rows: accRows }]) => ({
        accountId,
        accountName,
        rows: accRows,
      }))
      .sort((a, b) => a.accountName.localeCompare(b.accountName, "pt-BR"));
  })();

  // Resumo Geral: um bloco por conta com Receita total e Despesas por categoria
  // (cada categoria com seu total), semeando todas as contas do escopo.
  const resumoAccounts: ResumoConta[] = (() => {
    if (!isResumo) return [];
    const byAccount = new Map<
      string,
      { accountName: string; receita: number; despesas: Map<string, number> }
    >();
    const ensure = (key: string, fallbackName: string) => {
      const existing = byAccount.get(key);
      if (existing) return existing;
      const created = {
        accountName: accountNameById.get(key) ?? fallbackName,
        receita: 0,
        despesas: new Map<string, number>(),
      };
      byAccount.set(key, created);
      return created;
    };

    // Semeia todas as contas do escopo (aparecem mesmo sem movimentação).
    for (const a of accounts ?? []) {
      if (accountId && a.id !== accountId) continue;
      ensure(a.id, a.nome);
    }

    for (const r of periodRows) {
      const accountName = Array.isArray(r.accounts)
        ? (r.accounts[0]?.nome ?? "—")
        : ((r.accounts as { nome: string } | null)?.nome ?? "—");
      const key = r.account_id ?? "sem-conta";
      const entry = ensure(key, accountName);
      if (r.type === "receita") {
        entry.receita += Number(r.valor);
      } else {
        const cat = r.categoria ?? "Sem categoria";
        entry.despesas.set(cat, (entry.despesas.get(cat) ?? 0) + Number(r.valor));
      }
    }

    return Array.from(byAccount.entries())
      .map(([id, v]) => {
        const despesas = Array.from(v.despesas.entries())
          .map(([categoria, total]) => ({ categoria, total }))
          .sort((a, b) => b.total - a.total);
        const despesaTotal = despesas.reduce((s, d) => s + d.total, 0);
        return {
          accountId: id,
          accountName: v.accountName,
          receita: v.receita,
          despesas,
          despesaTotal,
        };
      })
      .sort((a, b) => a.accountName.localeCompare(b.accountName, "pt-BR"));
  })();

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
  if (categoria) exportParams.set("categoria", categoria);
  if (isCustomPeriod) {
    exportParams.set("periodo", "personalizado");
    exportParams.set("inicio", inicio);
    exportParams.set("fim", fim);
  } else {
    exportParams.set("mes", mes);
  }

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
        <div className="mb-6 hidden items-baseline justify-between gap-4 border-b border-border pb-4 print:flex">
          <p className="text-[0.85rem] font-semibold uppercase tracking-wider text-brand-blue">
            {selectedAccount && (
              <>
                Conta: {selectedAccount.nome}
                {selectedAccount.banco && ` · Banco: ${selectedAccount.banco}`}
                {selectedAccount.agencia &&
                  ` · Agência: ${selectedAccount.agencia}`}
                {selectedAccount.conta && ` · Conta: ${selectedAccount.conta}`}
              </>
            )}
          </p>
          <p className="shrink-0 text-[0.85rem] font-semibold uppercase tracking-wider text-brand-blue">
            Competência: {competenciaLabel}
          </p>
        </div>

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
                <option value="consolidado">Consolidado por conta</option>
                <option value="resumo">Resumo Geral</option>
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
            <FilterGroup label="Categoria">
              <select
                name="categoria"
                className="form-select"
                defaultValue={categoria}
              >
                <option value="">Todas</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterGroup>
            <PeriodoFilter
              defaultMode={isCustomPeriod ? "personalizado" : "mes"}
              defaultMes={mes}
              defaultInicio={inicio}
              defaultFim={fim}
            />
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
                Exportar OFX
              </a>
            )}
          </div>
        </form>

        {isAgendamentos ? (
          <AgendamentosRelatorio
            rows={scheduleRows}
            monthLabel={scheduleMonthLabel}
          />
        ) : isConsolidado ? (
          <ConsolidadoPorConta
            accounts={consolidadoAccounts}
            showSetor={!selectedAccount}
          />
        ) : isResumo ? (
          <ResumoGeral accounts={resumoAccounts} />
        ) : isExtrato ? (
          <Extrato
            rows={extratoRows.map((r) => ({
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
