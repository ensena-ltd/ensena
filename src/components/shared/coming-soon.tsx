import type { LucideIcon } from "lucide-react";

export function ComingSoon({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{title}</h1>
      <p className="mt-1 text-sm text-ensena-muted">{description}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ensena-border bg-ensena-surface py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
          <Icon className="size-6" />
        </span>
        <p className="font-medium text-ensena-ink">Coming soon</p>
        <p className="max-w-xs text-sm text-ensena-muted">This section is still being built.</p>
      </div>
    </div>
  );
}
