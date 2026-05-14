import { type ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 px-8 pb-5 pt-7 print:hidden">
      <div>
        <h1 className="mb-1 text-[1.75rem] font-bold leading-tight text-fg-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[0.9rem] text-fg-secondary">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      )}
    </header>
  );
}
