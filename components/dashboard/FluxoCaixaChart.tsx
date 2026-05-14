import { formatBRL } from "@/features/common/types";

export default function FluxoCaixaChart({
  receita,
  despesa,
}: {
  receita: number;
  despesa: number;
}) {
  if (receita === 0 && despesa === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-[0.9rem] italic text-fg-muted">
        Sem movimentações para exibir.
      </div>
    );
  }

  const max = Math.max(receita, despesa, 1);
  const receitaPct = receita > 0 ? Math.max((receita / max) * 100, 2) : 0;
  const despesaPct = despesa > 0 ? Math.max((despesa / max) * 100, 2) : 0;

  return (
    <div className="relative h-[260px] pl-[60px]">
      <div className="absolute bottom-[40px] left-0 top-0 flex w-14 flex-col justify-between">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span
            key={p}
            className="pr-2 text-right text-[0.7rem] text-fg-muted"
          >
            {formatBRL(max * p)}
          </span>
        ))}
      </div>

      <div className="absolute bottom-[40px] left-[60px] right-0 top-0 flex flex-col justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-full border-b border-dashed border-border-accent"
          />
        ))}
      </div>

      <div className="absolute bottom-[40px] left-[60px] right-0 top-0 flex items-end justify-around gap-6 px-6">
        <div
          className="relative w-full max-w-[80px] rounded-t bg-brand-green transition-all"
          style={{ height: `${receitaPct}%` }}
          title={formatBRL(receita)}
        >
          {receita > 0 && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.72rem] font-semibold text-brand-green">
              {formatBRL(receita)}
            </span>
          )}
        </div>

        <div
          className="relative w-full max-w-[80px] rounded-t bg-brand-red transition-all"
          style={{ height: `${despesaPct}%` }}
          title={formatBRL(despesa)}
        >
          {despesa > 0 && (
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.72rem] font-semibold text-brand-red">
              {formatBRL(despesa)}
            </span>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-[60px] right-0 flex justify-around">
        <span className="text-[0.8rem] text-fg-muted">Receitas</span>
        <span className="text-[0.8rem] text-fg-muted">Despesas</span>
      </div>
    </div>
  );
}
