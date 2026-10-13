"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Check, Lock, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createPrivateBooking, getBookableSlots, startBookingCheckout } from "@/lib/actions/student-booking";
import { MAX_WEEKS, MONTH_WEEKS, MONTHLY_SAVE_PCT, addDaysToISO, bookingPrices, dayOfWeekISO, sessionPrice, type BookingFrequency, type Slot } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { formatLongDate, formatTime, platformISODate } from "./learning-utils";
import { PersonAvatar, useLiveNow } from "./live-shared";

const DAYS_SHOWN = 28;
const FREQUENCIES: { key: BookingFrequency; label: string; hint: string }[] = [
  { key: "oneTime", label: "One lesson", hint: "A single session" },
  { key: "weekly", label: "Weekly", hint: "Same times every week" },
  { key: "monthly", label: "Monthly plan", hint: `4 weeks · save ${MONTHLY_SAVE_PCT}%` },
];

export function BookTutorReal({ tutor, generatedAtMs, studentSubjects }: { tutor: TutorPublicProfile; generatedAtMs: number; studentSubjects: string[] }) {
  const router = useRouter();
  const nowMs = useLiveNow(generatedAtMs);
  const todayISO = platformISODate(nowMs);
  const preferredSubject = tutor.subjects.find((s) => studentSubjects.some((w) => w.toLowerCase() === s.toLowerCase())) ?? tutor.subjects[0] ?? "";

  const [subject, setSubject] = useState(preferredSubject);
  const [duration, setDuration] = useState(tutor.defaultDuration);
  const [frequency, setFrequency] = useState<BookingFrequency>("oneTime");
  const [weeks, setWeeks] = useState(4);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot[]>([]);
  const [notes, setNotes] = useState("");
  const [slotCache, setSlotCache] = useState<Record<string, Slot[] | "error">>({});
  const [submitting, startSubmit] = useTransition();
  const [step, setStep] = useState<"idle" | "booking" | "paying">("idle");

  const teachingDays = useMemo(() => new Set(tutor.weekly.map((r) => r.dayOfWeek)), [tutor.weekly]);
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDaysToISO(todayISO, i)), [todayISO]);
  const firstSelectedISO = selected.length ? platformISODate(selected[0].startMs) : null;
  const recurring = frequency !== "oneTime";
  const weekWindowEnd = firstSelectedISO ? addDaysToISO(firstSelectedISO, 6) : null;

  const cacheKey = dateISO ? `${dateISO}|${duration}` : null;
  const slots = cacheKey ? slotCache[cacheKey] : undefined;

  useEffect(() => {
    if (!dateISO || !cacheKey || slotCache[cacheKey] !== undefined) return;
    let cancelled = false;
    getBookableSlots({ tutorId: tutor.id, dateISO, durationMinutes: duration }).then((res) => {
      if (!cancelled) setSlotCache((prev) => ({ ...prev, [cacheKey]: res.ok ? res.slots : "error" }));
    });
    return () => {
      cancelled = true;
    };
  }, [dateISO, duration, cacheKey, slotCache, tutor.id]);

  const sessionCount = selected.length * (frequency === "oneTime" ? 1 : frequency === "monthly" ? MONTH_WEEKS : weeks);
  const pricing = tutor.pricePerHour ? bookingPrices(tutor.pricePerHour, duration, frequency, sessionCount) : null;
  const perSession = tutor.pricePerHour ? sessionPrice(tutor.pricePerHour, duration) : 0;

  function changeDuration(d: number) {
    setDuration(d);
    setSelected([]);
  }

  function changeFrequency(f: BookingFrequency) {
    setFrequency(f);
    if (f === "oneTime" && selected.length > 1) setSelected(selected.slice(0, 1));
  }

  function toggleSlot(slot: Slot) {
    const isSelected = selected.some((s) => s.startMs === slot.startMs);
    if (isSelected) {
      setSelected(selected.filter((s) => s.startMs !== slot.startMs));
      return;
    }
    if (!recurring) {
      setSelected([slot]);
      return;
    }
    const next = [...selected, slot].sort((a, b) => a.startMs - b.startMs);
    if (next[next.length - 1].startMs - next[0].startMs >= 7 * 86_400_000) {
      toast.error("For a weekly plan, pick your lesson times within one week. They'll repeat every week after that.");
      return;
    }
    if (next.some((s, i) => i > 0 && s.startMs < next[i - 1].endMs)) {
      toast.error("That time overlaps another lesson you picked.");
      return;
    }
    setSelected(next);
  }

  function book() {
    if (!subject || selected.length === 0) return;
    startSubmit(async () => {
      setStep("booking");
      const created = await createPrivateBooking({
        tutorId: tutor.id,
        subject,
        durationMinutes: duration,
        frequency,
        weeks,
        startTimes: selected.map((s) => s.startMs),
        notes,
      });
      if (!created.ok || !created.bookingGroupId) {
        setStep("idle");
        toast.error(created.message ?? "We couldn't create your booking.");
        // Availability changed under us — refetch.
        setSlotCache({});
        setSelected([]);
        return;
      }
      setStep("paying");
      const checkout = await startBookingCheckout(created.bookingGroupId);
      if (!checkout.ok || !checkout.url) {
        setStep("idle");
        toast.error(checkout.message ?? "We couldn't start the payment.", { duration: 8000 });
        router.push("/student-dashboard/lessons?tab=Upcoming");
        return;
      }
      window.location.assign(checkout.url);
    });
  }

  return (
    <div>
      <Link href={`/student-dashboard/tutors/${tutor.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Back to {tutor.name.split(" ")[0]}&apos;s profile
      </Link>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">Book a lesson with {tutor.name}</h1>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 1. Lesson details */}
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">1. Lesson details</h2>
            <label className="mt-4 flex flex-col gap-1.5 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Subject</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-11 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
                {tutor.subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <p className="mt-4 text-xs font-medium text-ensena-muted">Lesson length</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {tutor.classDurations.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => changeDuration(d)}
                  className={cn("rounded-full border px-4 py-2 text-sm font-medium", duration === d ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
                >
                  {d} min · {tutor.pricePerHour ? formatNaira(sessionPrice(tutor.pricePerHour, d)) : "—"}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium text-ensena-muted">How often</p>
            <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => changeFrequency(f.key)}
                  className={cn("rounded-xl border p-3 text-left", frequency === f.key ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft")}
                >
                  <span className={cn("block text-sm font-semibold", frequency === f.key ? "text-ensena-primary" : "text-ensena-ink")}>{f.label}</span>
                  <span className="block text-xs text-ensena-muted">{f.hint}</span>
                </button>
              ))}
            </div>
            {frequency === "weekly" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-ensena-ink">
                For
                <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="h-9 rounded-lg border border-ensena-border bg-ensena-surface px-2 text-sm">
                  {Array.from({ length: MAX_WEEKS }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                {weeks === 1 ? "week" : "weeks"}
              </label>
            )}
          </section>

          {/* 2. Time */}
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">2. Pick {recurring ? "your lesson times for the first week" : "a time"}</h2>
            <p className="mt-0.5 text-xs text-ensena-muted">
              {recurring ? "Pick one or more times within a week. Each repeats weekly. " : ""}All times are West Africa Time (Lagos).
            </p>
            {teachingDays.size === 0 ? (
              <p className="mt-4 rounded-xl bg-ensena-bg-soft p-4 text-sm text-ensena-muted">{tutor.name.split(" ")[0]} hasn&apos;t set any teaching hours yet.</p>
            ) : (
              <>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
                  {days.map((iso) => {
                    const teaches = teachingDays.has(dayOfWeekISO(iso));
                    const outsideWeek = recurring && weekWindowEnd !== null && firstSelectedISO !== null && (iso < firstSelectedISO || iso > weekWindowEnd);
                    const disabled = !teaches || outsideWeek;
                    const ms = Date.parse(`${iso}T12:00:00Z`);
                    const picked = selected.filter((s) => platformISODate(s.startMs) === iso).length;
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={disabled}
                        onClick={() => setDateISO(iso)}
                        className={cn(
                          "relative flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs",
                          dateISO === iso ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft",
                          disabled && "cursor-not-allowed opacity-35 hover:bg-transparent"
                        )}
                      >
                        <span className="font-medium">{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(ms)}</span>
                        <span className="text-base font-semibold">{iso.slice(8)}</span>
                        <span className={dateISO === iso ? "text-white/80" : "text-ensena-muted"}>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(ms)}</span>
                        {picked > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{picked}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 min-h-16">
                  {!dateISO ? (
                    <p className="flex items-center gap-2 text-sm text-ensena-muted">
                      <CalendarDays className="size-4" /> Choose a day to see open times.
                    </p>
                  ) : slots === undefined ? (
                    <p className="flex items-center gap-2 text-sm text-ensena-muted">
                      <Loader2 className="size-4 animate-spin" /> Checking {tutor.name.split(" ")[0]}&apos;s calendar…
                    </p>
                  ) : slots === "error" ? (
                    <p className="text-sm text-rose-600">We couldn&apos;t load times for this day. Please try again.</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-ensena-muted">No open {duration}-minute slots on {formatLongDate(Date.parse(`${dateISO}T12:00:00Z`))}. Try another day.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s) => {
                        const isSel = selected.some((x) => x.startMs === s.startMs);
                        return (
                          <button
                            key={s.startMs}
                            type="button"
                            onClick={() => toggleSlot(s)}
                            className={cn("flex items-center gap-1 rounded-full border px-3.5 py-2 text-sm font-medium", isSel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-ensena-border text-ensena-ink hover:border-ensena-primary/50")}
                          >
                            {isSel && <Check className="size-3.5" />}
                            {formatTime(s.startMs)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* 3. Notes */}
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">3. Anything your tutor should know? (optional)</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Topics you'd like to cover, upcoming exams, how you learn best…"
              className="mt-3 w-full rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink outline-none focus:border-ensena-primary/50"
            />
          </section>
        </div>

        <aside>
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <PersonAvatar name={tutor.name} image={tutor.image} className="size-11" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{tutor.name}</p>
                <p className="truncate text-xs text-ensena-muted">{subject}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
              {selected.length === 0 ? (
                <p className="text-ensena-muted">No time picked yet.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {selected.map((s) => (
                    <li key={s.startMs} className="flex items-center justify-between gap-2">
                      <span className="text-ensena-ink">
                        {formatLongDate(s.startMs)} · {formatTime(s.startMs)}
                      </span>
                      <button type="button" aria-label="Remove" onClick={() => toggleSlot(s)} className="text-ensena-muted hover:text-rose-600">
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {recurring && selected.length > 0 && (
                <p className="text-xs text-ensena-muted">
                  Repeats weekly for {frequency === "monthly" ? MONTH_WEEKS : weeks} {(frequency === "monthly" ? MONTH_WEEKS : weeks) === 1 ? "week" : "weeks"}.
                </p>
              )}
            </div>
            {pricing && sessionCount > 0 && (
              <div className="mt-4 flex flex-col gap-1.5 border-t border-ensena-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-ensena-muted">
                    {sessionCount} × {duration} min @ {formatNaira(perSession)}
                  </span>
                  <span className="text-ensena-ink">{formatNaira(perSession * sessionCount)}</span>
                </div>
                {frequency === "monthly" && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Monthly plan discount</span>
                    <span>−{formatNaira(perSession * sessionCount - pricing.total)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-ensena-border pt-2 font-semibold text-ensena-ink">
                  <span>Total</span>
                  <span>{formatNaira(pricing.total)}</span>
                </div>
              </div>
            )}
            <Button onClick={book} loading={submitting} disabled={selected.length === 0 || !subject} className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              {step === "booking" ? "Reserving your time…" : step === "paying" ? "Opening Paystack…" : pricing && sessionCount > 0 ? `Pay ${formatNaira(pricing.total)}` : "Continue to payment"}
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-ensena-muted">
              <Lock className="size-3.5" /> Secure payment with Paystack. Your time is held for 30 minutes while you pay.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
