"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDayState, getTimesForDate, toISODate } from "@/lib/tutor-availability";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const legend: { state: string; label: string; className: string }[] = [
  { state: "available", label: "Available", className: "bg-ensena-success" },
  { state: "booked", label: "Booked", className: "bg-ensena-border" },
  { state: "blocked", label: "Blocked", className: "bg-amber-400" },
  { state: "today", label: "Today", className: "bg-ensena-primary" },
];

export function TutorCalendarModal({
  open,
  tutor,
  onClose,
  onBookTime,
}: {
  open: boolean;
  tutor: TutorListing;
  onClose: () => void;
  onBookTime: (dateISO: string, hourLabel: string) => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!open) return null;

  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const monthCells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  const times = selectedDate ? getTimesForDate(tutor, selectedDate) : [];
  const selectedTime = selectedHour !== null ? times.find((t) => t.hour === selectedHour) : undefined;

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedHour(null);
  }

  function handleBook() {
    if (!selectedDate || selectedTime?.state !== "available") return;
    onBookTime(toISODate(selectedDate), selectedTime.label);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="tutor-calendar-title">
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="tutor-calendar-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {tutor.name.split(" ")[0]}&apos;s availability
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 p-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
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
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
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
              const state = getDayState(tutor, date, today);
              const isSelected = selectedDate && toISODate(selectedDate) === toISODate(date);
              const clickable = state === "available";
              return (
                <button
                  key={toISODate(date)}
                  type="button"
                  disabled={!clickable}
                  onClick={() => selectDate(date)}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg text-sm",
                    isSelected
                      ? "bg-ensena-primary text-white"
                      : state === "available"
                        ? "text-ensena-ink hover:bg-ensena-bg-soft"
                        : "text-ensena-border"
                  )}
                >
                  {date.getDate()}
                  {isToday && !isSelected && <span className="absolute bottom-0.5 size-1 rounded-full bg-ensena-primary" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-ensena-muted">
            {legend.map((item) => (
              <span key={item.state} className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", item.className)} /> {item.label}
              </span>
            ))}
          </div>

          <div className="mt-5 border-t border-ensena-border pt-4">
            {selectedDate ? (
              <>
                <p className="text-sm font-semibold text-ensena-ink">
                  {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                {times.length === 0 ? (
                  <p className="mt-2 text-sm text-ensena-muted">No availability on this date.</p>
                ) : (
                  <>
                    <p className="mt-1 text-xs font-medium text-ensena-muted">Available times</p>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {times.map((t) => (
                        <button
                          key={t.hour}
                          type="button"
                          disabled={t.state !== "available"}
                          onClick={() => setSelectedHour(t.hour)}
                          className={cn(
                            "rounded-lg border px-2 py-1.5 text-sm font-medium",
                            selectedHour === t.hour
                              ? "border-ensena-primary bg-ensena-primary text-white"
                              : t.state === "available"
                                ? "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                                : "border-ensena-border text-ensena-border line-through"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-ensena-muted">Select an available date to see times.</p>
            )}
          </div>

          <Button
            onClick={handleBook}
            disabled={selectedTime?.state !== "available"}
            className="mt-5 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
          >
            Book this time
          </Button>
        </div>
      </div>
    </div>
  );
}
