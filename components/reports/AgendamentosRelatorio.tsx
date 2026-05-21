import { formatBRL } from "@/features/common/types";

type ScheduleRow = {
  id: string;
  descricao: string;
  valor: number;
  frequencia: string;
  vencimento: string;
  categoria: string | null;
  accountName: string;
  status: "pago" | "atrasado" | "vence_hoje" | "pendente";
};

const COLUMNS = [
  "Status",
  "Conta",
  "Descrição",
  "Categoria",
  "Frequência",
  "Vencimento",
  "Valor",
];

const FREQ_LABEL: Record<string, string> = {
  mensal: "Mensal",
  semanal: "Semanal",
  anual: "Anual",
};

const STATUS_LABEL: Record<string, string> = {
  pago: "Pago",
  atrasado: "Atrasado",
  vence_hoje: "Vence hoje",
  pendente: "Pendente",
};

const STATUS_CLASS: Record<string, string> = {
  pago: "bg-brand-green-bg text-brand-green",
  atrasado: "bg-brand-red-bg text-brand-red",
  vence_hoje: "bg-yellow-500/15 text-yellow-500",
  pendente: "bg-brand-blue-bg text-brand-blue",
};

export default function AgendamentosRelatorio({
  rows,
  monthLabel,
}: {
  rows: ScheduleRow[];
  monthLabel: string;
}) {
  const totalValor = rows.reduce((s, r) => s + r.valor, 0);
  const totalPago = rows
    .filter((r) => r.status === "pago")
    .reduce((s, r) => s + r.valor, 0);
  const totalPendente = rows
    .filter((r) => r.status !== "pago")
    .reduce((s, r) => s + r.valor, 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-card print:overflow-visible">
      <div className="px-6 pb-4 pt-6">
        <h2 className="mb-1 text-[1.1rem] font-semibold text-fg-primary">
          Relatório de Agendamentos — {monthLabel}
        </h2>
        <p className="text-[0.85rem] text-fg-secondary">
          Despesas agendadas e seus respectivos status de pagamento.
        </p>
      </div>

      {/* Resumo cards */}
      <div className="mx-6 mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-elevated p-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
            Total Agendado
          </div>
          <div className="mt-1 text-lg font-bold text-fg-primary">
            {formatBRL(totalValor)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated p-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
            Total Pago
          </div>
          <div className="mt-1 text-lg font-bold text-brand-green">
            {formatBRL(totalPago)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg-elevated p-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
            Total Pendente
          </div>
          <div className="mt-1 text-lg font-bold text-brand-red">
            {formatBRL(totalPendente)}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c}
                className={`border-b border-border bg-bg-elevated px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted ${
                  c === "Valor" ? "text-right" : "text-left"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {rows.length === 0 ? (
          <tbody>
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-10 text-center italic text-fg-muted"
              >
                Nenhum agendamento encontrado para {monthLabel}.
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-border px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[r.status] ?? ""}`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {r.accountName}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.9rem] text-fg-primary">
                  {r.descricao}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {r.categoria ?? "—"}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {FREQ_LABEL[r.frequencia] ?? r.frequencia}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {new Date(r.vencimento).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </td>
                <td className="border-b border-border px-4 py-3 text-right text-[0.9rem] font-semibold text-fg-primary">
                  {formatBRL(r.valor)}
                </td>
              </tr>
            ))}
            <tr className="bg-bg-elevated">
              <td
                colSpan={6}
                className="px-4 py-3 text-right text-[0.8rem] font-semibold uppercase tracking-wider text-fg-muted"
              >
                Total
              </td>
              <td className="px-4 py-3 text-right text-[0.95rem] font-bold text-fg-primary">
                {formatBRL(totalValor)}
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
