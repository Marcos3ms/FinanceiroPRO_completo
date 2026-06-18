import { type LucideIcon } from "lucide-react";

type Variant = "green" | "red" | "blue";

const variantStrip: Record<Variant, string> = {
  green: "bg-credit",
  red: "bg-debit",
  blue: "bg-accent",
};

const variantValue: Record<Variant, string> = {
  green: "text-credit",
  red: "text-debit",
  blue: "text-accent",
};

export default function SummaryCard({
  label,
  value,
  icon: _icon,
  variant,
}: {
  label: string;
  value: string;
  /** Aceito para compatibilidade — ignorado no Ledger (número é a informação). */
  icon?: LucideIcon;
  variant: Variant;
}) {
  return (
    <div className="relative overflow-hidden border border-border bg-bg-card px-5 py-4">
      <span
        aria-hidden
        className={`absolute left-0 top-4 h-5 w-[2px] ${variantStrip[variant]}`}
      />
      <div className="eyebrow">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-[0.7rem] font-medium ${variantValue[variant]} opacity-70`}>
          R$
        </span>
        <span
          className={`font-display text-[1.7rem] font-medium leading-none tracking-tight tabular-nums ${variantValue[variant]}`}
        >
          {stripBRL(value)}
        </span>
      </div>
    </div>
  );
}

function stripBRL(value: string): string {
  return value.replace(/^R\$\s?/, "").trim();
}
