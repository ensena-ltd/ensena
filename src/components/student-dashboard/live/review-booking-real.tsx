"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Info, Lock, PlayCircle, ShieldCheck, Star, Tag, Users, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { PaymentMethodSelector, type PaymentMethod } from "@/components/booking/payment-method-selector";
import { PrivatePaymentPlanSelector, type PrivatePaymentPlan } from "@/components/booking/payment-plan-selector";
import { PaymentProtectedBanner } from "@/components/booking/payment-protected-banner";
import { StudentInfoForm, type StudentInfoValues } from "@/components/booking/student-info-form";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import { bookAndPay } from "@/lib/actions/student-booking";
import { MONTH_WEEKS, addDaysToISO, bookingPrices, sessionPrice, type BookingFrequency } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";

import { firstWeekDates, frequencyLabel } from "./book-tutor-real";
import { PersonAvatar } from "./live-shared";
import { joinDays, lagosToMs, timeRange, to12h } from "./tutor-ui";

const whatsNextSteps = [
  { icon: Zap, title: "Instant confirmation", description: "You'll receive a confirmation email and booking details." },
  { icon: Users, title: "Tutor notified", description: "The tutor will be notified and prepare for your first session." },
  { icon: PlayCircle, title: "Start learning", description: "Join your session on the scheduled time using our virtual classroom." },
];

export interface ReviewBookingSelection {
  subject: string;
  duration: number;
  frequency: BookingFrequency;
  /** Weekdays, 0 = Sunday. */
  days: number[];
  startISO: string;
  /** "HH:MM", West Africa Time. */
  time: string;
}

export function ReviewBookingReal({
  tutor,
  selection: sel,
  student,
  testMode,
}: {
  tutor: TutorPublicProfile;
  selection: ReviewBookingSelection;
  student: StudentInfoValues;
  testMode: boolean;
}) {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState(student);
  const [paymentPlan, setPaymentPlan] = useState<PrivatePaymentPlan>("oneTime");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [promo, setPromo] = useState("");
  const [promoMessage, setPromoMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // The exact lessons that will be booked: the first week's days, repeated for each week of the plan.
  const firstWeek = firstWeekDates(sel.startISO, sel.days, sel.frequency);
  const weeks = sel.frequency === "monthly" ? MONTH_WEEKS : 1;
  const schedule = Array.from({ length: weeks }, (_, w) => firstWeek.map((iso) => ({ week: w + 1, iso: addDaysToISO(iso, w * 7) }))).flat();
  const count = schedule.length;
  const perSession = tutor.pricePerHour ? sessionPrice(tutor.pricePerHour, sel.duration) : 0;
  const total = tutor.pricePerHour ? bookingPrices(tutor.pricePerHour, sel.duration, sel.frequency, count).total : 0;
  const discount = perSession * count - total;
  const dayList = sel.frequency === "oneTime" ? [new Date(`${sel.startISO}T12:00:00Z`).getUTCDay()] : sel.days;
  const editHref = `/student-dashboard/tutors/${tutor.id}/book`;
  const planLabel = sel.frequency === "oneTime" || paymentPlan === "oneTime" ? "One-time payment" : `Recurring · Every ${sel.frequency === "weekly" ? "week" : "month"}`;

  function applyPromo() {
    if (!promo.trim()) return;
    setPromoMessage("This promo code isn't valid or has expired.");
  }

  function pay() {
    setError(null);
    startSubmit(async () => {
      const result = await bookAndPay({
        tutorId: tutor.id,
        subject: sel.subject,
        durationMinutes: sel.duration,
        frequency: sel.frequency,
        weeks: 1,
        startTimes: firstWeek.map((iso) => lagosToMs(iso, sel.time)),
        paymentPlan,
      });
      if (!result.ok || !result.redirectUrl) {
        setError(result.message ?? "Something went wrong. Please try again.");
        toast.error(result.message ?? "We couldn't complete your booking.");
        return;
      }
      if (result.redirectUrl.startsWith("http")) window.location.assign(result.redirectUrl);
      else router.push(result.redirectUrl);
    });
  }

  const payButton = (
    <Button onClick={pay} loading={submitting} className="h-12 shrink-0 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-60">
      {!submitting && <Lock className="size-4" />} {submitting ? "Processing…" : `Pay ${formatNaira(total)}`}
    </Button>
  );

  return (
    <div className="pb-36 lg:pb-0">
      {/* Mobile checkout header, pinned just under the dashboard's top bar. */}
      <header className="sticky top-[61px] z-30 -mx-4 -mt-4 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-4 sm:-mx-6 sm:-mt-6 lg:hidden">
        <Link href={editHref} aria-label="Back to booking" className="flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
          <ChevronLeft className="size-6" />
        </Link>
        <Logo size={26} />
        <span className="flex items-center gap-1 text-xs font-medium text-ensena-muted">
          <ShieldCheck className="size-3.5" /> Secure checkout
        </span>
      </header>

      <Link href={editHref} className="hidden w-fit items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline lg:flex">
        <ChevronLeft className="size-4" /> Back
      </Link>

      <h1 className="mt-5 font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">Review your booking</h1>
      <p className="mt-1 text-sm text-ensena-muted">Please confirm your booking details and complete your payment.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          {/* Booking summary card */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center gap-3">
              <PersonAvatar name={tutor.name} image={tutor.image} className="size-16 rounded-xl text-xl" />
              <div>
                <p className="font-heading text-base font-semibold text-ensena-ink">
                  {sel.subject} with {tutor.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-ensena-success">
                  <ShieldCheck className="size-3.5" /> Verified Teacher
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-ensena-ink">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" /> {tutor.rating ?? "New"} ({tutor.reviewCount} reviews)
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-ensena-border pt-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                  <Clock className="size-4 text-ensena-primary" /> {sel.duration} minutes
                </p>
                <p className="text-xs text-ensena-muted">Duration</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{joinDays(dayList)}</p>
                <p className="text-xs text-ensena-muted">Days</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                  <Clock className="size-4 text-ensena-primary" /> {timeRange(sel.time, sel.duration)}
                </p>
                <p className="text-xs text-ensena-muted">Time</p>
              </div>
            </div>
          </div>

          {/* Your booking */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Your booking</h2>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ensena-ink">
                {count} × {sel.duration}-minute session{count === 1 ? "" : "s"}
              </span>
              <span className="font-medium text-ensena-ink">{formatNaira(perSession * count)}</span>
            </div>
            {discount > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm text-ensena-success">
                <span>Monthly plan discount</span>
                <span>−{formatNaira(discount)}</span>
              </div>
            )}
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

          {/* Promo code */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <Tag className="size-4" /> Promo Code
            </h2>
            <div className="mt-3 flex gap-2">
              <input
                value={promo}
                onChange={(e) => {
                  setPromo(e.target.value.toUpperCase());
                  setPromoMessage(null);
                }}
                placeholder="Enter code"
                className="h-11 min-w-0 flex-1 rounded-xl border border-ensena-border bg-ensena-surface px-3.5 text-sm outline-none focus:border-ensena-primary/50"
              />
              <Button variant="outline" onClick={applyPromo} disabled={!promo.trim()} className="h-11 rounded-full border-ensena-border px-5 text-sm font-medium">
                Apply
              </Button>
            </div>
            {promoMessage && <p className="mt-2 text-xs font-medium text-rose-600">{promoMessage}</p>}
          </div>

          {/* Your Schedule */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Schedule</h2>
            {count === 1 ? (
              <p className="mt-2 text-sm text-ensena-ink">
                <span className="font-medium">{new Date(`${schedule[0].iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}</span> at {timeRange(sel.time, sel.duration)}
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {Array.from({ length: weeks }, (_, w) => w + 1).map((week) => (
                  <div key={week}>
                    <p className="text-xs font-semibold text-ensena-primary">Week {week}</p>
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {schedule
                        .map((s, i) => ({ ...s, n: i + 1 }))
                        .filter((s) => s.week === week)
                        .map((s) => (
                          <li key={s.iso} className="flex items-center justify-between text-sm">
                            <span className="text-ensena-ink">
                              {new Date(`${s.iso}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} · {to12h(sel.time)}
                            </span>
                            <span className="text-xs text-ensena-muted">
                              Session {s.n} of {count}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <StudentInfoForm values={studentInfo} onChange={setStudentInfo} />
          <PrivatePaymentPlanSelector frequency={sel.frequency} value={paymentPlan} onChange={setPaymentPlan} />
          <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
          <PaymentProtectedBanner />

          {testMode && (
            <p className="hidden rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-800 lg:block">
              Test mode: online payments aren&apos;t switched on yet, so no money is taken. Your booking is created and confirmed as if it were paid.
            </p>
          )}
          {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

          <div className="hidden items-center justify-between gap-4 lg:flex">
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ensena-muted">
              <Lock className="size-3.5" /> By continuing, you agree to Ensena&apos;s{" "}
              <a href="/terms" target="_blank" className="text-ensena-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/refund-policy" target="_blank" className="text-ensena-primary hover:underline">
                Cancellation Policy
              </a>
              .
            </p>
            {payButton}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
              <Link href={editHref} className="text-xs font-semibold text-ensena-primary hover:underline">
                Edit
              </Link>
            </div>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              {[
                ["Tutor", tutor.name],
                ["Subject", sel.subject],
                ["Duration", `${sel.duration} minutes`],
                ["Frequency", frequencyLabel[sel.frequency]],
                ["Days", joinDays(dayList)],
                ["Preferred time", timeRange(sel.time, sel.duration)],
                ["Number of sessions", `${count} session${count === 1 ? "" : "s"}`],
                ["Payment Plan", planLabel],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ensena-muted">{label}</dt>
                  <dd className="text-right font-medium text-ensena-ink">{value}</dd>
                </div>
              ))}
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

      {/* Mobile sticky Pay bar — just above the dashboard's bottom tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <Button onClick={pay} loading={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-60">
          {!submitting && <Lock className="size-4" />} {submitting ? "Processing…" : `Pay ${formatNaira(total)}`}
        </Button>
        <p className="mt-2 text-center text-[11px] text-ensena-muted">
          By continuing, you agree to Ensena&apos;s{" "}
          <a href="/terms" target="_blank" className="text-ensena-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/refund-policy" target="_blank" className="text-ensena-primary hover:underline">
            Cancellation Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
