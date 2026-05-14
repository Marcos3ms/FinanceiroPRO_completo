import { type ReactNode } from "react";

export function DataTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr>
        {columns.map((c) => (
          <th
            key={c}
            className="border-b border-border bg-bg-elevated px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-fg-muted"
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tbody>
      <tr>
        <td
          colSpan={colSpan}
          className="px-5 py-10 text-center italic text-fg-muted"
        >
          {text}
        </td>
      </tr>
    </tbody>
  );
}
