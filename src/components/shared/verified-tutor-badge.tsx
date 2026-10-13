import { BadgeCheck } from "lucide-react";

import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

// The ONE tutor-verification badge in the app — same icon, color, and
// a11y label everywhere a tutor's verification is shown (landing listings,
// search/booking cards, tutor profile, student-facing views, admin detail
// pages). `AdminTutor.verification === "Verified"` (via
// isTutorVerifiedByName) is the single real source of truth; nothing here
// ever infers verification from a role or renders unconditionally.
//
// Most call sites only have the tutor's name in scope, so `tutorName` does
// its own lookup; admin screens that already hold a real `AdminTutor` (and
// so already know its `verification` field) can skip the by-name lookup
// and pass `verified` directly instead.
export function VerifiedTutorBadge({
  tutorName,
  verified,
  className,
}: {
  tutorName?: string;
  verified?: boolean;
  className?: string;
}) {
  const isVerified = verified ?? (tutorName ? isTutorVerifiedByName(tutorName) : false);
  if (!isVerified) return null;

  return (
    <BadgeCheck
      className={cn("size-4 shrink-0 text-ensena-primary", className)}
      aria-label="Verified tutor"
    />
  );
}
