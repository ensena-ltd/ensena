import { AlertCircle, Calendar, Clock, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { buildGroupSessionSchedule } from "@/lib/group-class-schedule";
import { classDurationMinutes, countSessionsPerWeek, type Cohort, type GroupClassListing } from "@/lib/group-classes-data";
import { computePaymentOptions, type PaymentOption } from "@/lib/payment-options";
import { cn } from "@/lib/utils";

export function formatCohortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function cohortDateRange(cohort: Cohort): string {
  const start = new Date(cohort.startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + cohort.durationWeeks * 7);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function isCohortFull(cohort: Cohort): boolean {
  return cohort.seatsFilled >= cohort.seatsTotal;
}

// Every cohort for a class shares the same teacher-set schedule, so
// daysPerWeek only needs the currently-selected cohort's `days` string.
export function daysPerWeekFor(groupClass: GroupClassListing, cohortIndex: number): number {
  return countSessionsPerWeek(groupClass.cohorts[cohortIndex].days);
}

// The teacher only ever sets price-per-session + schedule (see
// create-group-class-modal.tsx) — Enseña, not the teacher, works out which
// payment plans make sense for the resulting cohort. Real session count
// comes from the same buildGroupSessionSchedule engine the cohort's actual
// sessions are generated from, so a plan can never promise more sessions
// than the cohort actually has.
export function groupClassSessionStats(groupClass: GroupClassListing, cohortIndex: number) {
  const cohort = groupClass.cohorts[cohortIndex];
  const sessionsPerWeek = daysPerWeekFor(groupClass, cohortIndex);
  const sessionCount = buildGroupSessionSchedule(cohort.days, cohort.startDate, cohort.durationWeeks, cohort.startDate).length;
  return { sessionCount, sessionsPerWeek, totalWeeks: cohort.durationWeeks };
}

// Installment isn't offered for group classes yet — collecting the second
// half needs a follow-up-payment reminder flow this app doesn't have, so
// it's deliberately excluded here rather than sold and left unfulfillable.
export function groupClassPaymentOptions(groupClass: GroupClassListing, cohortIndex: number): PaymentOption[] {
  const stats = groupClassSessionStats(groupClass, cohortIndex);
  return computePaymentOptions({ ...stats, pricePerSession: groupClass.pricing.perSession }).filter((o) => o.id !== "installment");
}

// Class detail + reservation card: the teacher sets the recurring schedule,
// the student only chooses which upcoming cohort to join here — how they
// want to pay for it is chosen on the following review/payment page (see
// GroupPaymentPlanSelector in payment-plan-selector.tsx), so this card never
// duplicates that choice. "Total" below is always the full-booking price
// (computePaymentOptions' "full" option, which always exists) shown purely
// as a preview — it's not a selection and doesn't affect what's charged.
export function GroupClassBookingSidebar({
  groupClass,
  cohortIndex,
  onSelectCohort,
  onContinue,
}: {
  groupClass: GroupClassListing;
  cohortIndex: number;
  onSelectCohort: (index: number) => void;
  onContinue: () => void;
}) {
  const cohort = groupClass.cohorts[cohortIndex];
  const durationMinutes = classDurationMinutes(cohort.time);
  const firstCohortFull = isCohortFull(groupClass.cohorts[0]);

  const options = groupClassPaymentOptions(groupClass, cohortIndex);
  const total = (options.find((o) => o.id === "full") ?? options[0]).amount;

  return (
    <div className="rounded-2xl border border-ensena-border p-5 shadow-sm lg:p-6">
      <h2 className="font-heading text-base font-semibold text-ensena-ink lg:text-lg">1. Choose your cohort (class schedule)</h2>
      <p className="mt-1 text-xs text-ensena-muted">
        All cohorts follow the same schedule: {cohort.days}, {cohort.time}
      </p>

      {firstCohortFull && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
          <p className="text-xs font-medium text-rose-700">
            The current cohort is full. The next available one is selected below.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {groupClass.cohorts.map((c, i) => {
          const full = isCohortFull(c);
          const left = Math.max(0, c.seatsTotal - c.seatsFilled);
          return (
            <button
              key={i}
              type="button"
              disabled={full}
              onClick={() => onSelectCohort(i)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border p-3 text-left",
                full
                  ? "cursor-not-allowed border-ensena-border opacity-60"
                  : cohortIndex === i
                    ? "border-ensena-primary bg-ensena-primary/5"
                    : "border-ensena-border hover:bg-ensena-bg-soft"
              )}
            >
              <div>
                <p className="text-sm font-semibold text-ensena-ink">
                  {i === 0 ? "Current cohort" : i === 1 ? "Next cohort" : "Following cohort"}
                </p>
                <p className="text-xs text-ensena-muted">{cohortDateRange(c)}</p>
              </div>
              {full ? (
                <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Full</span>
              ) : (
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ensena-ink">
                    {c.seatsTotal - c.seatsFilled} / {c.seatsTotal}
                  </p>
                  <p className="text-xs text-ensena-success">{left} seats left</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-ensena-primary/5 p-3.5">
        <Calendar className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
        <div className="text-xs text-ensena-ink">
          <p>Classes are held on: <span className="font-medium">{cohort.days}</span></p>
          <p className="mt-0.5 flex items-center gap-1">
            <Clock className="size-3 shrink-0" /> Time: {cohort.time}{durationMinutes > 0 && ` (${durationMinutes} minutes per class)`}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-ensena-bg-soft p-4">
        <h3 className="text-sm font-semibold text-ensena-ink">2. Booking summary</h3>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Class</dt>
            <dd className="font-medium text-ensena-ink">{groupClass.title}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Schedule</dt>
            <dd className="font-medium text-ensena-ink">{cohort.days}, {cohort.time}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Cohort</dt>
            <dd className="font-medium text-ensena-ink">{cohortDateRange(cohort)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Duration</dt>
            <dd className="font-medium text-ensena-ink">{cohort.durationWeeks} weeks</dd>
          </div>
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
          <span className="text-sm font-semibold text-ensena-ink">Total</span>
          <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
        </div>
      </div>

      <Button
        onClick={onContinue}
        className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary-hover"
      >
        Continue to Payment →
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ensena-muted">
        <Lock className="size-3.5" /> Secure payment · You won&apos;t be charged yet
      </p>
    </div>
  );
}
