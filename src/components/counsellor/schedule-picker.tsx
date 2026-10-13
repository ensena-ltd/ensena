"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { useCounsellorAvailabilityTick } from "@/hooks/use-counsellor-availability";
import { cn } from "@/lib/utils";
import {
  formatDateNoYear,
  formatMonthYear,
  getWeekSlots,
  startOfWeek,
  toISODate,
  type DaySlots,
} from "@/lib/counsellor-data";

export interface ScheduleValue {
  date: string;
  time: string;
}

export function SchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValue | null;
  onChange: (value: ScheduleValue) => void;
}) {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [weekSlots, setWeekSlots] = useState<DaySlots[] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Re-run slot derivation whenever Benny's real availability actually
  // changes (including cross-tab, via the store's storage-event listener) —
  // not just when the student navigates to a different week.
  const availabilityTick = useCounsellorAvailabilityTick();

  // Computed from the current date, so it must run client-side only
  // (post-hydration) to avoid a server/client mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekStart(startOfWeek(new Date()));
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    const slots = getWeekSlots(weekStart);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekSlots(slots);
    setSelectedDate((prev) => {
      if (prev && slots.some((d) => d.date === prev)) return prev;
      return slots.find((d) => d.slots.length > 0)?.date ?? slots[0]?.date ?? null;
    });
  }, [weekStart, availabilityTick]);

  if (!weekStart || !weekSlots) {
    return (
      <div className="flex h-40 items-center justify-center text-ensena-muted">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const canGoPrev = toISODate(weekStart) > toISODate(startOfWeek(new Date()));
  const selectedDay = weekSlots.find((d) => d.date === selectedDate) ?? null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w!);
              d.setDate(d.getDate() - 7);
              return d;
            })
          }
          aria-label="Previous week"
          className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-ink transition-colors hover:bg-ensena-bg-soft disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold text-ensena-ink">{formatMonthYear(weekStart)}</span>
        <button
          type="button"
          onClick={() =>
            setWeekStart((w) => {
              const d = new Date(w!);
              d.setDate(d.getDate() + 7);
              return d;
            })
          }
          aria-label="Next week"
          className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-ink transition-colors hover:bg-ensena-bg-soft"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {weekSlots.map((day) => {
          const disabled = day.isPast || day.slots.length === 0;
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedDate(day.date)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs transition-colors",
                disabled ? "cursor-not-allowed opacity-30" : "hover:bg-ensena-bg-soft"
              )}
            >
              <span className="text-ensena-muted">{day.weekdayShort}</span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm font-semibold",
                  selected ? "bg-ensena-primary text-white" : "text-ensena-ink"
                )}
              >
                {day.dayNumber}
              </span>
              <span className={cn("size-1 rounded-full", day.slots.length > 0 ? "bg-ensena-primary" : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="mt-4">
          <p className="text-xs text-ensena-muted">Available times for {formatDateNoYear(selectedDay.date)}</p>
          {selectedDay.slots.length === 0 ? (
            <p className="mt-2 text-sm text-ensena-muted">No available times on this day. Try another day.</p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {selectedDay.slots.map((time) => {
                const active = value?.date === selectedDay.date && value.time === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => onChange({ date: selectedDay.date, time })}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                        : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {time}
                    {active && (
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
                        <Check className="size-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
