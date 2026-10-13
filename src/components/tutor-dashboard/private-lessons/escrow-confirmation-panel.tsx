"use client";

import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { formatNaira } from "@/lib/format";
import { formatCountdown } from "@/lib/escrow-release";
import { splitEarnings } from "@/lib/commission";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

export function TutorEscrowConfirmationPanel() {
  const { lessons, nowMs, simulateElapsed } = useLessonConfirmations();

  const myLessons = lessons.filter((l) => l.tutor === dashboardTutor.name && l.type === "Private");
  if (myLessons.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
        <ShieldCheck className="size-4.5 text-ensena-primary" /> Lesson Confirmations
      </h2>
      <p className="text-xs text-ensena-muted">Payments release automatically after 24 hours if your student doesn&apos;t report an issue.</p>

      <ul className="mt-3 flex flex-col gap-2.5">
        {myLessons.map((l) => {
          const msRemaining = l.autoReleaseAt - nowMs;
          const split = splitEarnings(l.amountGross);
          return (
            <li key={l.id} className="rounded-xl border border-ensena-border p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{l.subject}</p>
                  <p className="text-xs text-ensena-muted">{l.student}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    l.escrowStatus === "Held" ? "bg-amber-100 text-amber-700" : l.escrowStatus === "Released" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {l.escrowStatus === "Held" ? "Waiting for Student Confirmation" : l.escrowStatus === "Released" ? "Released" : "Under Review"}
                </span>
              </div>

              {l.confirmationStatus === "Pending" && (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
                    <Clock className="size-3.5" /> {formatCountdown(msRemaining)} remaining
                  </p>
                  <button
                    type="button"
                    onClick={() => simulateElapsed(l.id)}
                    className="mt-2 text-[11px] font-medium text-ensena-muted underline decoration-dotted"
                  >
                    ⚙ Demo: simulate 24h elapsed (auto-release)
                  </button>
                </>
              )}

              {l.confirmationStatus === "Disputed" && (
                <p className="mt-2 text-xs text-rose-600">Student reported an issue. Escrow frozen pending admin review.</p>
              )}

              {l.escrowStatus === "Released" && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-success">
                  <CheckCircle2 className="size-3.5" /> Payment Released: {formatNaira(split.net)}{" "}
                  <span className="text-ensena-muted">(released {l.releasedAt ? "automatically" : ""} after confirmation)</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
