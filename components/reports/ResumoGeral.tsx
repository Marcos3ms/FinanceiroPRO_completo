import { formatBRL } from "@/features/common/types";

export type ResumoDespesa = { categoria: string; total: number };

export type ResumoConta = {
  accountId: string;
  accountName: string;
  saldoAnterior: number;
  receita: number;
  despesas: ResumoDespesa[];
  despesaTotal: number;
};

const ROW = "grid grid-cols-[2.2rem_1fr_auto] items-baseline gap-2";

function ContaBlock({
  acc,
  highlight = false,
}: {
  acc: ResumoConta;
  highlight?: boolean;
}) {
  const saldo = acc.saldoAnterior + acc.receita - acc.despesaTotal;
  return (
    <article
      className={`bg-bg-card print:break-inside-avoid ${
        highlight ? "border-2 border-accent-border" : "border border-border"
      }`}
    >
      {/* Cabeçalho: nome da conta | TOTAL */}
      <div
        className={`flex items-baseline justify-between gap-3 border-b px-3 py-2 ${
          highlight
            ? "border-accent-border bg-accent-bg"
            : "border-border bg-bg-elevated"
        }`}
      >
        <span
          className={`text-[0.8rem] font-semibold uppercase tracking-wider ${
            highlight ? "text-accent" : "text-fg-primary"
          }`}
        >
          {acc.accountName}
        </span>
        <span
          className={`text-[0.65rem] font-semibold uppercase tracking-wider ${
            highlight ? "text-accent" : "text-fg-muted"
          }`}
        >
          Total
        </span>
      </div>

      <div className="px-3 py-2 text-[0.85rem]">
        {/* Saldo anterior (acumulado do período anterior) */}
        <div className={`${ROW} border-b border-border py-1.5`}>
          <span />
          <span className="font-semibold uppercase tracking-wide text-fg-secondary">
            Saldo anterior
          </span>
          <span className="num-mono font-semibold text-fg-primary tabular-nums">
            {formatBRL(acc.saldoAnterior)}
          </span>
        </div>

        {/* 1 RECEITA */}
        <div className={`${ROW} border-b border-border py-1.5`}>
          <span className="text-fg-muted">1</span>
          <span className="font-semibold uppercase tracking-wide text-fg-secondary">
            Receita
          </span>
          <span className="num-mono font-semibold text-credit tabular-nums">
            {formatBRL(acc.receita)}
          </span>
        </div>

        {/* 2 DESPESAS */}
        <div className={`${ROW} py-1.5`}>
          <span className="text-fg-muted">2</span>
          <span className="font-semibold uppercase tracking-wide text-fg-secondary">
            Despesas
          </span>
          <span />
        </div>

        {acc.despesas.length === 0 ? (
          <div className="py-1 pl-[2.2rem] text-[0.8rem] italic text-fg-muted">
            —
          </div>
        ) : (
          acc.despesas.map((d, i) => (
            <div key={d.categoria} className={`${ROW} border-b border-border py-1`}>
              <span className="num-mono pl-2 text-[0.75rem] text-fg-muted tabular-nums">
                2.{i + 1}
              </span>
              <span className="text-fg-primary">{d.categoria}</span>
              <span className="num-mono text-debit tabular-nums">
                {formatBRL(d.total)}
              </span>
            </div>
          ))
        )}

        {/* Total das despesas */}
        <div className={`${ROW} mt-1 border-t border-border py-1.5`}>
          <span />
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-fg-muted">
            Total despesas
          </span>
          <span className="num-mono font-bold text-debit tabular-nums">
            {formatBRL(acc.despesaTotal)}
          </span>
        </div>

        {/* Saldo final (Saldo anterior + Receita − Despesas) */}
        <div className={`${ROW} py-1.5`}>
          <span />
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-fg-muted">
            Saldo final
          </span>
          <span
            className={`num-mono font-bold tabular-nums ${
              saldo >= 0 ? "text-credit" : "text-debit"
            }`}
          >
            {formatBRL(saldo)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function ResumoGeral({
  accounts,
  total = null,
}: {
  accounts: ResumoConta[];
  /** Bloco consolidado de todas as contas (opcional). */
  total?: ResumoConta | null;
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-bg-card px-6 py-10 text-center italic text-fg-muted">
        Nenhuma conta encontrada para o período selecionado.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-b border-border pb-2 text-[0.85rem] font-semibold uppercase tracking-wider text-fg-secondary">
        Relatório Geral — Resumo Integral
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {accounts.map((acc) => (
          <ContaBlock key={acc.accountId} acc={acc} />
        ))}
        {total && <ContaBlock acc={total} highlight />}
      </div>
    </div>
  );
}
