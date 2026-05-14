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
        <BarChart3 className="h-16 w-16" />
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = (d.total / max) * 100;
        return (
          <li key={d.categoria} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[0.85rem]">
              <span className="text-fg-secondary">{d.categoria}</span>
              <span className="font-semibold text-fg-primary">
                {formatBRL(d.total)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full bg-brand-red"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
