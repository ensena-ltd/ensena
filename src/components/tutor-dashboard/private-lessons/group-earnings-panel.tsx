"use client";

import { CheckCircle2, Lock, Users } from "lucide-react";

import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatNaira } from "@/lib/format";
import { escrowNet, groupSessionSummaries } from "@/lib/escrow-release";
import { buildBookingReference } from "@/lib/booking-reference";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

// The Group-class counterpart to TutorEscrowConfirmationPanel — one row per
// SESSION (not per student), each showing exactly how much of that session's
// total has already cleared vs. is still held for a disputed student, so the
// tutor can see why a session shows ₦18,000 available and ₦2,000 disputed
// instead of the full ₦20,000, without needing to open every student's record.
export function TutorGroupEarningsPanel() {
  const { lessons } = useLessonConfirmations();
  const sessions = groupSessionSummaries(lessons, { tutor: dashboardTutor.name });
  if (sessions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <Users className="size-4.5 text-ensena-primary" /> Group Class Earnings
      </h2>
      <p className="text-xs text-ensena-muted">Each student&apos;s allocated share clears independently, so one dispute never holds up the rest of the class.</p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {sessions.map((s) => {
          const netTotal = escrowNet(s.totalGross);
          const allClear = s.disputedCount === 0 && s.heldGross === 0;
          return (
            <li key={s.sessionId} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{s.subject}</p>
                  <p className="text-xs text-ensena-muted">
                    {s.presentCount}/{s.totalStudents} students attended
                    {s.tutorAbsent && " · Tutor Absent"}
                    {s.sessionDurationIssue && " · Session Duration Issue"}
                  </p>
                  <p className="font-mono text-[11px] text-ensena-muted">{s.records[0]?.sessionReferenceCode ?? buildBookingReference("session", s.sessionId)}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    s.tutorAbsent ? "bg-rose-100 text-rose-700" : allClear ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}
                >
                  {s.tutorAbsent ? "Under Review" : allClear ? "Fully Cleared" : "Awaiting Confirmation Window"}
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-ensena-bg-soft p-2">
                  <p className="text-ensena-muted">Potential Earnings</p>
                  <p className="font-semibold text-ensena-ink">{formatNaira(netTotal)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="size-3" /> Available</p>
                  <p className="font-semibold text-emerald-700">{formatNaira(s.releasedNet)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="flex items-center gap-1 text-amber-700"><Lock className="size-3" /> Held / Disputed</p>
                  <p className="font-semibold text-amber-700">{formatNaira(s.heldGross)}</p>
                </div>
              </div>
              {s.disputedCount > 0 && !s.tutorAbsent && (
                <p className="mt-2 text-xs text-ensena-muted">{s.disputedCount} student{s.disputedCount === 1 ? "" : "s"} reported a problem; only their allocated share is held.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
