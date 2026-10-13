import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function OptionCard({
  icon: Icon,
  label,
  description,
  selected,
  onClick,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-sm transition-colors",
        selected
          ? "border-ensena-primary bg-ensena-primary/5"
          : "border-ensena-border hover:bg-ensena-bg-soft",
        className
      )}
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-ensena-ink">
          {Icon && <Icon className="size-4 text-ensena-primary" />}
          {label}
        </span>
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-ensena-primary bg-ensena-primary" : "border-ensena-border"
          )}
        >
          {selected && <span className="size-1.5 rounded-full bg-white" />}
        </span>
      </span>
      {description && <span className="text-xs text-ensena-muted">{description}</span>}
    </button>
  );
}

export function CheckboxRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 size-4 shrink-0 accent-ensena-primary"
      />
      <span>
        <span className="block font-medium text-ensena-ink">{label}</span>
        {description && <span className="text-xs text-ensena-muted">{description}</span>}
      </span>
    </label>
  );
}

export function ToggleChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink"
          : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
      )}
    >
      {label}
    </button>
  );
}
