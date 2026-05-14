import { type ReactNode } from "react";

export default function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-5 rounded-lg border border-border bg-bg-card px-6 py-5">
      {children}
    </div>
  );
}

export function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
      <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-fg-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
