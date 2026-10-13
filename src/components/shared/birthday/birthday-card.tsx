import Image from "next/image";

import { BirthdayPatternBackground } from "@/components/shared/birthday/birthday-pattern-background";
import { buildBirthdayCopy, socialFooterText, type BirthdayCardData } from "@/lib/birthday-data";

interface BirthdayCardProps extends BirthdayCardData {
  variant: "modal" | "social";
}

export function BirthdayCard({ firstName, role, variant }: BirthdayCardProps) {
  const copy = buildBirthdayCopy({ firstName, role });

  if (variant === "social") {
    // Fixed (non-viewport-relative) sizing throughout: this card renders at a
    // small constant width wherever it's used, so viewport-based breakpoints
    // would size text for the screen instead of the card and overflow it.
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-white">
        <BirthdayPatternBackground />
        <div className="relative flex h-full flex-col items-center justify-between p-5 text-center">
          <Image src="/brand/icon.svg" alt="Ensena" width={32} height={32} className="shrink-0" />

          <div className="flex flex-col items-center gap-1.5">
            <span className="text-3xl">🎉</span>
            <h2 className="font-heading text-base font-semibold text-ensena-ink">{copy.title}</h2>
            <p className="text-[11px] leading-snug text-ensena-muted">{copy.message}</p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-medium text-ensena-primary">{socialFooterText}</p>
            <div className="flex items-center gap-1">
              <Image src="/brand/icon.svg" alt="" width={12} height={12} className="shrink-0" />
              <span className="font-heading text-[10px] font-semibold text-ensena-ink">ensena</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-center">
      <BirthdayPatternBackground />
      <div className="relative">
        <span className="text-5xl">🎉</span>
        <h2 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">{copy.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ensena-muted">{copy.message}</p>
        <p className="mt-3 text-sm font-medium text-ensena-primary">From Team Ensena</p>
      </div>
    </div>
  );
}
