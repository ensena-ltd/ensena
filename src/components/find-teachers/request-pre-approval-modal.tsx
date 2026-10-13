"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { groupClassListings } from "@/lib/group-classes-data";
import { checkOfferTextAllowed } from "@/lib/messages-store";
import { defaultOfferPolicySettings, type Offer, type OfferFrequency } from "@/lib/offers-data";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const durationOptions = [30, 45, 60] as const;
const monthlyDurationOptions = [1, 2, 3] as const;
const frequencyOptions: { key: OfferFrequency; label: string }[] = [
  { key: "one-time", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type LearningType = "private" | "group";

/**
 * Daily = exactly 1 weekday. Weekly/Monthly = exactly `daysPerWeek` weekdays.
 * Mirrors the check a real server action would run — the Send button being
 * disabled client-side is not the only guard.
 */
function validateScheduleSelection(frequency: OfferFrequency, daysPerWeek: number, selectedDays: string[]): boolean {
  const required = frequency === "one-time" ? 1 : daysPerWeek;
  return selectedDays.length === required;
}

interface BuildRequestOfferArgs {
  learningType: LearningType;
  tutor: TutorListing;
  studentName: string;
  selectedGroupClass: { subject: string; title: string; slug: string; days: string; time: string; cohortStartDate?: string } | undefined;
  startDate: string;
  time: string;
  duration: number;
  frequency: OfferFrequency;
  daysPerWeek: number;
  monthlyDurationMonths: number;
  message: string;
  preferredDays: string[];
}

function buildRequestOffer(args: BuildRequestOfferArgs): Offer {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const expiresAtIso = new Date(nowMs + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString();
  const isGroup = args.learningType === "group";
  const groupDays = args.selectedGroupClass?.days.split(",").map((d) => d.trim()).filter(Boolean) ?? [];
  const groupTime = args.selectedGroupClass?.time.split("–")[0]?.trim() ?? "";
  return {
    id: `off-${nowMs}`,
    kind: "request",
    bookingKind: isGroup ? "group-class" : "private-lesson",
    tutorName: args.tutor.name,
    tutorSlug: args.tutor.slug,
    studentName: args.studentName,
    conversationId: `req-${args.tutor.slug}`,
    subject: isGroup ? (args.selectedGroupClass?.subject ?? args.tutor.subject) : args.tutor.subject,
    date: isGroup ? (args.selectedGroupClass?.cohortStartDate ?? nowIso.slice(0, 10)) : args.startDate,
    time: isGroup ? groupTime : args.time,
    durationMins: args.duration,
    frequency: isGroup ? "weekly" : args.frequency,
    daysPerWeek: isGroup ? groupDays.length || 1 : args.frequency === "one-time" ? 1 : args.daysPerWeek,
    lessonsCount: isGroup ? 1 : args.frequency === "monthly" ? args.daysPerWeek * args.monthlyDurationMonths * 4 : 1,
    standardPricePerSession: 0,
    discountPct: null,
    finalPricePerSession: 0,
    message: args.message.trim(),
    preferredDays: isGroup ? groupDays : args.preferredDays,
    groupClassSlug: isGroup ? args.selectedGroupClass?.slug : undefined,
    groupClassTitle: isGroup ? args.selectedGroupClass?.title : undefined,
    createdAt: nowIso,
    expiresAt: expiresAtIso,
    status: "Sent",
  };
}

export function RequestPreApprovalModal({
  open,
  tutor,
  studentName,
  onClose,
  onSent,
  onMessageTutorInstead,
}: {
  open: boolean;
  tutor: TutorListing;
  studentName: string;
  onClose: () => void;
  onSent: (offer: Offer) => void;
  onMessageTutorInstead?: () => void;
}) {
  const [learningType, setLearningType] = useState<LearningType>("private");
  const [frequency, setFrequencyState] = useState<OfferFrequency>("one-time");
  const [daysPerWeek, setDaysPerWeekState] = useState(2);
  const [monthlyDurationMonths, setMonthlyDurationMonths] = useState<(typeof monthlyDurationOptions)[number]>(1);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<(typeof durationOptions)[number]>(60);
  const [startDate, setStartDate] = useState("");
  const [message, setMessage] = useState("");
  const [groupClassSlug, setGroupClassSlug] = useState("");
  const [sent, setSent] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const tutorGroupClasses = groupClassListings.filter((c) => c.tutorName === tutor.name);
  const selectedGroupClass = tutorGroupClasses.find((c) => c.slug === groupClassSlug);

  if (!open) return null;

  const maxDays = frequency === "one-time" ? 1 : daysPerWeek;

  function setFrequency(next: OfferFrequency) {
    setFrequencyState(next);
    setSelectedDays([]);
  }

  function setDaysPerWeek(next: number) {
    setDaysPerWeekState(next);
    setSelectedDays([]);
  }

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      if (prev.length >= maxDays) return prev; // at limit — new selections are ignored, not swapped in
      return [...prev, day];
    });
  }

  const scheduleValid = validateScheduleSelection(frequency, daysPerWeek, selectedDays);

  const canSend =
    learningType === "group"
      ? !!groupClassSlug && message.trim().length > 0
      : !!startDate && !!time && message.trim().length > 0 && scheduleValid;

  function handleSend() {
    if (learningType === "private" && !validateScheduleSelection(frequency, daysPerWeek, selectedDays)) return;
    if (!canSend) return;
    const denied = checkOfferTextAllowed([message], studentName, "Student");
    if (denied && !denied.ok) {
      setBlockedMessage(denied.userMessage);
      return;
    }
    setBlockedMessage(null);
    const offer = buildRequestOffer({
      learningType,
      tutor,
      studentName,
      selectedGroupClass: selectedGroupClass
        ? { subject: selectedGroupClass.subject, title: selectedGroupClass.title, slug: selectedGroupClass.slug, days: selectedGroupClass.days, time: selectedGroupClass.time, cohortStartDate: selectedGroupClass.cohorts[0]?.startDate }
        : undefined,
      startDate,
      time,
      duration,
      frequency,
      daysPerWeek,
      monthlyDurationMonths,
      message,
      preferredDays: selectedDays,
    });
    onSent(offer);
    setSent(true);
  }

  function handleClose() {
    setSent(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="request-preapproval-title">
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="request-preapproval-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {sent ? "Request sent" : "Tell the tutor what you need"}
          </h2>
          <button type="button" onClick={handleClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        {sent ? (
          <div className="p-5">
            <p className="text-sm text-ensena-ink">Request sent to {tutor.name.split(" ")[0]}.</p>
            <p className="mt-1 text-sm text-ensena-muted">We&apos;ll let you know when the tutor responds.</p>
            <Button onClick={handleClose} className="mt-5 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex-1 p-5">
            <span className="text-xs font-medium text-ensena-muted">Learning Type</span>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setLearningType("private")}
                className={cn("flex-1 rounded-xl border px-3 py-2 text-sm font-medium", learningType === "private" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
              >
                Private Tutoring
              </button>
              <button
                type="button"
                onClick={() => setLearningType("group")}
                className={cn("flex-1 rounded-xl border px-3 py-2 text-sm font-medium", learningType === "group" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
              >
                Group Class
              </button>
            </div>

            {learningType === "private" ? (
              <>
                <label className="mt-4 flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Subject</span>
                  <input value={tutor.subject} disabled className="h-10 rounded-lg border border-ensena-border bg-ensena-bg-soft px-2.5 text-sm text-ensena-muted" />
                </label>

                <div className="mt-3">
                  <span className="text-xs font-medium text-ensena-muted">Frequency</span>
                  <div className="mt-1.5 flex gap-1.5">
                    {frequencyOptions.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFrequency(f.key)}
                        className={cn("flex-1 rounded-full border px-2.5 py-1.5 text-xs font-medium", frequency === f.key ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft")}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {frequency !== "one-time" && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-ensena-muted">How many days per week?</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setDaysPerWeek(n)}
                          className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", daysPerWeek === n ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft")}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {frequency === "monthly" && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-ensena-muted">Duration</span>
                    <div className="mt-1.5 flex gap-1.5">
                      {monthlyDurationOptions.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMonthlyDurationMonths(m)}
                          className={cn("flex-1 rounded-full border px-2.5 py-1.5 text-xs font-medium", monthlyDurationMonths === m ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft")}
                        >
                          {m} Month{m > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-ensena-muted">{frequency === "one-time" ? "Choose your day" : `Choose ${maxDays} day${maxDays > 1 ? "s" : ""}`}</span>
                    <span className="text-xs text-ensena-muted">{selectedDays.length} of {maxDays} selected</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {weekdays.map((day) => {
                      const isSelected = selectedDays.includes(day);
                      const atLimit = selectedDays.length >= maxDays && !isSelected;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          disabled={atLimit}
                          className={cn(
                            "rounded-full border px-2.5 py-1.5 text-xs font-medium disabled:opacity-40",
                            isSelected ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                          )}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Preferred time</span>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Duration</span>
                    <select value={duration} onChange={(e) => setDuration(Number(e.target.value) as (typeof durationOptions)[number])} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
                      {durationOptions.map((d) => (<option key={d} value={d}>{d} min</option>))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Start date</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm" />
                  </label>
                </div>
              </>
            ) : tutorGroupClasses.length === 0 ? (
              <div className="mt-4 rounded-xl border border-ensena-border p-4 text-center">
                <p className="text-sm text-ensena-muted">No group classes are currently available from this tutor.</p>
                <div className="mt-3 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => { handleClose(); onMessageTutorInstead?.(); }}
                    className="rounded-full border border-ensena-border px-3.5 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    Message Tutor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLearningType("private")}
                    className="rounded-full border border-ensena-border px-3.5 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    Request Private Tutoring
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-xs font-medium text-ensena-muted">Select Group Class</span>
                {tutorGroupClasses.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setGroupClassSlug(c.slug)}
                    className={cn(
                      "rounded-xl border p-3 text-left",
                      groupClassSlug === c.slug ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft"
                    )}
                  >
                    <p className="text-sm font-semibold text-ensena-ink">{c.title}</p>
                    <p className="text-xs text-ensena-muted">{c.days} · {c.time}</p>
                    <p className="mt-1 text-xs text-ensena-muted">
                      {c.maxSeats - c.enrolled} seats left · ₦{c.price.toLocaleString("en-NG")} / session
                    </p>
                  </button>
                ))}
              </div>
            )}

            {(learningType === "private" || (learningType === "group" && tutorGroupClasses.length > 0)) && (
              <>
                <label className="mt-3 flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-ensena-muted">Message to Tutor *</span>
                  <textarea
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); setBlockedMessage(null); }}
                    rows={3}
                    placeholder="Tell the tutor about your learning goals, schedule, level, or anything else they should know."
                    className="rounded-lg border border-ensena-border p-2.5 text-sm"
                  />
                </label>
                {blockedMessage && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{blockedMessage}</p>}
              </>
            )}

            {(learningType === "private" || (learningType === "group" && tutorGroupClasses.length > 0)) && (
              <>
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
                >
                  Send Request
                </Button>
                <button type="button" onClick={handleClose} className="mt-2 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
