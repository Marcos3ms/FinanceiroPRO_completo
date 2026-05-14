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

  return (
    <div
      className={`${visibility} text-center mb-6 ${
        mode === "screen"
          ? "rounded-lg border border-border bg-bg-card px-6 py-5"
          : "px-6 pt-2 pb-4"
      }`}
    >
      {companyName && (
        <h2 className="text-[1.4rem] font-bold uppercase tracking-wider text-brand-blue">
          {companyName}
        </h2>
      )}
      {cnpj && (
        <p className="mt-1 text-[0.85rem] font-semibold uppercase tracking-wider text-brand-blue">
          CNPJ: {cnpj}
        </p>
      )}
    </div>
  );
}
