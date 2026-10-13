"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, Clock, Info, Lock, PlayCircle, Star, Users, Zap } from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { PaymentMethodSelector, type PaymentMethod } from "@/components/booking/payment-method-selector";
import { GroupPaymentPlanSelector } from "@/components/booking/payment-plan-selector";
import { PaymentProtectedBanner } from "@/components/booking/payment-protected-banner";
import { StudentInfoForm, studentInfoDefaults } from "@/components/booking/student-info-form";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import {
  cohortDateRange,
  groupClassPaymentOptions,
  isCohortFull,
} from "@/components/group-classes-page/group-class-booking-sidebar";
import { useGroupClassBySlug } from "@/hooks/use-group-class-listings";
import { useTutorRating } from "@/hooks/use-reviews";
import { bookingBlockedMessage, studentBookingEligibilityByName, tutorBookingEligibilityByName } from "@/lib/account-permissions";
import { formatNaira } from "@/lib/format";
import { sendBookingEmail } from "@/lib/email-service";
import { enrollInGroupClass } from "@/lib/group-class-enrollment-store";
import { buildGroupSessionSchedule, type GroupSessionInstance } from "@/lib/group-class-schedule";
import type { GroupClassListing } from "@/lib/group-classes-data";
import { chargeSubscription, createSubscription, recordPayment } from "@/lib/payment-plans-store";
import type { PaymentOption } from "@/lib/payment-options";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { pushTutorNotification } from "@/lib/tutor-notifications-store";

// Mirrors exactly the week-1 / first-4-weeks slices the calculator's
// "week"/"month" option amounts are computed from (payment-options.ts) —
// keeps what a plan is priced for and what it actually unlocks in sync.
function sessionsCoveredByOption(allSessions: GroupSessionInstance[], option: PaymentOption): GroupSessionInstance[] {
  if (option.scope === "week") return allSessions.filter((s) => s.weekNumber === 1);
  if (option.scope === "month") return allSessions.filter((s) => s.weekNumber <= 4);
  return allSessions;
}

const whatsNextSteps = [
  { icon: Zap, title: "Instant confirmation", description: "You'll receive a confirmation email and enrollment details." },
  { icon: Users, title: "Teacher notified", description: "Your teacher will be notified ahead of the next class." },
  { icon: PlayCircle, title: "Start learning", description: "Join your class on the scheduled time using our virtual classroom." },
];

function firstAvailableCohortIndex(groupClass: GroupClassListing): number {
  const index = groupClass.cohorts.findIndex((c) => !isCohortFull(c));
  return index === -1 ? 0 : index;
}

export function GroupClassReviewClient({
  slug,
  initialGroupClass,
}: {
  slug: string;
  initialGroupClass: GroupClassListing | null;
}) {
  const liveGroupClass = useGroupClassBySlug(slug);
  const groupClass = initialGroupClass ?? liveGroupClass;

  if (!groupClass) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-ensena-muted">This class could not be found.</p>
        <Link href="/group-classes" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← Back to Group Classes
        </Link>
      </div>
    );
  }

  return <GroupClassReviewContent groupClass={groupClass} />;
}

function GroupClassReviewContent({ groupClass }: { groupClass: GroupClassListing }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);

  const cohortParam = Number(searchParams.get("cohort"));
  const cohortIndex = Number.isInteger(cohortParam) && groupClass.cohorts[cohortParam] ? cohortParam : firstAvailableCohortIndex(groupClass);
  const options = groupClassPaymentOptions(groupClass, cohortIndex);

  const cohort = groupClass.cohorts[cohortIndex];

  const [studentInfo, setStudentInfo] = useState(() => studentInfoDefaults(dashboardStudent.name));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  // Defaults to whatever plan the earlier "Class & Plan" step picked, but
  // stays changeable here too — the Payment Plan section on this page is a
  // real, live selector, not a read-only recap of an upstream choice.
  const [plan, setPlan] = useState(() => searchParams.get("plan") ?? options[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selected = options.find((o) => o.id === plan) ?? options[0];
  const total = selected.amount;
  const planLabel = selected.label;

  // The real moment of enrollment — "Pay" creates one real, capacity-checked
  // GroupClassEnrollment (see group-class-enrollment-store.ts) with a
  // genuine GRP… reference. Confirmation only ever looks it up by reference,
  // so it never double-enrolls on refresh/back-navigation.
  async function handleConfirmAndPay() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const tutorEligibility = tutorBookingEligibilityByName(groupClass.tutorName);
      if (!tutorEligibility.allowed) {
        throw new Error(bookingBlockedMessage("tutor", tutorEligibility));
      }
      const studentEligibility = studentBookingEligibilityByName(dashboardStudent.name);
      if (!studentEligibility.allowed) {
        throw new Error(bookingBlockedMessage("student", studentEligibility));
      }
      const enrollment = await enrollInGroupClass(groupClass.slug, cohort, cohortIndex, plan, dashboardStudent.name);

      // Fix the exact gap this pass exists for: enrolling used to grant every
      // session of the cohort no matter which plan was paid for. Now the
      // payment record only covers the sessions that plan actually pays for
      // — session ids are synthesized as `${enrollmentId}-session-${n}`,
      // matching how student-group-class-detail-client.tsx numbers sessions
      // from this exact same buildGroupSessionSchedule call.
      const allSessions = buildGroupSessionSchedule(cohort.days, cohort.startDate, cohort.durationWeeks, cohort.startDate);
      const coveredSessionIds = sessionsCoveredByOption(allSessions, selected).map((s) => `${enrollment.id}-session-${s.sessionNumber}`);

      if (selected.mode === "recurring") {
        const frequency = selected.scope === "week" ? "weekly" : "monthly";
        const subscription = createSubscription({
          kind: "Group",
          bookingId: enrollment.id,
          studentName: dashboardStudent.name,
          frequency,
          amountPerCharge: selected.amount,
          paymentMethodRef: `sim-${paymentMethod}`,
        });
        // The first period is charged immediately, same as a one-time
        // payment would be — auto-pay only changes what happens AFTER this
        // period, never delays the access the student is paying for right now.
        chargeSubscription(subscription.id, 0, coveredSessionIds);
      } else {
        recordPayment({
          kind: "Group",
          bookingId: enrollment.id,
          studentName: dashboardStudent.name,
          scope: selected.scope,
          coversSessionIds: coveredSessionIds,
          amount: total,
          mode: "oneTime",
        });
      }

      // Same gap as the private-booking flow: enrolling itself never told
      // anyone — the tutor had no way to know a new student joined until
      // they happened to check the class roster.
      pushTutorNotification({
        category: "Booking",
        text: `${dashboardStudent.name} enrolled in ${groupClass.title}, starting ${cohort.startDate} at ${cohort.time}.`,
        bookingId: enrollment.id,
        actionUrl: `/tutor-dashboard/group-classes/${groupClass.slug}`,
      });
      sendBookingEmail({
        to: dashboardStudent.email,
        template: "booking_confirmed",
        bookingId: enrollment.id,
        vars: {
          recipientName: dashboardStudent.name,
          otherPartyName: groupClass.tutorName,
          subject: groupClass.title,
          date: cohort.startDate,
          time: cohort.time,
          bookingReference: enrollment.bookingReference,
          bookingUrl: `/student-dashboard/group-classes/${enrollment.id}`,
        },
      });

      const params = new URLSearchParams({ cohort: String(cohortIndex), plan, ref: enrollment.bookingReference });
      router.push(`/group-classes/${groupClass.slug}/confirmation?${params.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href={`/group-classes/${groupClass.slug}`}
          className="hidden items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline lg:flex"
        >
          <ChevronLeft className="size-4" /> Back
        </Link>

        <h1 className="mt-5 font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">Review your enrollment</h1>
        <p className="mt-1 text-sm text-ensena-muted">Please confirm your enrollment details and complete your payment.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-5 pb-28 lg:pb-0">
            {/* Class summary card */}
            <div className="rounded-2xl border border-ensena-border p-5">
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image src={groupClass.image} alt={groupClass.title} fill sizes="64px" className="object-cover" />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-ensena-ink">{groupClass.title}</p>
                  <p className="flex items-center gap-1 text-sm text-ensena-muted">
                    with {groupClass.tutorName} <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3.5" />
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-ensena-ink">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ensena-border pt-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{cohortDateRange(cohort)}</p>
                  <p className="text-xs text-ensena-muted">Cohort</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                    <Calendar className="size-4 text-ensena-primary" /> {cohort.days}
                  </p>
                  <p className="text-xs text-ensena-muted">Days</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                    <Clock className="size-4 text-ensena-primary" /> {cohort.time}
                  </p>
                  <p className="text-xs text-ensena-muted">Time</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{planLabel}</p>
                  <p className="text-xs text-ensena-muted">Plan</p>
                </div>
              </div>
            </div>

            {/* Your enrollment */}
            <div className="rounded-2xl border border-ensena-border p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Your enrollment</h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ensena-ink">{planLabel}</span>
                <span className="font-medium text-ensena-ink">{formatNaira(total)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-ensena-muted">
                  Platform / service fee <Info className="size-3.5" />
                </span>
                <span className="text-ensena-muted">₦0</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total today</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <GroupPaymentPlanSelector options={options} selectedId={plan} onChange={setPlan} />

            <StudentInfoForm values={studentInfo} onChange={setStudentInfo} />
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            <PaymentProtectedBanner />

            {submitError && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{submitError}</p>
            )}

            <div className="hidden items-center justify-between gap-4 lg:flex">
              <p className="flex items-center gap-1.5 text-xs text-ensena-muted">
                <Lock className="size-3.5" /> By continuing, you agree to Ensena&apos;s{" "}
                <a href="/terms" target="_blank" className="text-ensena-primary hover:underline">Terms of Service</a> and{" "}
                <a href="/refund-policy" target="_blank" className="text-ensena-primary hover:underline">Cancellation Policy</a>.
              </p>
              <Button
                onClick={handleConfirmAndPay}
                loading={submitting}
                className="h-12 shrink-0 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-60"
              >
                {!submitting && <Lock className="size-4" />} {submitting ? "Processing…" : `Pay ${formatNaira(total)}`}
              </Button>
            </div>
          </div>

          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
            <div className="rounded-2xl border border-ensena-border p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
                <Link href={`/group-classes/${groupClass.slug}`} className="text-xs font-semibold text-ensena-primary hover:underline">
                  Edit
                </Link>
              </div>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Class</dt><dd className="font-medium text-ensena-ink">{groupClass.title}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Teacher</dt><dd className="font-medium text-ensena-ink">{groupClass.tutorName}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Schedule</dt><dd className="font-medium text-ensena-ink">{cohort.days}, {cohort.time}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Cohort</dt><dd className="font-medium text-ensena-ink">{cohortDateRange(cohort)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-ensena-muted">Payment Plan</dt>
                  <dd className="font-medium text-ensena-ink">
                    {selected.mode === "recurring" ? `${planLabel} · Recurring ${selected.scope === "week" ? "weekly" : "monthly"}` : planLabel}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total today</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <WhatHappensNext title="What happens next?" steps={whatsNextSteps} />
            <NeedHelpCard role="Student" context="group-class" />
          </aside>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        {submitError && (
          <p className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-medium text-rose-700">{submitError}</p>
        )}
        <Button
          onClick={handleConfirmAndPay}
          loading={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-60"
        >
          {!submitting && <Lock className="size-4" />} {submitting ? "Processing…" : `Pay ${formatNaira(total)}`}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-ensena-muted">
          By continuing, you agree to Ensena&apos;s{" "}
          <a href="/terms" target="_blank" className="text-ensena-primary hover:underline">Terms of Service</a> and{" "}
          <a href="/refund-policy" target="_blank" className="text-ensena-primary hover:underline">Cancellation Policy</a>.
        </p>
      </div>
    </>
  );
}
