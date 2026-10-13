import { ShieldCheck, XCircle } from "lucide-react";

import type { TutorTrustStatus } from "@/lib/tutor-recognition";
import { cn } from "@/lib/utils";

const items: { key: "identityVerified" | "backgroundChecked" | "profileComplete" | "reliable"; trueLabel: string; falseLabel: string }[] = [
  { key: "identityVerified", trueLabel: "Verified identity", falseLabel: "Identity not verified" },
  { key: "backgroundChecked", trueLabel: "Background checked", falseLabel: "Background check incomplete" },
  { key: "profileComplete", trueLabel: "100% profile completed", falseLabel: "Profile incomplete" },
  { key: "reliable", trueLabel: "On-time & reliable", falseLabel: "Reliability requirements not met" },
];

// The Tutor Profile's "Trust & Reliability" list, shared between desktop
// (tutor-profile-client.tsx) and mobile (mobile-tutor-profile.tsx) so the
// two can never drift — each line reflects `trust`'s real, independently
// computed status (see getTutorTrustStatus) instead of four hardcoded
// checkmarks that used to show for every tutor regardless of actual status.
export function TrustReliabilityList({ trust, className }: { trust: TutorTrustStatus; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.map(({ key, trueLabel, falseLabel }) => {
        const ok = trust[key];
        return (
          <span key={key} className={cn("flex items-center gap-1.5", ok ? "text-ensena-ink" : "text-ensena-muted")}>
            {ok ? (
              <ShieldCheck className="size-3.5 shrink-0 text-ensena-success" />
            ) : (
              <XCircle className="size-3.5 shrink-0 text-rose-500" />
            )}
            {ok ? trueLabel : falseLabel}
          </span>
        );
      })}
    </div>
  );
}
