"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Calendar, CalendarPlus, CheckCircle2, Mail, MessageCircle, PartyPopper, ShieldCheck, Star } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MessageTutorModal } from "@/components/find-teachers/message-tutor-modal";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import { frequencyLabels, type FrequencyKey } from "@/components/find-teachers/tutor-booking-sidebar";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { formatDaysFull } from "@/lib/group-classes-data";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { computeTutorBookingPricing } from "@/lib/tutor-booking-pricing";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import type { TutorListing } from "@/lib/tutors";

const whatsNextSteps = [
  { icon: Mail, title: "Confirmation email", description: "You'll receive a booking confirmation shortly." },
  { icon: MessageCircle, title: "Tutor notified", description: "The tutor has been notified and will prepare for your first session." },
  { icon: Calendar, title: "Start learning", description: "Join your session on the scheduled time." },
];

export function TutorConfirmationClient({ tutor }: { tutor: TutorListing }) {
  const searchParams = useSearchParams();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  const durationMinutes = Number(searchParams.get("duration")) || 30;
  const frequency = (searchParams.get("frequency") as FrequencyKey) || "oneTime";
  const selectedDays = (searchParams.get("days") ?? "").split(",").filter(Boolean);
  const preferredTime = searchParams.get("time") ?? "";

  const { sessionsForFrequency, total } = computeTutorBookingPricing(tutor, durationMinutes, frequency, selectedDays);
  const firstName = tutor.name.split(" ")[0];

  // The actual lessons created when the student paid on the review step
  // (tutor-review-client.tsx's handleConfirmAndPay) — looked up by their
  // real reference codes rather than recomputed, since a booking is a real
  // record now. Falls back gracefully (no crash, just an empty list) if
  // this page is ever reached without a ref, e.g. a stale bookmark.
  const refs = (searchParams.get("ref") ?? "").split(",").filter(Boolean);
  const allLessons = usePrivateLessons();
  const bookedLessons = refs.length > 0 ? allLessons.filter((l) => refs.includes(l.bookingReference)) : [];
  const primaryReference = bookedLessons[0]?.bookingReference;
  const primaryLesson = bookedLessons[0];

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-4 lg:hidden">
        <PartyPopper className="size-5 text-ensena-primary" />
        <Link href="/" className="flex items-center gap-1.5">
          <Logo size={26} />
        </Link>
        <Bell className="size-5 text-ensena-ink" />
      </header>

      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="flex flex-col items-center text-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
                <CheckCircle2 className="size-9" />
              </span>
              <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">Payment successful!</h1>
              <p className="mt-1 text-sm text-ensena-muted">
                Your booking is confirmed. We&apos;ve sent the details to your email.
              </p>
              {primaryReference && (
                <div className="mt-3 flex flex-col items-center gap-1">
                  <span className="rounded-full bg-ensena-bg-soft px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-ensena-ink">
                    {primaryReference}
                  </span>
                  {bookedLessons.length > 1 && (
                    <span className="text-xs text-ensena-muted">
                      +{bookedLessons.length - 1} more session{bookedLessons.length - 1 === 1 ? "" : "s"} scheduled. See My Classes for the full list
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
                <p className="mt-0.5 text-xs text-ensena-muted">
                  Your payment is held securely and will be released to the tutor according to Ensena&apos;s booking and session terms.
                </p>
              </div>
            </div>

            <div className="mt-6 lg:hidden">
              <WhatHappensNext title="What's next?" steps={whatsNextSteps} />
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-ensena-primary/5 p-4">
              <div className="flex items-center gap-3">
                <CalendarPlus className="size-5 shrink-0 text-ensena-primary" />
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">Add to your calendar</p>
                  <p className="text-xs text-ensena-muted">Never miss a class by adding your schedule to your calendar.</p>
                </div>
              </div>
              <button
                type="button"
                className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full border border-ensena-primary/30 px-3 text-xs font-semibold text-ensena-primary hover:bg-white sm:flex"
              >
                <Calendar className="size-3.5" /> Add to Calendar
              </button>
            </div>

            {/* Booking summary — mobile only, desktop shows it in the right column */}
            <div className="mt-6 rounded-2xl border border-ensena-border p-5 lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
                <span className="rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">Confirmed</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={tutor.image} alt={tutor.name} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{tutor.subject} with {tutor.name}</p>
                  {isTutorVerifiedByName(tutor.name) && (
                    <p className="flex items-center gap-1 text-xs text-ensena-success"><ShieldCheck className="size-3.5" /> Verified Teacher</p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-ensena-ink"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)</p>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="font-medium text-ensena-ink">{durationMinutes} minutes</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Frequency</dt><dd className="font-medium text-ensena-ink">{frequencyLabels[frequency]}</dd></div>
                {selectedDays.length > 0 && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Days</dt><dd className="font-medium text-ensena-ink">{formatDaysFull(selectedDays.join(","))}</dd></div>
                )}
                {preferredTime && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Time</dt><dd className="font-medium text-ensena-ink">{preferredTime}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ensena-muted">Number of sessions</dt><dd className="font-medium text-ensena-ink">{sessionsForFrequency} sessions</dd></div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total paid</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <p className="mt-6 text-center text-sm font-semibold text-ensena-ink lg:text-left">You can now</p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMessageModalOpen(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <MessageCircle className="size-4" /> Message {firstName}
              </button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/student-dashboard/lessons" />}
                className="h-11 rounded-full border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <Calendar className="size-4" /> View My Schedule
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/student-dashboard" />}
                className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Go to Dashboard
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Ensena Commitment</p>
                <p className="mt-0.5 text-xs text-ensena-muted">
                  We are committed to providing you with a safe, reliable and productive learning experience.
                </p>
              </div>
            </div>

            <div className="mt-4 lg:hidden">
              <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={primaryReference} relatedRecordLabel={primaryLesson ? `${primaryLesson.subject} with ${tutor.name}` : undefined} />
            </div>
          </div>

          {/* Desktop right column */}
          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
            <div className="rounded-2xl border border-ensena-border p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
                <span className="rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">Confirmed</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={tutor.image} alt={tutor.name} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{tutor.subject} with {tutor.name}</p>
                  {isTutorVerifiedByName(tutor.name) && (
                    <p className="flex items-center gap-1 text-xs text-ensena-success"><ShieldCheck className="size-3.5" /> Verified Teacher</p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-ensena-ink"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)</p>
                </div>
              </div>
              <dl className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="font-medium text-ensena-ink">{durationMinutes} minutes</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Frequency</dt><dd className="font-medium text-ensena-ink">{frequencyLabels[frequency]}</dd></div>
                {selectedDays.length > 0 && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Days</dt><dd className="font-medium text-ensena-ink">{formatDaysFull(selectedDays.join(","))}</dd></div>
                )}
                {preferredTime && (
                  <div className="flex justify-between"><dt className="text-ensena-muted">Time</dt><dd className="font-medium text-ensena-ink">{preferredTime}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ensena-muted">Number of sessions</dt><dd className="font-medium text-ensena-ink">{sessionsForFrequency} sessions</dd></div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total paid</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <WhatHappensNext title="What's next?" steps={whatsNextSteps} />
            <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={primaryReference} relatedRecordLabel={primaryLesson ? `${primaryLesson.subject} with ${tutor.name}` : undefined} />
          </aside>
        </div>
      </div>

      <MessageTutorModal open={messageModalOpen} tutor={tutor} onClose={() => setMessageModalOpen(false)} />
    </>
  );
}
