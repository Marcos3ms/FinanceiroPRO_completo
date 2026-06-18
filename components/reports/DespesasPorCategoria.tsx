import { BarChart3 } from "lucide-react";
import { formatBRL } from "@/features/common/types";

export default function DespesasPorCategoria({
  data,
}: {
  data: { categoria: string; total: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-fg-muted opacity-30">
        <BarChart3 className="h-12 w-12" strokeWidth={1.25} />
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  return (
    <ul className="flex flex-col">
      {data.map((d, idx) => {
        const pct = (d.total / max) * 100;
        const share = grandTotal > 0 ? (d.total / grandTotal) * 100 : 0;
        // Garante peso visual mínimo mesmo para categorias residuais.
        const barWidth = Math.max(pct, 2);
        return (
          <li
            key={d.categoria}
            className={`flex flex-col gap-2 py-3 ${
              idx < data.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-baseline justify-between gap-3 text-[0.85rem]">
              <span className="truncate text-fg-primary">{d.categoria}</span>
              <div className="flex items-baseline gap-3 shrink-0">
                <span className="num-mono text-[0.7rem] text-fg-muted tabular-nums">
                  {share.toFixed(1)}%
                </span>
                <span className="num-mono font-medium text-fg-primary tabular-nums">
                  {formatBRL(d.total)}
                </span>
              </div>
            </div>
            <div className="h-[6px] overflow-hidden bg-bg-elevated">
              <div
                className="h-full bg-debit"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
