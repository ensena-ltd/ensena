"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Clock, Info, Lock, PlayCircle, ShieldCheck, Star, Users, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { PaymentMethodSelector, type PaymentMethod } from "@/components/booking/payment-method-selector";
import { PrivatePaymentPlanSelector, type PrivatePaymentPlan } from "@/components/booking/payment-plan-selector";
import { PaymentProtectedBanner } from "@/components/booking/payment-protected-banner";
import { StudentInfoForm, studentInfoDefaults, type StudentInfoValues } from "@/components/booking/student-info-form";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import { frequencyLabels, type FrequencyKey } from "@/components/find-teachers/tutor-booking-sidebar";
import { useTutorRating } from "@/hooks/use-reviews";
import { bookingBlockedMessage, studentBookingEligibilityByName, tutorBookingEligibilityByName } from "@/lib/account-permissions";
import { formatNaira } from "@/lib/format";
import { formatDaysFull } from "@/lib/group-classes-data";
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { sendBookingEmail } from "@/lib/email-service";
import { buildPrivateLessonSchedule, numberSchedule } from "@/lib/private-booking-schedule";
import { addPrivateLesson, getPrivateLessons } from "@/lib/private-lessons-store";
import { chargeSubscription, createSubscription, recordPayment } from "@/lib/payment-plans-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { pushTutorNotification } from "@/lib/tutor-notifications-store";
import {
  formatLessonDateLabel,
  formatMinutesToClockTime,
  getAvailableSlots,
  parseTimeToMinutes,
} from "@/lib/tutor-availability";
import { computeTutorBookingPricing } from "@/lib/tutor-booking-pricing";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import { getPendingAction, clearPendingAction } from "@/lib/pending-action-store";
import { requireAuthOrSaveDraft } from "@/lib/require-auth";
import type { TutorListing } from "@/lib/tutors";
import type { PrivateLesson } from "@/lib/tutor-dashboard-data";

interface TutorBookingDraft {
  studentInfo: StudentInfoValues;
  paymentMethod: PaymentMethod;
  paymentPlan: PrivatePaymentPlan;
}

const whatsNextSteps = [
  { icon: Zap, title: "Instant confirmation", description: "You'll receive a confirmation email and booking details." },
  { icon: Users, title: "Tutor notified", description: "The tutor will be notified and prepare for your first session." },
  { icon: PlayCircle, title: "Start learning", description: "Join your session on the scheduled time using our virtual classroom." },
];

export function TutorReviewClient({ tutor }: { tutor: TutorListing }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  // Resuming after a require-auth.ts redirect to sign-in/sign-up — the
  // booking's schedule/duration/frequency already round-trips through the
  // URL itself (see redirectUrl below), so only the two fields that live in
  // local state need restoring.
  const resumeId = searchParams.get("resume");
  const [resumedDraft] = useState<TutorBookingDraft | null>(() => {
    if (!resumeId) return null;
    const draft = getPendingAction<TutorBookingDraft>(resumeId);
    // Consumed once, right here — a draft only ever needs to survive a
    // single sign-in round trip.
    clearPendingAction(resumeId);
    return draft && draft.kind === "tutor-booking" ? draft.data : null;
  });

  const durationMinutes = Number(searchParams.get("duration")) || 30;
  const frequency = (searchParams.get("frequency") as FrequencyKey) || "oneTime";
  const selectedDays = (searchParams.get("days") ?? "").split(",").filter(Boolean);
  const preferredTime = searchParams.get("time") ?? "";
  const startDateParam = searchParams.get("startDate");
  const startDate = startDateParam ? new Date(`${startDateParam}T00:00:00`) : null;

  const { pricePerSession, sessionsForFrequency, total } = computeTutorBookingPricing(
    tutor,
    durationMinutes,
    frequency,
    selectedDays
  );

  const [studentInfo, setStudentInfo] = useState(() => resumedDraft?.studentInfo ?? studentInfoDefaults(dashboardStudent.name));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => resumedDraft?.paymentMethod ?? "card");
  // A one-time (single-lesson) booking has nothing to recur, so it's always
  // "oneTime" regardless of what's stored — the selector itself doesn't even
  // render a choice in that case (see PrivatePaymentPlanSelector).
  const [paymentPlan, setPaymentPlan] = useState<PrivatePaymentPlan>(() => resumedDraft?.paymentPlan ?? "oneTime");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The exact schedule the student is shown here, before paying — computed
  // by the same buildPrivateLessonSchedule engine handleConfirmAndPay below
  // calls again at the moment of payment, so a preview can never disagree
  // with what actually gets booked (that second call re-derives live
  // availability rather than blindly reusing this array, which is what
  // catches a genuine race — see handleConfirmAndPay).
  const previewStartMinutes = preferredTime ? parseTimeToMinutes(preferredTime.split("–")[0].trim()) : null;
  const previewSchedule =
    startDate && previewStartMinutes !== null
      ? numberSchedule(
          buildPrivateLessonSchedule({
            tutor,
            startDate,
            frequency,
            selectedDays,
            sessionsForFrequency,
            startMinutes: previewStartMinutes,
            endMinutes: previewStartMinutes + durationMinutes,
          }),
          startDate
        )
      : [];
  const scheduleByWeek = new Map<number, typeof previewSchedule>();
  for (const occ of previewSchedule) {
    scheduleByWeek.set(occ.weekNumber, [...(scheduleByWeek.get(occ.weekNumber) ?? []), occ]);
  }

  // The actual moment of booking creation — "Pay" is the real user action
  // that creates one real PrivateLesson per session, each tagged with a
  // genuine PRV… reference via addPrivateLesson. Confirmation only ever
  // looks these up by reference — it never creates anything itself, so a
  // refresh/back-navigation there can't double-book.
  async function handleConfirmAndPay() {
    if (!preferredTime) return;
    const startMinutes = parseTimeToMinutes(preferredTime.split("–")[0].trim());
    if (startMinutes === null) {
      setSubmitError("Something went wrong with the selected time. Please go back and pick a time again.");
      return;
    }
    if (!startDate) {
      setSubmitError("Something went wrong with the selected date. Please go back and pick a start date again.");
      return;
    }

    // A guest can configure the whole booking freely — the account is only
    // required at the actual point of payment, right here. The schedule
    // itself is already in the URL (redirectUrl below), so only the two
    // fields that live in local state need saving.
    const draft: TutorBookingDraft = { studentInfo, paymentMethod, paymentPlan };
    const gate = requireAuthOrSaveDraft("tutor-booking", draft, `${pathname}?${searchParams.toString()}`);
    if (!gate.proceed) {
      router.push(gate.redirectUrl);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Enforced here, at the real moment of booking creation — not just a
      // greyed-out button somewhere upstream. Checked fresh against the
      // account-status store's live effective status, not a value cached
      // from when this page first loaded.
      const tutorEligibility = tutorBookingEligibilityByName(tutor.name);
      if (!tutorEligibility.allowed) {
        setSubmitError(bookingBlockedMessage("tutor", tutorEligibility));
        setSubmitting(false);
        return;
      }
      const studentEligibility = studentBookingEligibilityByName(dashboardStudent.name);
      if (!studentEligibility.allowed) {
        setSubmitError(bookingBlockedMessage("student", studentEligibility));
        setSubmitting(false);
        return;
      }

      // Re-derived fresh here, right at the moment of payment, against the
      // real current state of every other booking for this tutor — not the
      // snapshot the page showed when it first loaded. The explicit Start
      // Date is a specific promise to the student, so it alone gets a hard
      // availability re-check; every other occurrence is naturally found
      // fresh against live bookings by buildPrivateLessonSchedule itself
      // (via findNextBookableOccurrence), so a slot someone else just took
      // is skipped rather than blindly booked.
      const stillAvailable = getAvailableSlots(tutor, startDate, durationMinutes).some(
        (slot) => slot.state === "available" && slot.startMinutes === startMinutes
      );
      if (!stillAvailable) {
        setSubmitError("This time is no longer available. Please select another time.");
        setSubmitting(false);
        return;
      }

      const schedule = numberSchedule(
        buildPrivateLessonSchedule({
          tutor,
          startDate,
          frequency,
          selectedDays,
          sessionsForFrequency,
          startMinutes,
          endMinutes: startMinutes + durationMinutes,
        }),
        startDate
      );

      if (schedule.length === 0) {
        throw new Error("No available slots could be booked for your selection. Please go back and choose a different day or time.");
      }

      // A multi-session programme shares one bookingId across every lesson
      // it creates — a standalone one-time booking gets none, so it keeps
      // behaving exactly like a single, ungrouped lesson everywhere else in
      // the app (View Class, review unlock, etc).
      const bookingId =
        schedule.length > 1
          ? await generateUniqueReferenceCode("private", (candidate) => getPrivateLessons().some((l) => l.bookingId === candidate))
          : undefined;

      const created: PrivateLesson[] = [];
      for (const occ of schedule) {
        created.push(
          await addPrivateLesson({
            tutorSlug: tutor.slug,
            student: dashboardStudent.name,
            subject: tutor.subject,
            date: formatLessonDateLabel(occ.date),
            time: formatMinutesToClockTime(startMinutes),
            duration: `${durationMinutes} mins`,
            status: "Upcoming",
            mode: "Online",
            price: formatNaira(pricePerSession),
            frequency,
            ...(bookingId
              ? { bookingId, sessionNumber: occ.sessionNumber, totalSessions: occ.totalSessions, weekNumber: occ.weekNumber }
              : {}),
          })
        );
      }

      // The whole finite programme (1 session for one-time, or every real
      // occurrence buildPrivateLessonSchedule generated for weekly/monthly)
      // is created in this one action today either way — recurring only
      // changes how FUTURE equivalent bookings would be billed, never what
      // access this payment grants right now, so both branches cover every
      // session just created.
      const coveredSessionIds = created.map((lesson) => lesson.id);
      if (paymentPlan === "recurring" && frequency !== "oneTime") {
        const subscription = createSubscription({
          kind: "Private",
          bookingId: bookingId ?? created[0].id,
          studentName: dashboardStudent.name,
          frequency: frequency === "weekly" ? "weekly" : "monthly",
          amountPerCharge: total,
          paymentMethodRef: `sim-${paymentMethod}`,
        });
        // The first period is charged immediately, same as a one-time
        // payment would be — auto-pay only changes what happens AFTER this
        // period, never delays the access being paid for right now.
        chargeSubscription(subscription.id, 0, coveredSessionIds);
      } else {
        recordPayment({
          kind: "Private",
          bookingId: bookingId ?? created[0].id,
          studentName: dashboardStudent.name,
          scope: "full",
          coversSessionIds: coveredSessionIds,
          amount: total,
          mode: "oneTime",
        });
      }

      const refs = created.map((lesson) => lesson.bookingReference).join(",");

      // The booking itself never notified anyone before this — the student
      // only ever learned it worked from the confirmation page they were
      // already looking at, and the tutor had no way to know a new lesson
      // landed on their calendar until they happened to check it.
      pushTutorNotification({
        category: "Booking",
        text: `${dashboardStudent.name} booked ${created.length > 1 ? `${created.length} ${tutor.subject} sessions` : `a ${tutor.subject} session`} with you, starting ${created[0].date} at ${created[0].time}.`,
        bookingId: bookingId ?? created[0].id,
        actionUrl: `/tutor-dashboard/private-lessons/${created[0].id}`,
      });
      sendBookingEmail({
        to: dashboardStudent.email,
        template: "booking_confirmed",
        bookingId: bookingId ?? created[0].id,
        vars: {
          recipientName: dashboardStudent.name,
          otherPartyName: tutor.name,
          subject: tutor.subject,
          date: created[0].date,
          time: created[0].time,
          bookingReference: refs,
          bookingUrl: `/student-dashboard/lessons/class/${created[0].id}`,
        },
      });

      const params = new URLSearchParams({
        duration: String(durationMinutes),
        frequency,
        days: selectedDays.join(","),
        time: preferredTime,
        ref: refs,
      });
      router.push(`/find-teachers/${tutor.slug}/book/confirmation?${params.toString()}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Link
          href={`/find-teachers/${tutor.slug}/book`}
          className="hidden items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline lg:flex"
        >
          <ChevronLeft className="size-4" /> Back
        </Link>

        <h1 className="mt-5 font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">Review your booking</h1>
        <p className="mt-1 text-sm text-ensena-muted">Please confirm your booking details and complete your payment.</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-5 pb-28 lg:pb-0">
            {/* Booking summary card */}
            <div className="rounded-2xl border border-ensena-border p-5">
              <div className="flex items-center gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                  <Image src={tutor.image} alt={tutor.name} fill sizes="64px" className="object-cover" />
                </div>
                <div>
                  <p className="font-heading text-base font-semibold text-ensena-ink">
                    {tutor.subject} with {tutor.name}
                  </p>
                  {isTutorVerifiedByName(tutor.name) && (
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-ensena-success">
                      <ShieldCheck className="size-3.5" /> Verified Teacher
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-ensena-ink">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ensena-border pt-4 sm:grid-cols-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                    <Clock className="size-4 text-ensena-primary" /> {durationMinutes} minutes
                  </p>
                  <p className="text-xs text-ensena-muted">Duration</p>
                </div>
                {selectedDays.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{formatDaysFull(selectedDays.join(","))}</p>
                    <p className="text-xs text-ensena-muted">Days</p>
                  </div>
                )}
                {preferredTime && (
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                      <Clock className="size-4 text-ensena-primary" /> {preferredTime}
                    </p>
                    <p className="text-xs text-ensena-muted">Time</p>
                  </div>
                )}
              </div>
            </div>

            {/* Your booking */}
            <div className="rounded-2xl border border-ensena-border p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Your booking</h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ensena-ink">
                  {sessionsForFrequency} × {durationMinutes}-minute session{sessionsForFrequency === 1 ? "" : "s"}
                </span>
                <span className="font-medium text-ensena-ink">{formatNaira(pricePerSession * sessionsForFrequency)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-ensena-muted">
                  Platform / service fee <Info className="size-3.5" />
                </span>
                <span className="text-ensena-muted">₦0</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total amount</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            {/* Your Schedule — exactly what will be booked, generated from real
                tutor availability (never hardcoded), so the student can verify
                every date before paying. */}
            {previewSchedule.length > 0 && (
              <div className="rounded-2xl border border-ensena-border p-5">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Schedule</h2>
                {previewSchedule.length === 1 ? (
                  <p className="mt-2 text-sm text-ensena-ink">
                    Starting{" "}
                    <span className="font-medium">
                      {previewSchedule[0].date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </span>{" "}
                    at {preferredTime}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-4">
                    {[...scheduleByWeek.entries()].map(([week, sessions]) => (
                      <div key={week}>
                        <p className="text-xs font-semibold text-ensena-primary">Week {week}</p>
                        <ul className="mt-1.5 flex flex-col gap-1">
                          {sessions.map((occ) => (
                            <li key={occ.sessionNumber} className="flex items-center justify-between text-sm">
                              <span className="text-ensena-ink">
                                {occ.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {preferredTime.split("–")[0].trim()}
                              </span>
                              <span className="text-xs text-ensena-muted">Session {occ.sessionNumber} of {occ.totalSessions}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <StudentInfoForm values={studentInfo} onChange={setStudentInfo} />
            <PrivatePaymentPlanSelector frequency={frequency} value={paymentPlan} onChange={setPaymentPlan} />
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

          {/* Desktop right column */}
          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
            <div className="rounded-2xl border border-ensena-border p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
                <Link href={`/find-teachers/${tutor.slug}/book`} className="text-xs font-semibold text-ensena-primary hover:underline">
                  Edit
                </Link>
              </div>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Tutor</dt><dd className="font-medium text-ensena-ink">{tutor.name}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Subject</dt><dd className="font-medium text-ensena-ink">{tutor.subject}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="font-medium text-ensena-ink">{durationMinutes} minutes</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Frequency</dt><dd className="font-medium text-ensena-ink">{frequencyLabels[frequency]}</dd></div>
                {selectedDays.length > 0 && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Days</dt><dd className="font-medium text-ensena-ink">{formatDaysFull(selectedDays.join(","))}</dd></div>
                )}
                {preferredTime && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Preferred time</dt><dd className="font-medium text-ensena-ink">{preferredTime}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ensena-muted">Number of sessions</dt><dd className="font-medium text-ensena-ink">{sessionsForFrequency} sessions</dd></div>
                <div className="flex justify-between">
                  <dt className="text-ensena-muted">Payment Plan</dt>
                  <dd className="font-medium text-ensena-ink">
                    {frequency === "oneTime" || paymentPlan === "oneTime" ? "One-time payment" : `Recurring · Every ${frequency === "weekly" ? "week" : "month"}`}
                  </dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total today</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <WhatHappensNext title="What happens next?" steps={whatsNextSteps} />
            <NeedHelpCard role="Student" context="booking" />
          </aside>
        </div>
      </div>

      {/* Sticky mobile CTA */}
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
