type Conta = { id: string; nome: string; saldos: number[] };

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toneClass(v: number): string {
  return v >= 0 ? "text-credit" : "text-debit";
}

export default function SaldoMensalContas({
  months,
  contas,
  totals,
}: {
  months: string[];
  contas: Conta[];
  totals: number[];
}) {
  if (contas.length === 0) {
    return (
      <div className="flex min-h-[180px] items-center justify-center text-[0.85rem] text-fg-muted">
        Nenhuma conta cadastrada.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="eyebrow whitespace-nowrap border-b border-border px-2 py-2 text-left">
              Conta
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="eyebrow whitespace-nowrap border-b border-border px-2 py-2 text-right"
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => (
            <tr key={c.id}>
              <td className="whitespace-nowrap border-b border-border px-2 py-2.5 text-[0.82rem] font-medium text-fg-primary">
                {c.nome}
              </td>
              {c.saldos.map((v, i) => (
                <td
                  key={i}
                  className={`num-mono whitespace-nowrap border-b border-border px-2 py-2.5 text-right text-[0.8rem] tabular-nums ${toneClass(v)}`}
                >
                  {fmt(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="whitespace-nowrap px-2 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
              Total
            </td>
            {totals.map((v, i) => (
              <td
                key={i}
                className={`num-mono whitespace-nowrap px-2 py-2.5 text-right text-[0.82rem] font-semibold tabular-nums ${toneClass(v)}`}
              >
                {fmt(v)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
      <p className="mt-3 text-[0.7rem] text-fg-muted">
        Saldo acumulado ao fim de cada mês, em R$.
      </p>
    </div>
  );
}
