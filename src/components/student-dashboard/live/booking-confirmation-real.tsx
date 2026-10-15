"use client";

import Link from "next/link";
import { Calendar, CalendarPlus, CheckCircle2, Mail, MessageCircle, ShieldCheck, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NeedHelpCard } from "@/components/booking/need-help-card";
import { WhatHappensNext } from "@/components/booking/what-happens-next";
import type { BookingFrequency } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";

import { frequencyLabel } from "./book-tutor-real";
import { PersonAvatar } from "./live-shared";

const whatsNextSteps = [
  { icon: Mail, title: "Confirmation email", description: "You'll receive a booking confirmation shortly." },
  { icon: MessageCircle, title: "Tutor notified", description: "The tutor has been notified and will prepare for your first session." },
  { icon: Calendar, title: "Start learning", description: "Join your session on the scheduled time." },
];

export interface ConfirmedBooking {
  reference: string;
  subject: string;
  durationMinutes: number;
  frequency: BookingFrequency;
  daysLabel: string;
  timeLabel: string;
  totalPaid: number;
  lessons: { id: string; startMs: number; endMs: number }[];
}

function icsStamp(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function BookingConfirmationReal({ tutor, booking: b, origin }: { tutor: TutorPublicProfile; booking: ConfirmedBooking; origin: string }) {
  const firstName = tutor.name.split(" ")[0];
  const count = b.lessons.length;

  function addToCalendar() {
    const events = b.lessons.map((l) =>
      [
        "BEGIN:VEVENT",
        `UID:${l.id}@ensena.co`,
        `DTSTAMP:${icsStamp(Date.now())}`,
        `DTSTART:${icsStamp(l.startMs)}`,
        `DTEND:${icsStamp(l.endMs)}`,
        `SUMMARY:${b.subject} with ${tutor.name} (Ensena)`,
        `DESCRIPTION:Join from My Classes: ${origin}/student-dashboard/lessons?view=${l.id}`,
        `URL:${origin}/student-dashboard/lessons?view=${l.id}`,
        "END:VEVENT",
      ].join("\r\n")
    );
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ensena//Bookings//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ensena-${b.reference}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const summary = (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Booking summary</h2>
        <span className="rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">Confirmed</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <PersonAvatar name={tutor.name} image={tutor.image} className="size-14 rounded-xl text-lg" />
        <div>
          <p className="text-sm font-semibold text-ensena-ink">
            {b.subject} with {tutor.name}
          </p>
          <p className="flex items-center gap-1 text-xs text-ensena-success">
            <ShieldCheck className="size-3.5" /> Verified Teacher
          </p>
          <p className="flex items-center gap-1 text-xs text-ensena-ink">
            <Star className="size-3 fill-amber-400 text-amber-400" /> {tutor.rating ?? "New"} ({tutor.reviewCount} reviews)
          </p>
        </div>
      </div>
      <dl className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
        {[
          ["Duration", `${b.durationMinutes} minutes`],
          ["Frequency", frequencyLabel[b.frequency]],
          ["Days", b.daysLabel],
          ["Time", b.timeLabel],
          ["Number of sessions", `${count} session${count === 1 ? "" : "s"}`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-ensena-muted">{label}</dt>
            <dd className="text-right font-medium text-ensena-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
        <span className="text-sm font-semibold text-ensena-ink">Total paid</span>
        <span className="text-lg font-semibold text-ensena-primary">{formatNaira(b.totalPaid)}</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">Payment successful!</h1>
          <p className="mt-1 text-sm text-ensena-muted">Your booking is confirmed. We&apos;ve sent the details to your email.</p>
          <div className="mt-3 flex flex-col items-center gap-1">
            <span className="rounded-full bg-ensena-bg-soft px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-ensena-ink">{b.reference}</span>
            {count > 1 && (
              <span className="text-xs text-ensena-muted">
                +{count - 1} more session{count - 1 === 1 ? "" : "s"} scheduled. See My Classes for the full list
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
            <p className="mt-0.5 text-xs text-ensena-muted">Your payment is held securely and will be released to the tutor according to Ensena&apos;s booking and session terms.</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-ensena-primary/5 p-4">
          <div className="flex items-center gap-3">
            <CalendarPlus className="size-5 shrink-0 text-ensena-primary" />
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Add to your calendar</p>
              <p className="text-xs text-ensena-muted">Never miss a class by adding your schedule to your calendar.</p>
            </div>
          </div>
          <button type="button" onClick={addToCalendar} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-ensena-primary/30 px-3 text-xs font-semibold text-ensena-primary hover:bg-white">
            <Calendar className="size-3.5" /> Add to Calendar
          </button>
        </div>

        <div className="mt-6 lg:hidden">{summary}</div>

        <p className="mt-6 text-center text-sm font-semibold text-ensena-ink lg:text-left">You can now</p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Button variant="outline" nativeButton={false} render={<Link href={`/student-dashboard/messages?tutor=${tutor.id}`} />} className="h-11 rounded-full border-ensena-border bg-ensena-bg-soft text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <MessageCircle className="size-4" /> Message {firstName}
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/student-dashboard/lessons?tab=Upcoming" />} className="h-11 rounded-full border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Calendar className="size-4" /> View My Schedule
          </Button>
          <Button nativeButton={false} render={<Link href="/student-dashboard" />} className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
            Go to Dashboard
          </Button>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Ensena Commitment</p>
            <p className="mt-0.5 text-xs text-ensena-muted">We are committed to providing you with a safe, reliable and productive learning experience.</p>
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="hidden lg:block">{summary}</div>
        <WhatHappensNext title="What's next?" steps={whatsNextSteps} />
        <NeedHelpCard role="Student" context="booking" relatedRecordType="booking" relatedRecordId={b.reference} relatedRecordLabel={`${b.subject} with ${tutor.name}`} />
      </aside>
    </div>
  );
}
