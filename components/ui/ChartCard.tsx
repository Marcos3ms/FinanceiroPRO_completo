import { type ReactNode } from "react";

export default function ChartCard({
  title,
  eyebrow,
  link,
  children,
}: {
  title: string;
  /** Marcador acima do título — ex: "Mês corrente". */
  eyebrow?: string;
  link?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-border bg-bg-card">
      <header className="flex items-end justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h2 className="font-display text-[1rem] font-medium tracking-tight text-fg-primary">
            {title}
          </h2>
        </div>
        {link && <div className="shrink-0">{link}</div>}
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center text-[0.85rem] text-fg-muted">
      {children}
    </div>
  );
}
