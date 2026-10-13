"use client";

import { ChevronDown, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StartDateCalendar } from "@/components/find-teachers/start-date-calendar";
import { formatNaira } from "@/lib/format";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

export type FrequencyKey = "oneTime" | "weekly" | "monthly";

export const frequencyLabels: Record<FrequencyKey, string> = {
  oneTime: "One time",
  weekly: "Weekly",
  monthly: "Monthly",
};

export interface DurationOption {
  minutes: number;
  units: number;
  label: string;
}

export const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface TutorBookingSidebarProps {
  tutor: TutorListing;
  subject: string;
  durationOptions: DurationOption[];
  duration: DurationOption;
  onDurationChange: (duration: DurationOption) => void;
  frequency: FrequencyKey;
  onFrequencyChange: (frequency: FrequencyKey) => void;
  selectedDays: string[];
  onToggleDay: (day: string) => void;
  disabledDays: string[];
  daysPerWeek: number;
  onDaysPerWeekChange: (n: number) => void;
  maxDaysPerWeek: number;
  startDate: Date | null;
  onStartDateChange: (date: Date) => void;
  timeOptions: string[];
  preferredTime: string;
  onPreferredTimeChange: (time: string) => void;
  sessionsLabel: string;
  pricePerSession: number;
  total: number;
  canContinue: boolean;
  onContinue: () => void;
}

export function TutorBookingSidebar({
  tutor,
  subject,
  durationOptions,
  duration,
  onDurationChange,
  frequency,
  onFrequencyChange,
  selectedDays,
  onToggleDay,
  disabledDays,
  daysPerWeek,
  onDaysPerWeekChange,
  maxDaysPerWeek,
  startDate,
  onStartDateChange,
  timeOptions,
  preferredTime,
  onPreferredTimeChange,
  sessionsLabel,
  pricePerSession,
  total,
  canContinue,
  onContinue,
}: TutorBookingSidebarProps) {
  const showDays = frequency !== "oneTime";

  return (
    <div className="rounded-2xl border border-ensena-border p-5 shadow-sm lg:p-6">
      <h2 className="font-heading text-base font-semibold text-ensena-ink lg:text-lg">Customize your session</h2>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ensena-ink">Duration</p>
        <p className="text-xs text-ensena-muted">Length of each session</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {durationOptions.map((option) => (
            <button
              key={option.minutes}
              type="button"
              onClick={() => onDurationChange(option)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-center text-sm font-medium",
                duration.minutes === option.minutes
                  ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                  : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ensena-ink">Frequency</p>
        <p className="text-xs text-ensena-muted">How often do you want lessons?</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(frequencyLabels) as FrequencyKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onFrequencyChange(key)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-center text-sm font-medium",
                frequency === key
                  ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                  : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {frequencyLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {showDays && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-ensena-ink">How many days per week?</p>
          <p className="text-xs text-ensena-muted">Choose exactly this many days below</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Array.from({ length: maxDaysPerWeek }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onDaysPerWeekChange(n)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border text-xs font-medium",
                  daysPerWeek === n
                    ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                    : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                )}
              >
                {n}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-semibold text-ensena-ink">Select days</p>
          <p className="text-xs text-ensena-muted">{selectedDays.length} of {daysPerWeek} days selected</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dayOptions.map((day) => {
              const isDisabled = disabledDays.includes(day);
              const isSelected = selectedDays.includes(day);
              const capReached = !isSelected && selectedDays.length >= daysPerWeek;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled || capReached}
                  onClick={() => onToggleDay(day)}
                  title={isDisabled ? "Tutor unavailable this day" : undefined}
                  className={cn(
                    "flex h-9 min-w-[2.75rem] flex-col items-center justify-center gap-0 rounded-lg border px-2 text-xs font-medium leading-tight",
                    isDisabled
                      ? "cursor-not-allowed border-ensena-border text-ensena-border"
                      : isSelected
                        ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                        : capReached
                          ? "cursor-not-allowed border-ensena-border text-ensena-muted"
                          : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                  )}
                >
                  {day}
                  {isDisabled && <span className="text-[8px] leading-none">Unavailable</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-sm font-semibold text-ensena-ink">Start date</p>
        <p className="text-xs text-ensena-muted">
          {frequency === "oneTime" ? "When should this session happen?" : "When should your first session happen?"}
        </p>
        <div className="mt-2 rounded-xl border border-ensena-border p-3">
          <StartDateCalendar
            tutor={tutor}
            durationMinutes={duration.minutes}
            selectedDate={startDate}
            onSelectDate={onStartDateChange}
            allowedWeekdays={frequency === "oneTime" ? undefined : selectedDays}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-ensena-ink">Preferred time</p>
        <p className="text-xs text-ensena-muted">Your preferred time</p>
        <Select value={preferredTime} onValueChange={(v) => v && onPreferredTimeChange(v)}>
          <SelectTrigger className="mt-2 h-11 w-full justify-between rounded-xl border-ensena-border px-3 text-sm font-medium text-ensena-ink [&>svg]:hidden">
            <SelectValue />
            <ChevronDown className="size-4 shrink-0 text-ensena-muted" />
          </SelectTrigger>
          <SelectContent>
            {timeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ensena-ink">Number of sessions</p>
          <p className="text-xs text-ensena-muted">
            {frequency === "oneTime"
              ? "A single session"
              : "Based on the days you selected"}
          </p>
        </div>
        <span className="font-semibold text-ensena-ink">{sessionsLabel}</span>
      </div>

      <div className="mt-6 rounded-xl bg-ensena-bg-soft p-4">
        <h3 className="text-sm font-semibold text-ensena-ink">Booking summary</h3>
        <dl className="mt-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Subject</dt>
            <dd className="font-medium text-ensena-ink">{subject}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Duration</dt>
            <dd className="font-medium text-ensena-ink">{duration.label}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Frequency</dt>
            <dd className="font-medium text-ensena-ink">{frequencyLabels[frequency]}</dd>
          </div>
          {showDays && (
            <div className="flex justify-between">
              <dt className="text-ensena-muted">Days</dt>
              <dd className="font-medium text-ensena-ink">
                {selectedDays.length > 0 ? selectedDays.join(", ") : "Not selected"}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ensena-muted">Sessions</dt>
            <dd className="font-medium text-ensena-ink">{sessionsLabel}</dd>
          </div>
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
          <span className="text-sm font-semibold text-ensena-ink">Total amount</span>
          <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
        </div>
        <p className="mt-1 text-xs text-ensena-muted">{formatNaira(pricePerSession)} per session</p>
      </div>

      <Button
        disabled={!canContinue}
        onClick={onContinue}
        className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary-hover disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0"
      >
        Continue to Payment →
      </Button>
      {!canContinue && (
        <p className="mt-2 text-center text-xs font-medium text-rose-600">
          {showDays && selectedDays.length < daysPerWeek
            ? `Select ${daysPerWeek - selectedDays.length} more day${daysPerWeek - selectedDays.length === 1 ? "" : "s"} to continue.`
            : !startDate
              ? "Select a start date to continue."
              : "Select a preferred time to continue."}
        </p>
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ensena-muted">
        <Lock className="size-3.5" /> You won&apos;t be charged yet
      </p>
    </div>
  );
}
