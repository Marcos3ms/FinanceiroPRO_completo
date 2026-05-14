import { type LucideIcon } from "lucide-react";

type Variant = "green" | "red" | "blue";

const variants: Record<
  Variant,
  { bar: string; iconBg: string; iconColor: string }
> = {
  green: {
    bar: "before:bg-brand-green",
    iconBg: "bg-brand-green-bg",
    iconColor: "text-brand-green",
  },
  red: {
    bar: "before:bg-brand-red",
    iconBg: "bg-brand-red-bg",
    iconColor: "text-brand-red",
  },
  blue: {
    bar: "before:bg-brand-blue",
    iconBg: "bg-brand-blue-bg",
    iconColor: "text-brand-blue",
  },
};

export default function SummaryCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  variant: Variant;
}) {
  const v = variants[variant];
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-border bg-bg-card p-6 before:absolute before:inset-y-0 before:left-0 before:w-1 ${v.bar}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {label}
        </span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded ${v.iconBg} ${v.iconColor}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-2xl font-bold text-fg-primary">{value}</div>
    </div>
  );
}
