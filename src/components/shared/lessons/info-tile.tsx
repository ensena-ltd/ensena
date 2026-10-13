import type { LucideIcon } from "lucide-react";

// One small "icon + label + value" tile, shared by the Student and Tutor
// View Class pages (and any other class-detail surface) so a schedule/
// booking fact always looks the same wherever it's shown. `break-words`
// (not `truncate`) on the value — a longer "Monday, Wednesday & Friday"
// wraps onto a second line on a narrow screen rather than getting cut off.
export function InfoTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ensena-border p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ensena-bg-soft text-ensena-primary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ensena-muted">{label}</p>
        <p className="break-words text-sm font-semibold text-ensena-ink">{value}</p>
      </div>
    </div>
  );
}
