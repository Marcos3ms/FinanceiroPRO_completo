type Props = {
  companyName: string | null;
  cnpj: string | null;
  /** "screen" mostra apenas na tela; "print" mostra apenas na impressão. */
  mode: "screen" | "print";
};

export default function CompanyHeader({ companyName, cnpj, mode }: Props) {
  if (!companyName && !cnpj) return null;

  const visibility =
    mode === "print" ? "hidden print:block" : "block print:hidden";

  if (mode === "print") {
    return (
      <div className={`${visibility} mb-6 text-center px-6 pt-2 pb-4`}>
        {companyName && (
          <h2 className="font-display text-[1.3rem] font-semibold text-fg-primary">
            {companyName}
          </h2>
        )}
        {cnpj && (
          <p className="mt-1 text-[0.78rem] text-fg-secondary">CNPJ: {cnpj}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${visibility} mb-6 flex items-center justify-between gap-4 border-l-2 border-accent bg-bg-card px-5 py-4`}
    >
      <div className="min-w-0">
        {companyName && (
          <div className="font-display text-[1.05rem] font-medium text-fg-primary">
            {companyName}
          </div>
        )}
        {cnpj && (
          <div className="num-mono mt-0.5 text-[0.72rem] text-fg-muted">
            CNPJ {cnpj}
          </div>
        )}
      </div>
      <div className="eyebrow shrink-0 text-accent">Conta ativa</div>
    </div>
  );
}
