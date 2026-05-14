import { formatBRL } from "@/features/common/types";

export default function ReceitasVsDespesas({
  data,
}: {
  data: { label: string; receita: number; despesa: number }[];
}) {
  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.receita, d.despesa]),
  );

  return (
    <div className="relative h-[200px] pl-[60px]">
      <div className="absolute bottom-[24px] left-0 top-0 flex w-14 flex-col justify-between text-right text-[0.7rem] text-fg-muted">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p} className="pr-2">
            {formatBRL(max * p)}
          </span>
        ))}
      </div>
      <div className="absolute bottom-[24px] left-[60px] right-0 top-0 flex flex-col justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-full border-b border-dashed border-border-accent"
          />
        ))}
      </div>
      <div className="absolute bottom-[24px] left-[60px] right-0 top-0 flex items-end justify-around gap-3 px-2">
        {data.map((d) => (
          <div
            key={d.label}
            className="flex h-full flex-1 items-end justify-center gap-1"
          >
            <div
              className="w-3 rounded-t bg-brand-green"
              title={`Receitas: ${formatBRL(d.receita)}`}
              style={{ height: `${(d.receita / max) * 100}%` }}
            />
            <div
              className="w-3 rounded-t bg-brand-red"
              title={`Despesas: ${formatBRL(d.despesa)}`}
              style={{ height: `${(d.despesa / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 left-[60px] right-0 flex justify-around px-2">
        {data.map((d) => (
          <span key={d.label} className="text-[0.7rem] text-fg-muted">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
