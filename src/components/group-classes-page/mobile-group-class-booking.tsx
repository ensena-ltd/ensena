"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  GraduationCap,
  Laptop2,
  Lock,
  Star,
  Users,
} from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import {
  cohortDateRange,
  formatCohortDate,
  groupClassPaymentOptions,
  isCohortFull,
} from "@/components/group-classes-page/group-class-booking-sidebar";
import { formatNaira } from "@/lib/format";
import type { GroupClassListing } from "@/lib/group-classes-data";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// Mobile-only, streamlined version of the group-class booking flow — same
// state and pricing/cohort logic as the desktop sidebar (all imported from
// there, not reimplemented), just presented as a sequential mobile flow
// with a sticky bottom CTA instead of a side-by-side sticky card. Always
// says "Online class" with no address — Ensena group classes are online
// only, per explicit product direction (a couple of older seed entries
// still carry a stale "In-person" mode, which this intentionally overrides
// for display).
export function MobileGroupClassBooking({
  groupClass,
  cohortIndex,
  onSelectCohort,
  matchedTutor,
  onContinue,
}: {
  groupClass: GroupClassListing;
  cohortIndex: number;
  onSelectCohort: (index: number) => void;
  matchedTutor: TutorListing | undefined;
  onContinue: () => void;
}) {
  const [learnExpanded, setLearnExpanded] = useState(true);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);

  const cohort = groupClass.cohorts[cohortIndex];
  const firstCohortFull = isCohortFull(groupClass.cohorts[0]);

  // Payment-plan choice happens on the following review/payment page, not
  // here — "Total" is just the full-booking price shown as a preview (see
  // the equivalent comment in group-class-booking-sidebar.tsx).
  const options = groupClassPaymentOptions(groupClass, cohortIndex);
  const total = (options.find((o) => o.id === "full") ?? options[0]).amount;

  return (
    <div className="pb-24 lg:hidden">
      <div className="relative aspect-[4/3] w-full">
        <Image src={groupClass.image} alt={groupClass.title} fill sizes="100vw" className="object-cover" />
      </div>

      <div className="px-4 pt-4">
        <p className="flex items-center gap-1.5 text-sm text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          <span className="text-ensena-muted">({rating.reviews} reviews)</span>
          {isTutorVerifiedByName(groupClass.tutorName) && (
            <>
              <span className="text-ensena-border">·</span>
              <span className="flex items-center gap-1 text-ensena-ink">
                <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3.5" /> Verified
              </span>
            </>
          )}
        </p>
        <h1 className="mt-1 font-heading text-xl font-semibold text-ensena-ink">{groupClass.title}</h1>
        <p className="text-sm text-ensena-muted">with {groupClass.tutorName}</p>
        <p className="mt-2 text-sm text-ensena-muted">{groupClass.description}</p>

        {/* Class schedule */}
        <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border border-ensena-border p-4">
          <h2 className="text-sm font-semibold text-ensena-ink">Class schedule</h2>
          <p className="flex items-center gap-2 text-sm text-ensena-ink">
            <Calendar className="size-4 shrink-0 text-ensena-primary" /> {cohort.days}
          </p>
          <p className="flex items-center gap-2 text-sm text-ensena-ink">
            <Clock className="size-4 shrink-0 text-ensena-primary" /> {cohort.time}
          </p>
          <p className="flex items-center gap-2 text-sm text-ensena-ink">
            <Users className="size-4 shrink-0 text-ensena-primary" /> Maximum {cohort.seatsTotal} students
          </p>
          <p className="flex items-center gap-2 text-sm text-ensena-ink">
            <GraduationCap className="size-4 shrink-0 text-ensena-primary" /> {groupClass.gradeLevel} · {groupClass.levelBadge}
          </p>
          <p className="flex items-center gap-2 text-sm text-ensena-ink">
            <Laptop2 className="size-4 shrink-0 text-ensena-primary" /> Online class
          </p>
        </div>

        {/* What you'll learn */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <button
            type="button"
            onClick={() => setLearnExpanded((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-sm font-semibold text-ensena-ink">What you&apos;ll learn</h2>
            <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", learnExpanded && "rotate-180")} />
          </button>
          {learnExpanded && (
            <ul className="mt-3 flex flex-col gap-2">
              {groupClass.learningOutcomes.map((outcome) => (
                <li key={outcome} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <Check className="size-3.5 shrink-0 text-ensena-success" strokeWidth={3} /> {outcome}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Your teacher */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <h2 className="text-sm font-semibold text-ensena-ink">Your teacher</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
              <Image src={groupClass.image} alt={groupClass.tutorName} fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold text-ensena-ink">
                {groupClass.tutorName} <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3.5" />
              </p>
              <p className="truncate text-xs text-ensena-muted">{groupClass.subject} Tutor</p>
              <p className="flex items-center gap-1 text-xs text-ensena-ink">
                <Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} · {rating.reviews} reviews
              </p>
            </div>
          </div>
          {matchedTutor && (
            <Link
              href={`/find-teachers/${matchedTutor.slug}`}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              View full profile
            </Link>
          )}
        </div>

        {/* Choose your cohort */}
        <div className="mt-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">1. Choose your cohort</h2>
          <p className="mt-1 text-xs text-ensena-muted">
            All cohorts: {cohort.days}, {cohort.time}
          </p>
          {firstCohortFull && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-rose-50 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
              <p className="text-xs font-medium text-rose-700">
                The current cohort is full. The next available one is selected below.
              </p>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2.5">
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
                    "flex items-center gap-3 rounded-xl border p-4 text-left",
                    full
                      ? "cursor-not-allowed border-ensena-border opacity-60"
                      : cohortIndex === i
                        ? "border-ensena-primary bg-ensena-primary/5"
                        : "border-ensena-border"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      !full && cohortIndex === i ? "border-ensena-primary" : "border-ensena-border"
                    )}
                  >
                    {!full && cohortIndex === i && <span className="size-2.5 rounded-full bg-ensena-primary" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ensena-ink">
                      {i === 0 ? "Current cohort" : i === 1 ? "Next cohort" : "Following cohort"}
                    </p>
                    <p className="text-xs text-ensena-muted">{cohortDateRange(c)}</p>
                  </div>
                  {full ? (
                    <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Full</span>
                  ) : (
                    <p className="shrink-0 text-xs font-medium text-ensena-success">{left} seats left</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Booking summary */}
        <div className="mt-5 rounded-2xl bg-ensena-bg-soft p-4">
          <h2 className="text-sm font-semibold text-ensena-ink">2. Booking summary</h2>
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
          </dl>
          <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
            <span className="text-sm font-semibold text-ensena-ink">Total</span>
            <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-ensena-muted">
          Starts {formatCohortDate(cohort.startDate)} · Payment held in escrow until class day
        </p>
      </div>

      {/* Sticky bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div>
          <p className="text-base font-semibold text-ensena-ink">{formatNaira(total)}</p>
          <p className="flex items-center gap-1 text-[11px] text-ensena-muted">
            <Lock className="size-3" /> Secure payment
          </p>
        </div>
        <Button onClick={onContinue} className="h-11 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
          Continue to Payment →
        </Button>
      </div>
    </div>
  );
}
