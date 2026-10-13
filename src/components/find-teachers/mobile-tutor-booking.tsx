"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  ChevronDown,
  ChevronRight,
  Lock,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  dayOptions,
  frequencyLabels,
  type DurationOption,
  type FrequencyKey,
} from "@/components/find-teachers/tutor-booking-sidebar";
import { StartDateCalendar } from "@/components/find-teachers/start-date-calendar";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// Mobile-only, streamlined presentation of the same private-tutor booking
// flow as the desktop page — every value here (state, pricing, session
// count, time slots) is lifted from and owned by TutorBookingClient, the
// exact same booking engine the desktop sidebar uses. Only the layout
// differs: a sequential scroll instead of a two-column grid, plus a sticky
// bottom CTA.
export function MobileTutorBooking({
  tutor,
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
}: {
  tutor: TutorListing;
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
}) {
  const [bioExpanded, setBioExpanded] = useState(false);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  const firstName = tutor.name.split(" ")[0];
  const specialtyTags = Array.from(new Set([tutor.subject, ...tutor.levels]));
  const showDays = frequency !== "oneTime";

  return (
    <div className="pb-28 lg:hidden">
      <div className="px-4 pt-4">
        {/* Tutor introduction */}
        <div className="flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl">
            <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="96px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-heading text-lg font-semibold text-ensena-ink">
              {tutor.name} <VerifiedTutorBadge tutorName={tutor.name} />
            </p>
            <p className="text-sm text-ensena-muted">{tutor.subjectTitle}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{rating.rating}</span>
              <span className="text-ensena-muted">({rating.reviews} reviews)</span>
            </p>
            {tutor.availableToday && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-ensena-success">
                <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
              </p>
            )}
          </div>
        </div>

        {/* About tutor */}
        <div className="mt-5 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
          <p className={bioExpanded ? "mt-1.5 text-sm text-ensena-muted" : "mt-1.5 line-clamp-3 text-sm text-ensena-muted"}>
            {tutor.bio}
          </p>
          <button
            type="button"
            onClick={() => setBioExpanded((v) => !v)}
            className="mt-1 flex items-center gap-1 text-sm font-semibold text-ensena-primary"
          >
            {bioExpanded ? "Show less" : "Read more"}
            <ChevronRight className={cn("size-3.5 transition-transform", bioExpanded ? "-rotate-90" : "rotate-90")} />
          </button>
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

        {/* Subjects & Exam Expertise */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
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
        <div className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">What students say</h2>
            <Link href={`/find-teachers/${tutor.slug}/reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
              View all reviews
            </Link>
          </div>
          <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
            {tutor.reviewList.map((review, i) => (
              <div
                key={i}
                className="w-[80%] shrink-0 snap-start rounded-xl border border-ensena-border p-4"
              >
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
        </div>

        {/* Payment protected banner */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ensena-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
            <p className="mt-0.5 text-xs text-ensena-muted">
              Payment is held in escrow and released to the tutor only after your session.
            </p>
          </div>
        </div>

        {/* Customize your session */}
        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Customize your session</h2>

          <div className="mt-4">
            <p className="text-sm font-semibold text-ensena-ink">Duration</p>
            <p className="text-xs text-ensena-muted">Length of each session</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {durationOptions.map((option) => (
                <button
                  key={option.minutes}
                  type="button"
                  onClick={() => onDurationChange(option)}
                  className={cn(
                    "rounded-xl border px-2 py-3 text-center text-sm font-medium",
                    duration.minutes === option.minutes
                      ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                      : "border-ensena-border text-ensena-ink"
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
                    "rounded-xl border px-2 py-3 text-center text-sm font-medium",
                    frequency === key
                      ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                      : "border-ensena-border text-ensena-ink"
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
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: maxDaysPerWeek }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onDaysPerWeekChange(n)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg border text-sm font-medium",
                      daysPerWeek === n
                        ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                        : "border-ensena-border text-ensena-ink"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-ensena-ink">Select days</p>
              <p className="text-xs text-ensena-muted">{selectedDays.length} of {daysPerWeek} days selected</p>
              <div className="mt-2 flex flex-wrap gap-2">
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
                        "flex h-10 min-w-[3rem] flex-col items-center justify-center gap-0 rounded-lg border px-2.5 text-sm font-medium leading-tight",
                        isDisabled
                          ? "cursor-not-allowed border-ensena-border text-ensena-border"
                          : isSelected
                            ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                            : capReached
                              ? "cursor-not-allowed border-ensena-border text-ensena-muted"
                              : "border-ensena-border text-ensena-ink"
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
              <SelectTrigger className="mt-2 h-12 w-full justify-between rounded-xl border-ensena-border px-3 text-sm font-medium text-ensena-ink [&>svg]:hidden">
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
                {frequency === "oneTime" ? "A single session" : "Based on the days you selected"}
              </p>
            </div>
            <span className="font-semibold text-ensena-ink">{sessionsLabel}</span>
          </div>
        </div>

        {/* Booking summary */}
        <div className="mt-6 rounded-2xl bg-ensena-bg-soft p-4">
          <h3 className="text-sm font-semibold text-ensena-ink">Booking summary</h3>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ensena-muted">Subject</dt>
              <dd className="font-medium text-ensena-ink">{tutor.subject}</dd>
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
      </div>

      {/* Sticky bottom CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        {!canContinue && (
          <p className="mb-2 text-center text-xs font-medium text-rose-600">
            {showDays && selectedDays.length < daysPerWeek
              ? `Select ${daysPerWeek - selectedDays.length} more day${daysPerWeek - selectedDays.length === 1 ? "" : "s"} to continue.`
              : !startDate
                ? "Select a start date to continue."
                : "Select a preferred time to continue."}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-ensena-ink">{formatNaira(total)}</p>
            <p className="text-xs text-ensena-muted">{sessionsLabel} · {frequencyLabels[frequency]}</p>
          </div>
          <Button
            disabled={!canContinue}
            onClick={onContinue}
            className="h-12 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
          >
            Continue to Payment →
          </Button>
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-ensena-muted">
          <Lock className="size-3" /> You won&apos;t be charged yet
        </p>
      </div>
    </div>
  );
}
