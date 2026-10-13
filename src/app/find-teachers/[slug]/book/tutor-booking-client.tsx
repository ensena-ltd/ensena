"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dayOptions,
  TutorBookingSidebar,
  type DurationOption,
  type FrequencyKey,
} from "@/components/find-teachers/tutor-booking-sidebar";
import { MobileTutorBooking } from "@/components/find-teachers/mobile-tutor-booking";
import { MobileTutorBookingHeader } from "@/components/find-teachers/mobile-tutor-booking-header";
import { useTutorRating } from "@/hooks/use-reviews";
import { bookingBlockedMessage, studentBookingEligibilityByName, tutorBookingEligibilityByName } from "@/lib/account-permissions";
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { formatNaira } from "@/lib/format";
import { getLiveOfferById, respondToOffer } from "@/lib/messages-store";
import { formatOfferTime, getOfferById, savingsAmount, totalFinalPrice, totalStandardPrice } from "@/lib/offers-data";
import { buildPrivateLessonSchedule, numberSchedule } from "@/lib/private-booking-schedule";
import { addPrivateLesson, getPrivateLessons } from "@/lib/private-lessons-store";
import { recordPayment } from "@/lib/payment-plans-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import {
  formatLessonDateLabel,
  formatMinutesToClockTime,
  getAvailableSlots,
  isDayBookable,
  nextOccurrenceOfWeekday,
  parseTimeToMinutes,
  toISODate,
  WEEKDAY_ABBR,
} from "@/lib/tutor-availability";
import { computeTutorBookingPricing } from "@/lib/tutor-booking-pricing";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import type { TutorListing } from "@/lib/tutors";

const durationOptions: DurationOption[] = [
  { minutes: 30, units: 1, label: "30 min" },
  { minutes: 45, units: 1.5, label: "45 min" },
  { minutes: 60, units: 2, label: "60 min" },
];

export function TutorBookingClient({ tutor }: { tutor: TutorListing }) {
  const router = useRouter();
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offerId");
  // A live, runtime-created offer (accepted from Messages or the Offers
  // page) always wins over the frozen seed array — getOfferById only ever
  // searches the seed, so a real proposal would otherwise be invisible here.
  const offer = offerId ? (getLiveOfferById(offerId) ?? getOfferById(offerId)) : undefined;
  const showLockedOffer = !!offer && offer.bookingKind === "private-lesson";

  const [offerConfirmed, setOfferConfirmed] = useState(false);
  const [confirmingOffer, setConfirmingOffer] = useState(false);
  const [offerConfirmError, setOfferConfirmError] = useState<string | null>(null);

  // A date/time arriving via query params came from clicking "Book this
  // time" on the Calendar modal or a Next Available slot elsewhere. There's
  // no calendar on this page anymore, so that intent is translated into
  // sensible defaults: a one-time session on that weekday, preselecting the
  // closest generated time range.
  const prefillDate = searchParams.get("date");
  const prefillTime = searchParams.get("time");

  const [duration, setDuration] = useState<DurationOption>(durationOptions[0]);
  const [frequency, setFrequency] = useState<FrequencyKey>(prefillDate ? "oneTime" : "weekly");
  function computeInitialDays(): string[] {
    if (prefillDate) {
      const weekday = WEEKDAY_ABBR[new Date(`${prefillDate}T00:00:00`).getDay()];
      return [weekday];
    }
    return tutor.availability.includes("Weekdays") ? ["Tue", "Thu"] : ["Sat"];
  }
  const [selectedDays, setSelectedDays] = useState<string[]>(computeInitialDays);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(() => computeInitialDays().length);
  const [preferredTime, setPreferredTime] = useState<string>("");

  // Days the tutor doesn't work at all, regardless of frequency — computed
  // from the tutor's real Weekdays/Weekends/Evenings flags via
  // isDayBookable, the same function the time-slot window derives from.
  const disabledDays = useMemo(
    () => dayOptions.filter((day) => !isDayBookable(tutor, nextOccurrenceOfWeekday(day))),
    [tutor]
  );
  const maxDaysPerWeek = Math.max(1, Math.min(5, dayOptions.length - disabledDays.length));

  function toggleDay(day: string) {
    if (disabledDays.includes(day)) return;
    setSelectedDays((days) => {
      if (days.includes(day)) return days.filter((d) => d !== day);
      if (frequency !== "oneTime" && days.length >= daysPerWeek) return days;
      return [...days, day];
    });
  }

  function changeDaysPerWeek(n: number) {
    setDaysPerWeek(n);
    setSelectedDays((days) => days.slice(0, n));
  }

  // Explicit Start Date, chosen by the student from real tutor availability —
  // never assumed to be today. A date/time arriving via query params (from
  // the Calendar modal's "Book this time") pre-fills it; otherwise it stays
  // null until the student picks one.
  const [startDate, setStartDate] = useState<Date | null>(() =>
    prefillDate ? new Date(`${prefillDate}T00:00:00`) : null
  );

  // For a recurring booking, the start date must land on one of the
  // selected days-of-week — if the day selection changes such that a
  // previously-picked start date's weekday is no longer included, clear it
  // rather than silently keep an invalid date (derived-state reset during
  // render, same pattern as the preferredTime reset below).
  const [prevAllowedDaysKey, setPrevAllowedDaysKey] = useState("");
  const allowedDaysKey = frequency === "oneTime" ? "" : selectedDays.slice().sort().join(",");
  if (allowedDaysKey !== prevAllowedDaysKey) {
    setPrevAllowedDaysKey(allowedDaysKey);
    if (startDate && frequency !== "oneTime" && !selectedDays.includes(WEEKDAY_ABBR[startDate.getDay()])) {
      setStartDate(null);
    }
  }

  // Real, duration-aware available slots for the chosen start date — the
  // shared getAvailableSlots(tutor, date, duration) engine, checked against
  // the tutor's actual working hours, real existing bookings (Private AND
  // Discovery), and tutor-created blocks. No start date yet means no times
  // to show.
  const timeSlots = useMemo(
    () => (startDate ? getAvailableSlots(tutor, startDate, duration.minutes).filter((s) => s.state === "available") : []),
    [tutor, startDate, duration.minutes]
  );

  // Initial fill + reset whenever the current preferredTime is no longer
  // one of the valid options for the current start date/duration (derived-
  // state reset during render, same pattern used elsewhere in this app).
  const [prevSlotsKey, setPrevSlotsKey] = useState("");
  const slotsKey = timeSlots.map((s) => s.label).join("|");
  if (slotsKey !== prevSlotsKey) {
    setPrevSlotsKey(slotsKey);
    const stillValid = timeSlots.some((s) => s.label === preferredTime);
    if (!stillValid) {
      const prefillMatch = prefillTime ? timeSlots.find((s) => s.label.startsWith(prefillTime)) : undefined;
      setPreferredTime(prefillMatch?.label ?? timeSlots[0]?.label ?? "");
    }
  }

  const { pricePerSession, sessionsLabel, total } = computeTutorBookingPricing(
    tutor,
    duration.minutes,
    frequency,
    selectedDays
  );

  const canContinue =
    (frequency === "oneTime" || selectedDays.length === daysPerWeek) && Boolean(startDate) && Boolean(preferredTime);

  function goToReview() {
    if (!startDate) return;
    const params = new URLSearchParams({
      duration: String(duration.minutes),
      frequency,
      days: selectedDays.join(","),
      time: preferredTime,
      startDate: toISODate(startDate),
    });
    router.push(`/find-teachers/${tutor.slug}/book/review?${params.toString()}`);
  }

  // Brought up to the same standard the Discovery-session "pre-approved
  // slot" path already meets: "Confirm & Pay" creates real PrivateLesson
  // record(s) via the same buildPrivateLessonSchedule/addPrivateLesson
  // engine the regular booking flow uses, tagged with the offer's agreed
  // price/date/time/frequency — not just a local `offerConfirmed` flag with
  // nothing persisted.
  async function handleConfirmOffer() {
    if (!offer) return;
    setConfirmingOffer(true);
    setOfferConfirmError(null);
    try {
      const tutorEligibility = tutorBookingEligibilityByName(tutor.name);
      if (!tutorEligibility.allowed) {
        throw new Error(bookingBlockedMessage("tutor", tutorEligibility));
      }
      const studentEligibility = studentBookingEligibilityByName(dashboardStudent.name);
      if (!studentEligibility.allowed) {
        throw new Error(bookingBlockedMessage("student", studentEligibility));
      }

      const offerStartDate = new Date(`${offer.date}T00:00:00`);
      const startMinutes = parseTimeToMinutes(formatOfferTime(offer.time));
      if (startMinutes === null) {
        throw new Error("Something went wrong with this offer's time. Please message your tutor.");
      }
      const frequencyKey: FrequencyKey = offer.frequency === "one-time" ? "oneTime" : offer.frequency;
      const selectedOfferDays = (offer.preferredDays ?? []).map((d) => d.slice(0, 3));

      const schedule = numberSchedule(
        buildPrivateLessonSchedule({
          tutor,
          startDate: offerStartDate,
          frequency: frequencyKey,
          selectedDays: selectedOfferDays,
          sessionsForFrequency: offer.lessonsCount,
          startMinutes,
          endMinutes: startMinutes + offer.durationMins,
        }),
        offerStartDate
      );
      if (schedule.length === 0) {
        throw new Error("No available slots could be booked for this offer. Please message your tutor.");
      }

      const bookingId =
        schedule.length > 1
          ? await generateUniqueReferenceCode("private", (candidate) => getPrivateLessons().some((l) => l.bookingId === candidate))
          : undefined;

      const created = [];
      for (const occ of schedule) {
        created.push(
          await addPrivateLesson({
            tutorSlug: tutor.slug,
            student: dashboardStudent.name,
            subject: offer.subject,
            date: formatLessonDateLabel(occ.date),
            time: formatMinutesToClockTime(startMinutes),
            duration: `${offer.durationMins} mins`,
            status: "Upcoming",
            mode: "Online",
            price: formatNaira(offer.finalPricePerSession),
            frequency: frequencyKey,
            ...(bookingId
              ? { bookingId, sessionNumber: occ.sessionNumber, totalSessions: occ.totalSessions, weekNumber: occ.weekNumber }
              : {}),
          })
        );
      }

      recordPayment({
        kind: "Private",
        bookingId: bookingId ?? created[0].id,
        studentName: dashboardStudent.name,
        scope: "full",
        coversSessionIds: created.map((lesson) => lesson.id),
        amount: totalFinalPrice(offer),
        mode: "oneTime",
      });

      respondToOffer(offer.id, (o) => ({ ...o, status: "Accepted" }), "student");
      setOfferConfirmed(true);
    } catch (error) {
      setOfferConfirmError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setConfirmingOffer(false);
    }
  }

  if (showLockedOffer && offer) {
    const isSpecialOffer = offer.kind === "special-offer";
    const standardTotal = totalStandardPrice(offer);
    const finalTotal = totalFinalPrice(offer);
    const savings = savingsAmount(offer);
    const displayTime = formatOfferTime(offer.time);

    if (offerConfirmed) {
      return (
        <>
        <MobileTutorBookingHeader tutorSlug={tutor.slug} title="Booking Confirmed" />
        <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="mt-5 font-heading text-2xl font-semibold text-ensena-ink">Booking Confirmed!</h1>
          <p className="mt-2 text-sm text-ensena-muted">
            Your {offer.subject} lessons with {tutor.name} are confirmed, starting{" "}
            {new Date(offer.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at {displayTime}.
          </p>
          <div className="mt-6 w-full rounded-2xl border border-ensena-border p-5 text-left text-sm">
            <div className="flex justify-between text-ensena-muted"><span>Lessons</span><span className="font-medium text-ensena-ink">{offer.lessonsCount}</span></div>
            <div className="flex justify-between text-ensena-muted"><span>Amount paid</span><span className="font-medium text-ensena-ink">{formatNaira(finalTotal)}</span></div>
          </div>
          <Button nativeButton={false} render={<a href="/student-dashboard/lessons" />} className="mt-6 h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Go to My Classes
          </Button>
        </div>
        </>
      );
    }

    return (
      <>
      <MobileTutorBookingHeader tutorSlug={tutor.slug} />
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="rounded-2xl border-2 border-ensena-primary/30 bg-ensena-primary/5 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary">
            <CheckCircle2 className="size-4" /> {isSpecialOffer ? "Special Offer applied" : "Pre-approved by tutor"}
          </p>
          <p className="mt-1 text-xs text-ensena-ink">
            Everything below was agreed with {tutor.name}
            {" "}in your conversation. The price is locked and won&apos;t change at checkout.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-ensena-border p-6">
          <div className="flex items-center gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
              <Image src={tutor.image} alt={tutor.name} fill sizes="64px" className="object-cover" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-heading text-base font-semibold text-ensena-ink">
                {tutor.name} {isTutorVerifiedByName(tutor.name) && <BadgeCheck className="size-4 text-ensena-primary" />}
              </p>
              <p className="text-sm text-ensena-muted">{offer.subject} · Private Lessons</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-ensena-border pt-5 text-sm sm:grid-cols-4">
            <div>
              <p className="flex items-center gap-1 text-xs text-ensena-muted"><Calendar className="size-3" /> Date</p>
              <p className="mt-0.5 font-medium text-ensena-ink">{new Date(offer.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs text-ensena-muted"><Clock className="size-3" /> Time</p>
              <p className="mt-0.5 font-medium text-ensena-ink">{displayTime}</p>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">Duration</p>
              <p className="mt-0.5 font-medium text-ensena-ink">{offer.durationMins} mins</p>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">Lessons</p>
              <p className="mt-0.5 font-medium text-ensena-ink">
                {offer.lessonsCount} {offer.frequency !== "one-time" && `(${offer.daysPerWeek}× / week)`}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-ensena-bg-soft p-4">
            {isSpecialOffer ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ensena-muted">Original Price</span>
                  <span className="text-ensena-muted line-through">{formatNaira(standardTotal)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-ensena-muted">Special Offer</span>
                  <span className="font-medium text-ensena-success">−{formatNaira(savings)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-ensena-border pt-2 text-base font-semibold">
                  <span className="text-ensena-ink">Total</span>
                  <span className="text-ensena-primary">{formatNaira(finalTotal)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-base font-semibold">
                <span className="text-ensena-ink">Total</span>
                <span className="text-ensena-primary">{formatNaira(finalTotal)}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-ensena-success/10 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ensena-success" />
            <p className="text-xs text-ensena-ink">
              Your payment is securely held in escrow and only released to the tutor after each completed session.
            </p>
          </div>

          {offerConfirmError && (
            <p className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{offerConfirmError}</p>
          )}

          <Button
            onClick={handleConfirmOffer}
            disabled={confirmingOffer}
            className="mt-5 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-60"
          >
            {confirmingOffer ? "Confirming…" : "Confirm & Pay"}
          </Button>
        </div>
      </div>
      </>
    );
  }

  const firstName = tutor.name.split(" ")[0];
  const specialtyTags = Array.from(new Set([tutor.subject, ...tutor.levels]));

  return (
    <>
    <MobileTutorBookingHeader tutorSlug={tutor.slug} />
    <MobileTutorBooking
      tutor={tutor}
      durationOptions={durationOptions}
      duration={duration}
      onDurationChange={setDuration}
      frequency={frequency}
      onFrequencyChange={setFrequency}
      selectedDays={selectedDays}
      onToggleDay={toggleDay}
      disabledDays={disabledDays}
      daysPerWeek={daysPerWeek}
      onDaysPerWeekChange={changeDaysPerWeek}
      maxDaysPerWeek={maxDaysPerWeek}
      startDate={startDate}
      onStartDateChange={setStartDate}
      timeOptions={timeSlots.map((s) => s.label)}
      preferredTime={preferredTime}
      onPreferredTimeChange={setPreferredTime}
      sessionsLabel={sessionsLabel}
      pricePerSession={pricePerSession}
      total={total}
      canContinue={canContinue}
      onContinue={goToReview}
    />
    <div className="hidden lg:block mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <Link
        href={`/find-teachers/${tutor.slug}`}
        className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
      >
        <ChevronLeft className="size-4" /> Back to tutor profile
      </Link>

      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">
            Book a session with {tutor.name}
          </h1>
          <p className="text-sm text-ensena-muted">{tutor.subjectTitle}</p>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ensena-ink">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{rating.rating}</span>
          </span>
          <span className="text-ensena-muted">({rating.reviews} reviews)</span>
          {isTutorVerifiedByName(tutor.name) && (
            <span className="flex items-center gap-1 rounded-full bg-ensena-success/10 px-2 py-0.5 text-xs font-semibold text-ensena-success">
              <ShieldCheck className="size-3" /> Verified Teacher
            </span>
          )}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-5">
          {/* Tutor profile */}
          <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border p-5 sm:flex-row lg:p-6">
            <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-40">
              <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="160px" className="object-cover" />
              {tutor.availableToday && (
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-ensena-success">
                  <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
                </span>
              )}
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
              <p className="mt-1.5 text-sm text-ensena-muted">{tutor.bio}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
                <li className="flex items-center gap-2">
                  <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.yearsExperience}+ years experience
                </li>
                <li className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.lessonsTaught}+ lessons taught
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck className="size-3.5 shrink-0 text-ensena-primary" /> Expert in {tutor.levels.join(", ")}
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.responseTime}
                </li>
              </ul>
            </div>
          </div>

          {/* Subjects & Exam Expertise */}
          <div className="rounded-2xl border border-ensena-border p-5 lg:p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialtyTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* What students say */}
          <div className="rounded-2xl border border-ensena-border p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">What students say</h2>
              <Link href={`/find-teachers/${tutor.slug}/reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
                View all reviews
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {tutor.reviewList.map((review, i) => (
                <div key={i} className="rounded-xl border border-ensena-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ensena-ink">{review.name}</p>
                    <span className="flex items-center gap-1 text-xs font-medium text-ensena-ink">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" /> {review.stars.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ensena-muted">{review.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {tutor.reviewList.map((_, i) => (
                <span key={i} className={i === 0 ? "size-1.5 rounded-full bg-ensena-primary" : "size-1.5 rounded-full bg-ensena-border"} />
              ))}
            </div>
          </div>

          {/* Payment protected banner */}
          <div className="flex items-start gap-3 rounded-2xl bg-ensena-primary/5 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
              <p className="mt-0.5 text-xs text-ensena-muted">
                Payment is held in escrow and released to the tutor only after your session.
              </p>
            </div>
          </div>
        </div>

        {/* Booking configuration sidebar */}
        <aside className="h-fit lg:sticky lg:top-28">
          <TutorBookingSidebar
            tutor={tutor}
            subject={tutor.subject}
            durationOptions={durationOptions}
            duration={duration}
            onDurationChange={setDuration}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            selectedDays={selectedDays}
            onToggleDay={toggleDay}
            disabledDays={disabledDays}
            daysPerWeek={daysPerWeek}
            onDaysPerWeekChange={changeDaysPerWeek}
            maxDaysPerWeek={maxDaysPerWeek}
            startDate={startDate}
            onStartDateChange={setStartDate}
            timeOptions={timeSlots.map((s) => s.label)}
            preferredTime={preferredTime}
            onPreferredTimeChange={setPreferredTime}
            sessionsLabel={sessionsLabel}
            pricePerSession={pricePerSession}
            total={total}
            canContinue={canContinue}
            onContinue={goToReview}
          />
        </aside>
      </div>
    </div>
    </>
  );
}
