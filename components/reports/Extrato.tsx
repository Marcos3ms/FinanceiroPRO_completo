import { formatBRL } from "@/features/common/types";

type Row = {
  id: string;
  type: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  categoria: string | null;
  accountName: string;
  paymentMethod: string | null;
  paymentDetails: string | null;
};

const COLUMNS = [
  "Data",
  "Descrição",
  "Categoria",
  "Conta",
  "Pagamento",
  "Débito",
  "Crédito",
  "Saldo",
];

const PAYMENT_LABEL: Record<string, string> = {
  pix: "PIX",
  transferencia: "Transferência",
  boleto: "Boleto",
  cartao: "Cartão",
};

export default function Extrato({ rows }: { rows: Row[] }) {
  let saldo = 0;
  let totalDebito = 0;
  let totalCredito = 0;

  const enriched = rows.map((r, i) => {
    if (r.type === "receita") {
      saldo += r.valor;
      totalCredito += r.valor;
    } else {
      saldo -= r.valor;
      totalDebito += r.valor;
    }
    const isLastOfDay = i === rows.length - 1 || rows[i + 1].data !== r.data;
    return { row: r, runningSaldo: saldo, isLastOfDay };
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-card print:overflow-visible">
      <div className="px-6 pb-4 pt-6">
        <h2 className="mb-1 text-[1.1rem] font-semibold text-fg-primary">
          Extrato da Movimentação
        </h2>
        <p className="text-[0.85rem] text-fg-secondary">
          Lançamentos em ordem cronológica.
        </p>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {COLUMNS.map((c, i) => (
              <th
                key={c}
                className={`border-b border-border bg-bg-elevated px-4 py-3 text-xs font-semibold uppercase tracking-wider text-fg-muted ${
                  i >= 5 ? "text-right" : "text-left"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {enriched.length === 0 ? (
          <tbody>
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-10 text-center italic text-fg-muted"
              >
                Nenhuma movimentação no período.
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody>
            {enriched.map(({ row, runningSaldo, isLastOfDay }) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {new Date(row.data).toLocaleDateString("pt-BR", {
                    timeZone: "UTC",
                  })}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.9rem] text-fg-primary">
                  {row.descricao}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {row.categoria ?? "—"}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {row.accountName}
                </td>
                <td className="border-b border-border px-4 py-3 text-[0.85rem] text-fg-secondary">
                  {row.paymentMethod ? (
                    <>
                      <div className="text-fg-primary">
                        {PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod}
                      </div>
                      {row.paymentDetails && (
                        <div className="text-[0.72rem] text-fg-muted">
                          {row.paymentDetails}
                        </div>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="border-b border-border px-4 py-3 text-right text-[0.9rem] font-semibold text-brand-red">
                  {row.type === "despesa" ? formatBRL(row.valor) : ""}
                </td>
                <td className="border-b border-border px-4 py-3 text-right text-[0.9rem] font-semibold text-brand-green">
                  {row.type === "receita" ? formatBRL(row.valor) : ""}
                </td>
                <td
                  className={`border-b border-border px-4 py-3 text-right text-[0.9rem] font-semibold ${
                    runningSaldo < 0 ? "text-brand-red" : "text-fg-primary"
                  }`}
                >
                  {isLastOfDay ? formatBRL(runningSaldo) : ""}
                </td>
              </tr>
            ))}
            <tr className="bg-bg-elevated">
              <td
                colSpan={5}
                className="px-4 py-3 text-right text-[0.8rem] font-semibold uppercase tracking-wider text-fg-muted"
              >
                Totais
              </td>
              <td className="px-4 py-3 text-right text-[0.95rem] font-bold text-brand-red">
                {formatBRL(totalDebito)}
              </td>
              <td className="px-4 py-3 text-right text-[0.95rem] font-bold text-brand-green">
                {formatBRL(totalCredito)}
              </td>
              <td
                className={`px-4 py-3 text-right text-[0.95rem] font-bold ${
                  saldo < 0 ? "text-brand-red" : "text-brand-blue"
                }`}
              >
                {formatBRL(saldo)}
              </td>
            </tr>
          </tbody>
        )}
      </table>
    </div>
  );
}
