import Image from "next/image";

import { birthdayPatternMarks } from "@/lib/birthday-data";

export function BirthdayPatternBackground({ className }: { className?: string }) {
  return (
    <div className={className ?? "pointer-events-none absolute inset-0 overflow-hidden"} aria-hidden="true">
      {birthdayPatternMarks.map((mark, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${mark.xPct}%`,
            top: `${mark.yPct}%`,
            width: `${mark.sizePct}%`,
            aspectRatio: "1 / 1",
            opacity: mark.opacity,
          }}
        >
          <Image src="/brand/icon.svg" alt="" fill sizes="200px" />
        </div>
      ))}
    </div>
  );
}
