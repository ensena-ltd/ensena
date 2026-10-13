import { Award } from "lucide-react";

import { cn } from "@/lib/utils";

// The ONE reusable recognition badge component in the app. Founding Tutor /
// Founding Student are the only recognitions that get a visual badge — Top
// Rated is deliberately a plain text status with no icon/pill (see
// tutor-recognition.ts's doc comment). `compact` renders a small pill for
// marketplace cards/search results/mobile; the full form (name + optional
// explanation) is for profile pages.
export function FoundingBadge({
  kind,
  compact = false,
  showExplanation = false,
  className,
}: {
  kind: "Tutor" | "Student";
  compact?: boolean;
  showExplanation?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <span
        title={`Founding ${kind}: one of the first 50 ${kind.toLowerCase()}s on Ensena`}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800",
          className
        )}
      >
        <Award className="size-3" aria-hidden="true" /> Founding {kind}
      </span>
    );
  }
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
        <Award className="size-4" aria-hidden="true" /> Founding {kind}
      </span>
      {showExplanation && (
        <p className="text-xs text-ensena-muted">One of the first 50 {kind.toLowerCase()}s on Ensena.</p>
      )}
    </div>
  );
}
