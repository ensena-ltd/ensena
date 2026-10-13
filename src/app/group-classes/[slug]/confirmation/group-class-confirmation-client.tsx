"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Calendar, CalendarPlus, CheckCircle2, Clock, Mail, MessageCircle, PartyPopper, ShieldCheck, Star } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { MessageTutorModal } from "@/components/find-teachers/message-tutor-modal";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import {
  cohortDateRange,
  groupClassPaymentOptions,
  isCohortFull,
} from "@/components/group-classes-page/group-class-booking-sidebar";
import { useGroupClassBySlug } from "@/hooks/use-group-class-listings";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import type { GroupClassListing } from "@/lib/group-classes-data";
import { getSubscriptionForBooking } from "@/lib/payment-plans-store";
import { getTutorBySlug, slugify } from "@/lib/tutors";

const whatsNextSteps = [
  { icon: Mail, title: "Confirmation email", description: "You'll receive an enrollment confirmation shortly." },
  { icon: MessageCircle, title: "Teacher notified", description: "Your teacher has been notified ahead of the next class." },
  { icon: Calendar, title: "Start learning", description: "Join your class on the scheduled time." },
];

function firstAvailableCohortIndex(groupClass: GroupClassListing): number {
  const index = groupClass.cohorts.findIndex((c) => !isCohortFull(c));
  return index === -1 ? 0 : index;
}

export function GroupClassConfirmationClient({
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

  return <GroupClassConfirmationContent groupClass={groupClass} />;
}

function GroupClassConfirmationContent({ groupClass }: { groupClass: GroupClassListing }) {
  const searchParams = useSearchParams();
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);

  // The real reference code minted when the student paid on the review step
  // (group-class-review-client.tsx's handleConfirmAndPay). Falls back to
  // nothing (no crash) if this page is ever reached without one.
  const bookingReference = searchParams.get("ref");

  const cohortParam = Number(searchParams.get("cohort"));
  const cohortIndex = Number.isInteger(cohortParam) && groupClass.cohorts[cohortParam] ? cohortParam : firstAvailableCohortIndex(groupClass);
  const options = groupClassPaymentOptions(groupClass, cohortIndex);
  const plan = searchParams.get("plan") ?? options[0].id;
  const selected = options.find((o) => o.id === plan) ?? options[0];

  const cohort = groupClass.cohorts[cohortIndex];
  const total = selected.amount;
  const planLabel = selected.label;
  const subscription = bookingReference && selected.mode === "recurring" ? getSubscriptionForBooking(bookingReference) : undefined;

  const matchedTutor = getTutorBySlug(slugify(groupClass.tutorName));
  const firstName = groupClass.tutorName.split(" ")[0];

  const summaryCard = (
    <div className="rounded-2xl border border-ensena-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
        <span className="rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">Confirmed</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
          <Image src={groupClass.image} alt={groupClass.title} fill sizes="56px" className="object-cover" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ensena-ink">{groupClass.title}</p>
          <p className="text-xs text-ensena-muted">with {groupClass.tutorName}</p>
          <p className="flex items-center gap-1 text-xs text-ensena-ink"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)</p>
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-ensena-muted">Schedule</dt><dd className="font-medium text-ensena-ink">{cohort.days}, {cohort.time}</dd></div>
        <div className="flex justify-between"><dt className="text-ensena-muted">Cohort</dt><dd className="font-medium text-ensena-ink">{cohortDateRange(cohort)}</dd></div>
        <div className="flex justify-between"><dt className="text-ensena-muted">Plan</dt><dd className="font-medium text-ensena-ink">{planLabel}</dd></div>
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
        <span className="text-sm font-semibold text-ensena-ink">Total paid</span>
        <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
      </div>
      {subscription && (
        <p className="mt-2 text-xs text-ensena-muted">
          Next charge: {new Date(subscription.nextChargeAtMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </div>
  );

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
              <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">You&apos;re enrolled!</h1>
              <p className="mt-1 text-sm text-ensena-muted">
                You&apos;re enrolled in the {groupClass.title}. We&apos;ve sent the details to your email.
              </p>
              {bookingReference && (
                <span className="mt-3 rounded-full bg-ensena-bg-soft px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-ensena-ink">
                  {bookingReference}
                </span>
              )}
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
                <p className="mt-0.5 text-xs text-ensena-muted">
                  Your payment is held securely and will be released to the teacher according to Ensena&apos;s booking and session terms.
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
                <Clock className="size-3.5" /> Add to Calendar
              </button>
            </div>

            <div className="mt-6 lg:hidden">{summaryCard}</div>

            <p className="mt-6 text-center text-sm font-semibold text-ensena-ink lg:text-left">You can now</p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {matchedTutor && (
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(true)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  <MessageCircle className="size-4" /> Message {firstName}
                </button>
              )}
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={`/group-classes/${groupClass.slug}`} />}
                className="h-11 rounded-full border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                View Class
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/student-dashboard/group-classes" />}
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
              <NeedHelpCard role="Student" context="group-class" relatedRecordType="group-class" relatedRecordId={bookingReference ?? undefined} relatedRecordLabel={groupClass.title} />
            </div>
          </div>

          <aside className="hidden lg:flex lg:flex-col lg:gap-4">
            {summaryCard}
            <WhatHappensNext title="What's next?" steps={whatsNextSteps} />
            <NeedHelpCard role="Student" context="group-class" relatedRecordType="group-class" relatedRecordId={bookingReference ?? undefined} relatedRecordLabel={groupClass.title} />
          </aside>
        </div>
      </div>

      {matchedTutor && (
        <MessageTutorModal open={messageModalOpen} tutor={matchedTutor} onClose={() => setMessageModalOpen(false)} />
      )}
    </>
  );
}
