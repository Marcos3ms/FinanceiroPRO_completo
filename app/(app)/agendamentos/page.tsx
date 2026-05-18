import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import { EmptyRow } from "@/components/ui/DataTable";
import ScheduleRow from "@/components/agendamentos/ScheduleRow";
import MonthFilter from "@/components/agendamentos/MonthFilter";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Agendamentos - FinanceiroPro" };

const VISIBLE_COLUMNS = [
  "Status",
  "Conta",
  "Descrição",
  "Valor",
  "Frequência",
  "Vencimento",
];
const TOTAL_COLUMNS = VISIBLE_COLUMNS.length + 1;
const HEADER_TH =
  "border-b border-border bg-bg-elevated px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-fg-muted";

const MONTH_NAMES = [
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

type Status = "pago" | "atrasado" | "vence_hoje" | "pendente";

function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function currentMonthBR(): string {
  return todayInBrazil().slice(0, 7);
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function nextMonthStart(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function computeStatus(vencimento: string, paidAt: string | null): Status {
  if (paidAt) return "pago";
  const today = todayInBrazil();
  if (vencimento < today) return "atrasado";
  if (vencimento === today) return "vence_hoje";
  return "pendente";
}

export default async function AgendamentosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const requestedMes = searchParams.mes ?? "";
  const mes = isValidMonth(requestedMes) ? requestedMes : currentMonthBR();
  const startOfMonth = `${mes}-01`;
  const startOfNextMonth = nextMonthStart(mes);
  const [year, monthIdx] = mes.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[monthIdx - 1]} de ${year}`;

  const { data: rows } = await supabase
    .from("schedules")
    .select(
      "id, descricao, valor, frequencia, vencimento, categoria, lembretes, paid_at, account_id, accounts(nome)",
    )
    .eq("user_id", user.id)
    .gte("vencimento", startOfMonth)
    .lt("vencimento", startOfNextMonth)
    .order("vencimento", { ascending: true });

  const schedules = rows ?? [];

  return (
    <>
      <PageHeader
        title="Agendamentos"
        subtitle="Visualize e gerencie suas despesas recorrentes."
        actions={<HeaderActions />}
      />

      <section className="px-8 pb-8">
        <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div>
              <h2 className="mb-1 text-[1.1rem] font-semibold text-fg-primary">
                Despesas Agendadas — {monthLabel}
              </h2>
              <p className="text-[0.85rem] text-fg-secondary">
                Clique no <strong>status</strong> para marcar como pago — a
                despesa é lançada automaticamente.
              </p>
            </div>
            <div className="no-print flex flex-col items-end gap-1">
              <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
                Mês
              </label>
              <div className="flex items-center gap-2">
                <MonthFilter value={mes} />
                <Link
                  href="/agendamentos"
                  className="text-[0.8rem] text-brand-blue hover:underline"
                >
                  Hoje
                </Link>
              </div>
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {VISIBLE_COLUMNS.map((c) => (
                  <th
                    key={c}
                    className={`${HEADER_TH} ${
                      c === "Valor" ? "text-right" : "text-left"
                    }`}
                  >
                    {c}
                  </th>
                ))}
                <th className={`${HEADER_TH} text-left print:hidden`}>
                  Ações
                </th>
              </tr>
            </thead>
            {schedules.length === 0 ? (
              <EmptyRow
                colSpan={TOTAL_COLUMNS}
                text={`Nenhuma despesa agendada para ${monthLabel}.`}
              />
            ) : (
              <tbody>
                {schedules.map((s) => {
                  const accountName = Array.isArray(s.accounts)
                    ? (s.accounts[0]?.nome ?? "—")
                    : ((s.accounts as { nome: string } | null)?.nome ?? "—");
                  const status = computeStatus(s.vencimento, s.paid_at);
                  return (
                    <ScheduleRow
                      key={s.id}
                      schedule={{
                        id: s.id,
                        descricao: s.descricao,
                        valor: Number(s.valor),
                        frequencia: s.frequencia,
                        vencimento: s.vencimento,
                        categoria: s.categoria,
                        account_id: s.account_id,
                        lembretes: s.lembretes ?? [],
                        paid_at: s.paid_at,
                      }}
                      accountName={accountName}
                      status={status}
                    />
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </section>
    </>
  );
}
