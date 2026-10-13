"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, CheckCircle2, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildIntakeSummary,
  counsellor,
  formatFullDate,
  SESSION_LENGTH_LABEL,
  type CounsellorIntake,
} from "@/lib/counsellor-data";

export interface ConfirmedBooking {
  date: string;
  time: string;
  endTime: string;
}

function buildIcsFile(booking: ConfirmedBooking, summary: string): string {
  // A real, downloadable .ics file the browser can hand to the OS's default
  // calendar app — no booking backend to persist this against, so it's
  // generated client-side from the booking the student just confirmed.
  const start = new Date(`${booking.date}T00:00:00`);
  const [time, meridiem] = booking.time.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = parseInt(hourStr, 10) % 12;
  if (meridiem === "PM") hour += 12;
  start.setHours(hour, parseInt(minuteStr, 10), 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const toICSDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ensena//Counsellor Session//EN",
    "BEGIN:VEVENT",
    `UID:ensena-benny-${start.getTime()}@ensena.co`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Session with Benny, Enseña's Academic Counsellor`,
    `DESCRIPTION:${summary.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function addToCalendar(booking: ConfirmedBooking, summary: string) {
  const blob = new Blob([buildIcsFile(booking, summary)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "session-with-benny.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export function BookingSuccess({ booking, intake }: { booking: ConfirmedBooking; intake: CounsellorIntake }) {
  const summary = buildIntakeSummary(intake);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
        <CheckCircle2 className="size-9" />
      </span>
      <h1 className="mt-6 font-heading text-2xl font-semibold text-ensena-ink">Your counselling session is booked</h1>
      <p className="mt-2 text-ensena-muted">
        Benny will meet you at the time below. A calendar invitation and meeting link will be sent to you.
      </p>

      <div className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-ensena-border p-5 text-left">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
          <Image src={counsellor.image} alt={counsellor.name} fill sizes="48px" className="object-cover" />
        </div>
        <div>
          <p className="font-semibold text-ensena-ink">
            {counsellor.name} · {counsellor.role}
          </p>
          <p className="text-sm text-ensena-muted">{formatFullDate(booking.date)}</p>
          <p className="text-sm text-ensena-muted">
            {booking.time} – {booking.endTime}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ensena-muted">
            <Video className="size-3.5" /> {SESSION_LENGTH_LABEL} · Video Call · Free
          </p>
        </div>
      </div>

      <div className="mt-4 w-full rounded-2xl bg-ensena-bg-soft p-5 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">What you told Benny</p>
        <p className="mt-1.5 text-sm text-ensena-ink">&ldquo;{summary}&rdquo;</p>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => addToCalendar(booking, summary)}
          className="h-11 rounded-full border-ensena-border px-8 text-sm font-medium"
        >
          <CalendarPlus className="size-4" /> Add to Calendar
        </Button>
        <Button
          nativeButton={false}
          className="h-11 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white"
          render={<Link href="/student-dashboard/lessons" />}
        >
          View Session
        </Button>
      </div>
    </div>
  );
}
