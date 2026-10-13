"use client";

import { useId } from "react";
import { CheckCircle2, type LucideIcon, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

export function FileDropzone({
  icon: Icon = Upload,
  label,
  hint,
  accept,
  fileName,
  onFileSelected,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  hint: string;
  accept?: string;
  fileName: string | null;
  onFileSelected: (name: string | null, file?: File) => void;
  className?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ensena-border p-6 text-center transition-colors hover:border-ensena-primary/50 hover:bg-ensena-bg-soft",
        fileName && "border-ensena-success/50 bg-ensena-success/5",
        className
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          onFileSelected(file?.name ?? null, file);
        }}
      />
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          fileName ? "bg-ensena-success/15 text-ensena-success" : "bg-ensena-primary/10 text-ensena-primary"
        )}
      >
        {fileName ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
      </span>
      <span className="text-sm font-semibold text-ensena-ink">{fileName ?? label}</span>
      <span className="text-xs text-ensena-muted">{fileName ? "Click to replace" : hint}</span>
    </label>
  );
}
