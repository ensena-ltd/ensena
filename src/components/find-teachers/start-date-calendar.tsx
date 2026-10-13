"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { getDayAvailabilityState, getNextAvailableDate, toISODate, WEEKDAY_ABBR } from "@/lib/tutor-availability";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const noopSubscribe = () => () => {};

// The standard React idiom for "is this the real client render, not the
// server/hydration-matching one" — flips from the server snapshot (false)
// to the client snapshot (true) exactly once, right after hydration,
// without a setState-in-effect render cascade.
function useHasMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// One shared Start Date calendar grid for both Private and Discovery
// booking — real per-day availability (via getDayAvailabilityState, which
// accounts for the tutor's actual working hours, existing bookings of
// either kind, tutor-created blocks, and the requested lesson duration),
// never a hardcoded set of dates. `allowedWeekdays`, when passed, further
// restricts selectable days to a recurring booking's chosen days-of-week —
// the calendar otherwise imposes no restriction beyond real availability.
export function StartDateCalendar({
  tutor,
  durationMinutes,
  selectedDate,
  onSelectDate,
  allowedWeekdays,
}: {
  tutor: TutorListing;
  durationMinutes: number;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  allowedWeekdays?: string[];
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [userNavigated, setUserNavigated] = useState(false);

  // Real availability depends on localStorage-backed bookings, which don't
  // exist during the server render — computing it there would make the
  // server's HTML disagree with the client's first paint (every date would
  // look available server-side, since there's nothing to conflict with yet).
  // Rendering every day disabled until mounted keeps the server and the
  // client's hydration pass in agreement, then a real client-only re-render
  // fills in the true, booking-aware state.
  const mounted = useHasMounted();

  // Once mounted, jump to the next real available month (never auto-
  // selecting a date) if today's month has nothing open — must happen
  // client-side, for the same reason as above.
  useEffect(() => {
    if (!mounted || userNavigated || selectedDate) return;
    const next = getNextAvailableDate(tutor, durationMinutes);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors real, localStorage-backed booking data (an external system), not derivable from props
    if (next) setViewMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, tutor, durationMinutes]);

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const monthCells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => {
            setUserNavigated(true);
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
          }}
          className="flex size-8 items-center justify-center rounded-full border border-ensena-border"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold text-ensena-ink">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => {
            setUserNavigated(true);
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
          }}
          className="flex size-8 items-center justify-center rounded-full border border-ensena-border"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-ensena-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthCells.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />;
          const isToday = toISODate(date) === toISODate(today);
          const weekdayAllowed = !allowedWeekdays || allowedWeekdays.length === 0 || allowedWeekdays.includes(WEEKDAY_ABBR[date.getDay()]);
          const state = mounted && weekdayAllowed ? getDayAvailabilityState(tutor, date, durationMinutes, today) : "unavailable";
          const isSelected = selectedDate && toISODate(selectedDate) === toISODate(date);
          const clickable = state === "available";
          return (
            <button
              key={toISODate(date)}
              type="button"
              disabled={!clickable}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-sm",
                isSelected
                  ? "bg-ensena-primary text-white"
                  : clickable
                    ? "text-ensena-ink hover:bg-ensena-bg-soft"
                    : "cursor-not-allowed text-ensena-border"
              )}
            >
              {date.getDate()}
              {isToday && !isSelected && <span className="absolute bottom-0.5 size-1 rounded-full bg-ensena-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
