import { formatBRL } from "@/features/common/types";
import { TRANSFER_CATEGORY } from "@/lib/categories";

const IMPOSTO_CATEGORY = "Imposto";
const ASSESSORIA_CATEGORY = "Assessoria especializada";

export type ConsolidadoRow = {
  id: string;
  type: "receita" | "despesa";
  descricao: string;
  valor: number;
  data: string;
  categoria: string | null;
  transferId: string | null;
};

export type AccountConsolidado = {
  accountId: string;
  accountName: string;
  rows: ConsolidadoRow[];
};

function formatDateBR(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
}

function sumRows(rows: ConsolidadoRow[]): number {
  return rows.reduce((s, r) => s + r.valor, 0);
}

function bucketize(rows: ConsolidadoRow[]) {
  const receitas: ConsolidadoRow[] = [];
  const transferencias: ConsolidadoRow[] = [];
  const impostos: ConsolidadoRow[] = [];
  const despesas: ConsolidadoRow[] = [];
  const assessoria: ConsolidadoRow[] = [];

  for (const r of rows) {
    if (r.type === "receita") {
      receitas.push(r);
    } else if (r.categoria === TRANSFER_CATEGORY) {
      transferencias.push(r);
    } else if (r.categoria === IMPOSTO_CATEGORY) {
      impostos.push(r);
    } else if (r.categoria === ASSESSORIA_CATEGORY) {
      assessoria.push(r);
    } else {
      despesas.push(r);
    }
  }

  return { receitas, transferencias, impostos, despesas, assessoria };
}

type Tone = "receita" | "transferencia" | "imposto" | "despesa" | "assessoria";

const TONE_HEADER: Record<Tone, string> = {
  receita: "bg-credit-bg text-credit border-credit-border",
  transferencia: "bg-accent-bg text-accent border-accent-border",
  imposto: "bg-info-bg text-info border-info-border",
  despesa: "bg-debit-bg text-debit border-debit-border",
  assessoria: "bg-debit-bg text-debit border-debit-border",
};

function BucketTable({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ConsolidadoRow[];
  tone: Tone;
}) {
  return (
    <div className="border border-border">
      <div
        className={`border-b px-3 py-2 text-center text-[0.75rem] font-semibold uppercase tracking-wider ${TONE_HEADER[tone]}`}
      >
        {title}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Data
            </th>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Nome
            </th>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-right text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={3}
                className="px-2.5 py-3 text-center text-[0.75rem] italic text-fg-muted"
              >
                —
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id}>
                <td className="num-mono border-b border-border px-2.5 py-1.5 text-[0.75rem] text-fg-secondary tabular-nums">
                  {formatDateBR(r.data)}
                </td>
                <td className="border-b border-border px-2.5 py-1.5 text-[0.8rem] text-fg-primary">
                  {r.descricao}
                </td>
                <td className="num-mono border-b border-border px-2.5 py-1.5 text-right text-[0.8rem] text-fg-primary tabular-nums">
                  {formatBRL(r.valor)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Agrupa despesas por categoria, com subtotal por grupo. Ordena os grupos
 *  pelo maior total (as categorias mais pesadas aparecem primeiro). */
function groupByCategoria(
  rows: ConsolidadoRow[],
): { categoria: string; rows: ConsolidadoRow[]; subtotal: number }[] {
  const map = new Map<string, ConsolidadoRow[]>();
  for (const r of rows) {
    const key = r.categoria ?? "Sem categoria";
    const list = map.get(key) ?? [];
    list.push(r);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .map(([categoria, groupRows]) => ({
      categoria,
      rows: groupRows,
      subtotal: sumRows(groupRows),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

/** Como BucketTable, mas com as linhas agrupadas por categoria e um subtotal
 *  por grupo. Usada só na coluna Despesas do consolidado por conta. */
function GroupedBucketTable({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: ConsolidadoRow[];
  tone: Tone;
}) {
  const groups = groupByCategoria(rows);
  return (
    <div className="border border-border">
      <div
        className={`border-b px-3 py-2 text-center text-[0.75rem] font-semibold uppercase tracking-wider ${TONE_HEADER[tone]}`}
      >
        {title}
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Data
            </th>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Nome
            </th>
            <th className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-right text-[0.65rem] font-semibold uppercase tracking-wider text-fg-muted">
              Valor
            </th>
          </tr>
        </thead>
        {groups.length === 0 ? (
          <tbody>
            <tr>
              <td
                colSpan={3}
                className="px-2.5 py-3 text-center text-[0.75rem] italic text-fg-muted"
              >
                —
              </td>
            </tr>
          </tbody>
        ) : (
          groups.map((g) => (
            <tbody key={g.categoria} className="print:break-inside-avoid">
              <tr>
                <td
                  colSpan={2}
                  className="border-b border-border bg-bg-elevated px-2.5 py-1.5 text-left text-[0.72rem] font-semibold uppercase tracking-wider text-fg-secondary"
                >
                  {g.categoria}
                </td>
                <td className="num-mono border-b border-border bg-bg-elevated px-2.5 py-1.5 text-right text-[0.75rem] font-semibold text-fg-primary tabular-nums">
                  {formatBRL(g.subtotal)}
                </td>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <td className="num-mono border-b border-border px-2.5 py-1.5 text-[0.75rem] text-fg-secondary tabular-nums">
                    {formatDateBR(r.data)}
                  </td>
                  <td className="border-b border-border px-2.5 py-1.5 text-[0.8rem] text-fg-primary">
                    {r.descricao}
                  </td>
                  <td className="num-mono border-b border-border px-2.5 py-1.5 text-right text-[0.8rem] text-fg-primary tabular-nums">
                    {formatBRL(r.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          ))
        )}
      </table>
    </div>
  );
}

function SummaryPanel({
  totals,
}: {
  totals: {
    receitas: number;
    transferencias: number;
    despesas: number;
    impostos: number;
    assessoria: number;
  };
}) {
  const lines: [string, number][] = [
    ["Receitas", totals.receitas],
    ["Transferências", totals.transferencias],
    ["Despesas", totals.despesas],
    ["Impostos", totals.impostos],
    ["Assessoria especializada", totals.assessoria],
  ];
  return (
    <div className="border border-border">
      <div className="grid grid-cols-2 border-b border-border bg-bg-elevated">
        <div className="px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
          Resumo geral
        </div>
        <div className="px-3 py-2 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
          R$
        </div>
      </div>
      {lines.map(([label, value], i) => (
        <div
          key={label}
          className={`grid grid-cols-2 items-baseline ${
            i < lines.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <div className="px-3 py-2 text-[0.8rem] uppercase tracking-wider text-fg-secondary">
            {label}
          </div>
          <div className="num-mono px-3 py-2 text-right text-[0.85rem] font-medium text-fg-primary tabular-nums">
            {value > 0 ? formatBRL(value) : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function SaldoBanner({ saldo }: { saldo: number }) {
  const positive = saldo >= 0;
  return (
    <div
      className={`grid grid-cols-2 items-baseline border ${
        positive ? "border-credit-border bg-credit-bg" : "border-debit-border bg-debit-bg"
      }`}
    >
      <div
        className={`px-4 py-3 text-[0.9rem] font-semibold uppercase tracking-wider ${
          positive ? "text-credit" : "text-debit"
        }`}
      >
        Saldo
      </div>
      <div
        className={`num-mono px-4 py-3 text-right text-[1rem] font-bold tabular-nums ${
          positive ? "text-credit" : "text-debit"
        }`}
      >
        {formatBRL(saldo)}
      </div>
    </div>
  );
}

export default function ConsolidadoPorConta({
  accounts,
  showSetor = true,
}: {
  accounts: AccountConsolidado[];
  /** Oculta a barra "Setor" quando a conta já está identificada acima
   *  (ex: filtro de conta específica já mostra "Conta: X" no cabeçalho). */
  showSetor?: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {accounts.map((acc) => {
        const buckets = bucketize(acc.rows);
        const totals = {
          receitas: sumRows(buckets.receitas),
          transferencias: sumRows(buckets.transferencias),
          despesas: sumRows(buckets.despesas),
          impostos: sumRows(buckets.impostos),
          assessoria: sumRows(buckets.assessoria),
        };
        const saldo =
          totals.receitas -
          totals.transferencias -
          totals.despesas -
          totals.impostos -
          totals.assessoria;

        return (
          <article
            key={acc.accountId}
            className="border border-border bg-bg-card print:border-0"
          >
            {showSetor && (
              <div className="border-b border-border bg-bg-elevated px-5 py-3 text-[0.85rem] print:break-inside-avoid">
                <span className="eyebrow mr-3">Setor</span>
                <span className="font-medium text-fg-primary">{acc.accountName}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 p-5 pb-0 lg:grid-cols-3 print:pt-0">
              {/* Coluna 1: Receitas */}
              <div className="flex flex-col gap-4">
                <BucketTable
                  title="Receitas"
                  rows={buckets.receitas}
                  tone="receita"
                />
              </div>

              {/* Coluna 2: Transferências, Impostos, Retiradas */}
              <div className="flex flex-col gap-4">
                <BucketTable
                  title="Transferência entre contas"
                  rows={buckets.transferencias}
                  tone="transferencia"
                />
                <BucketTable
                  title="Impostos"
                  rows={buckets.impostos}
                  tone="imposto"
                />
                <BucketTable
                  title="Assessoria especializada"
                  rows={buckets.assessoria}
                  tone="assessoria"
                />
              </div>

              {/* Coluna 3: Despesas agrupadas por categoria */}
              <div className="flex flex-col gap-4">
                <GroupedBucketTable
                  title="Despesas"
                  rows={buckets.despesas}
                  tone="despesa"
                />
              </div>
            </div>

            {/* Resumo geral + Saldo: ao final do relatório, após as Despesas */}
            <div className="flex flex-col p-5 lg:items-end print:break-inside-avoid">
              <div className="flex w-full flex-col gap-4 lg:w-1/3">
                <SummaryPanel totals={totals} />
                <SaldoBanner saldo={saldo} />
              </div>
            </div>
          </article>
        );
      })}

      {accounts.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card px-6 py-10 text-center italic text-fg-muted">
          Nenhuma movimentação encontrada para o período selecionado.
        </div>
      )}
    </div>
  );
}
