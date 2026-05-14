import { type ReactNode } from "react";

export default function ChartCard({
  title,
  link,
  children,
}: {
  title: string;
  link?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-fg-primary">{title}</h2>
        {link}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-[0.9rem] italic text-fg-muted">
      {children}
    </div>
  );
}
