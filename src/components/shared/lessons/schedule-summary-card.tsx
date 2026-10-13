import { Calendar, CalendarDays, Clock, Hourglass, Repeat } from "lucide-react";

import { InfoTile } from "@/components/shared/lessons/info-tile";
import type { ScheduleSummary } from "@/lib/private-booking-schedule";

// The one real schedule summary shown on both the Student and Tutor View
// Class pages — built from summarizeSchedule() (private-booking-schedule.ts),
// which derives every value from the booking's own real session records, so
// this card can never show a start date/day/session-count that disagrees
// with what was actually booked. Days/Sessions-per-week are only shown for
// an actually-recurring booking — a one-time lesson has exactly one day and
// one session, which the schedule already makes obvious via Starting Date.
export function ScheduleSummaryCard({ summary, title = "Schedule" }: { summary: ScheduleSummary; title?: string }) {
  const isRecurring = summary.frequencyLabel !== "One-time" && summary.frequencyLabel !== null;
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">{title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
        <InfoTile icon={Calendar} label="Starting Date" value={summary.startDateLabel} />
        <InfoTile icon={Clock} label="Time" value={summary.timeLabel} />
        <InfoTile icon={Hourglass} label="Duration" value={summary.durationLabel} />
        {isRecurring && <InfoTile icon={CalendarDays} label="Days" value={summary.daysLabel} />}
        {isRecurring && <InfoTile icon={Repeat} label="Sessions / Week" value={`${summary.sessionsPerWeek}x per week`} />}
      </div>
    </div>
  );
}
