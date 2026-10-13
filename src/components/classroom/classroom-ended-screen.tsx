import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ClassroomRole } from "@/lib/classroom-data";

export function ClassroomEndedScreen({
  role,
  leaveHref,
  reason = "completed",
  message,
}: {
  role: ClassroomRole;
  leaveHref: string;
  /** "violation" is a real, forced end (see terminateForViolation in classroom-shell.tsx) — distinct tone from a normal, successful class-end. */
  reason?: "completed" | "violation";
  /** Only used for reason="violation" — the generic, non-detection-revealing copy terminateForViolation already built. */
  message?: string;
}) {
  const isViolation = reason === "violation";
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span
        className={`flex size-14 items-center justify-center rounded-full ${isViolation ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
      >
        {isViolation ? <ShieldAlert className="size-7" /> : <CheckCircle2 className="size-7" />}
      </span>
      <div>
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">
          {isViolation ? "This session has ended" : "Your lesson has ended"}
        </h1>
        <p className="mt-1 max-w-sm text-sm text-ensena-muted">
          {isViolation ? message : "Thanks for a great session."}
        </p>
      </div>
      <Button
        nativeButton={false}
        render={<Link href={leaveHref} />}
        className="h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white"
      >
        {role === "student" ? "Back to My Classes" : "Back to Dashboard"}
      </Button>
    </div>
  );
}
