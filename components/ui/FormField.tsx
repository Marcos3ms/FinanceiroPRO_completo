import { type ReactNode } from "react";

export function FormGroup({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[0.85rem] font-medium text-fg-label">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}
