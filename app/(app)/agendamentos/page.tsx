import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import HeaderActions from "@/components/layout/HeaderActions";
import { EmptyRow } from "@/components/ui/DataTable";
import ScheduleRow from "@/components/agendamentos/ScheduleRow";
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

type Status = "pago" | "atrasado" | "vence_hoje" | "pendente";

function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function computeStatus(vencimento: string, paidAt: string | null): Status {
  if (paidAt) return "pago";
  const today = todayInBrazil();
  if (vencimento < today) return "atrasado";
  if (vencimento === today) return "vence_hoje";
  return "pendente";
}

export default async function AgendamentosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("schedules")
    .select(
      "id, descricao, valor, frequencia, vencimento, categoria, lembretes, paid_at, account_id, accounts(nome)",
    )
    .eq("user_id", user.id)
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
          <div className="px-6 pb-4 pt-6">
            <h2 className="mb-1 text-[1.1rem] font-semibold text-fg-primary">
              Despesas Agendadas
            </h2>
            <p className="text-[0.85rem] text-fg-secondary">
              Clique no <strong>status</strong> para marcar como pago — a
              despesa é lançada automaticamente.
            </p>
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
                text="Nenhuma despesa agendada encontrada."
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
