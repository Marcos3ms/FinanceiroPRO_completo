import { type ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Marcador editorial — código de seção em caps, à la "01 / VISÃO GERAL". */
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5 pl-16 pr-4 pt-7 sm:pr-8 md:pl-8 print:hidden">
      <div>
        {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-[1.65rem] font-medium leading-[1.1] tracking-tight text-fg-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-[0.85rem] text-fg-secondary">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
