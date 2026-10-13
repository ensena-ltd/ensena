import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ensena-border px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-muted">
        <Icon className="size-5" />
      </span>
      <p className="font-heading text-base font-semibold text-ensena-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ensena-muted">{description}</p>}
      {children && <div className="mt-2 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}
