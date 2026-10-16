"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Calendar, ChevronLeft, ChevronRight, Heart, Loader2, Lock, MessageCircle, ShieldCheck, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvailableDates, getCommonTimes } from "@/lib/actions/student-booking";
import { MONTH_WEEKS, addDaysToISO, bookingPrices, dayOfWeekISO, sessionPrice, type BookingFrequency } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import type { TutorPublicProfile } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { platformISODate } from "./learning-utils";
import { PersonAvatar, useLiveNow } from "./live-shared";
import { useSave } from "./tutor-profile-real";
import { availabilityLabel, experienceLabel, responseLabel, teachingLevels, timeRange, tutorTitle, WEEKDAY_SHORT } from "./tutor-ui";

const FREQUENCIES: { key: BookingFrequency; label: string }[] = [
  { key: "oneTime", label: "One time" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];
export const frequencyLabel: Record<BookingFrequency, string> = { oneTime: "One time", weekly: "Weekly", monthly: "Monthly" };
// Monday-first chips, as on the design.
const DAY_CHIPS = [1, 2, 3, 4, 5, 6, 0];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Sessions in the booking: one, one week's worth (weekly), or four weeks' worth (monthly). */
export function sessionCount(frequency: BookingFrequency, daysPerWeek: number): number {
  return frequency === "oneTime" ? 1 : frequency === "weekly" ? daysPerWeek : daysPerWeek * MONTH_WEEKS;
}

export function sessionsLabel(frequency: BookingFrequency, daysPerWeek: number): string {
  if (frequency === "oneTime") return "1 session";
  const perWeek = `${daysPerWeek} session${daysPerWeek === 1 ? "" : "s"}/week`;
  return frequency === "monthly" ? `${perWeek} · ${MONTH_WEEKS} weeks` : perWeek;
}

/** The first week's lesson dates: the start date plus each other chosen weekday in the 6 days after it. */
export function firstWeekDates(startISO: string, days: number[], frequency: BookingFrequency): string[] {
  if (frequency === "oneTime") return [startISO];
  return Array.from({ length: 7 }, (_, i) => addDaysToISO(startISO, i)).filter((iso) => days.includes(dayOfWeekISO(iso)));
}

export function BookTutorReal({ tutor, generatedAtMs, studentSubjects, initiallySaved = false }: { tutor: TutorPublicProfile; generatedAtMs: number; studentSubjects: string[]; initiallySaved?: boolean }) {
  const router = useRouter();
  const save = useSave(tutor.id, initiallySaved);
  const nowMs = useLiveNow(generatedAtMs);
  const todayISO = platformISODate(nowMs);
  const firstName = tutor.name.split(" ")[0];
  const preferredSubject = tutor.subjects.find((s) => studentSubjects.some((w) => w.toLowerCase() === s.toLowerCase())) ?? tutor.subjects[0] ?? "";
  const teachingDays = useMemo(() => [...new Set(tutor.weekly.map((r) => r.dayOfWeek))], [tutor.weekly]);
  const maxDaysPerWeek = Math.max(1, Math.min(5, teachingDays.length));
  const defaultDays = DAY_CHIPS.filter((d) => teachingDays.includes(d)).slice(0, Math.min(2, maxDaysPerWeek));

  const [subject, setSubject] = useState(preferredSubject);
  const [duration, setDuration] = useState(tutor.defaultDuration);
  const [frequency, setFrequency] = useState<BookingFrequency>(teachingDays.length > 1 ? "weekly" : "oneTime");
  const [daysPerWeek, setDaysPerWeek] = useState(Math.max(1, defaultDays.length));
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultDays);
  const [startISO, setStartISO] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [viewMonth, setViewMonth] = useState(todayISO.slice(0, 7));
  const [userNavigated, setUserNavigated] = useState(false);
  const [dateCache, setDateCache] = useState<Record<string, string[] | "error">>({});
  const [timeCache, setTimeCache] = useState<Record<string, string[] | "error">>({});

  const recurring = frequency !== "oneTime";
  const days = recurring ? selectedDays : startISO ? [dayOfWeekISO(startISO)] : [];
  const weekDates = startISO ? firstWeekDates(startISO, selectedDays, frequency) : [];

  // Open dates for the month on screen.
  const monthKey = `${viewMonth}|${duration}`;
  const monthDates = dateCache[monthKey];
  useEffect(() => {
    if (monthDates !== undefined) return;
    let cancelled = false;
    const [y, m] = viewMonth.split("-").map(Number);
    const from = `${viewMonth}-01` < todayISO ? todayISO : `${viewMonth}-01`;
    const to = `${viewMonth}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
    getAvailableDates({ tutorId: tutor.id, fromISO: from, toISO: to, durationMinutes: duration }).then((res) => {
      if (cancelled) return;
      setDateCache((prev) => ({ ...prev, [monthKey]: res.ok ? res.dates : "error" }));
      // First visit: skip ahead to the next month with openings.
      if (res.ok && res.dates.length === 0 && !userNavigated && viewMonth <= todayISO.slice(0, 7)) {
        setViewMonth(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [monthKey, monthDates, viewMonth, duration, tutor.id, todayISO, userNavigated]);

  // Times free on every lesson day of the first week.
  const timeKey = weekDates.length ? `${weekDates.join(",")}|${duration}` : null;
  const timeOptions = timeKey ? timeCache[timeKey] : undefined;
  useEffect(() => {
    if (!timeKey || timeOptions !== undefined) return;
    let cancelled = false;
    getCommonTimes({ tutorId: tutor.id, dates: weekDates, durationMinutes: duration }).then((res) => {
      if (!cancelled) setTimeCache((prev) => ({ ...prev, [timeKey]: res.ok ? res.times : "error" }));
    });
    return () => {
      cancelled = true;
    };
    // weekDates is derived from timeKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeKey, timeOptions, duration, tutor.id]);

  // Keep the chosen time valid as the options change (derived-state reset during render).
  const [prevOptionsKey, setPrevOptionsKey] = useState("");
  const optionsKey = `${timeKey}|${Array.isArray(timeOptions) ? timeOptions.join(",") : String(timeOptions)}`;
  if (optionsKey !== prevOptionsKey) {
    setPrevOptionsKey(optionsKey);
    if (Array.isArray(timeOptions) && !timeOptions.includes(time)) setTime(timeOptions[0] ?? "");
  }

  function changeDuration(d: number) {
    setDuration(d);
    setStartISO(null);
  }

  function changeFrequency(f: BookingFrequency) {
    setFrequency(f);
    if (f !== "oneTime" && startISO && !selectedDays.includes(dayOfWeekISO(startISO))) setStartISO(null);
  }

  function changeDaysPerWeek(n: number) {
    setDaysPerWeek(n);
    const next = selectedDays.slice(0, n);
    setSelectedDays(next);
    if (startISO && !next.includes(dayOfWeekISO(startISO))) setStartISO(null);
  }

  function toggleDay(dow: number) {
    if (!teachingDays.includes(dow)) return;
    if (selectedDays.includes(dow)) {
      setSelectedDays(selectedDays.filter((d) => d !== dow));
      if (startISO && dayOfWeekISO(startISO) === dow) setStartISO(null);
      return;
    }
    if (selectedDays.length >= daysPerWeek) return;
    setSelectedDays([...selectedDays, dow]);
  }

  const count = sessionCount(frequency, recurring ? selectedDays.length : 1);
  const perSession = tutor.pricePerHour ? sessionPrice(tutor.pricePerHour, duration) : 0;
  const total = tutor.pricePerHour ? bookingPrices(tutor.pricePerHour, duration, frequency, count).total : 0;
  const daysComplete = !recurring || selectedDays.length === daysPerWeek;
  const canContinue = daysComplete && Boolean(startISO) && Boolean(time) && Boolean(subject);

  function goToReview() {
    if (!canContinue || !startISO) return;
    const params = new URLSearchParams({
      subject,
      duration: String(duration),
      frequency,
      days: [...days].sort((a, b) => DAY_CHIPS.indexOf(a) - DAY_CHIPS.indexOf(b)).join(","),
      start: startISO,
      time,
    });
    router.push(`/student-dashboard/tutors/${tutor.id}/book/review?${params}`);
  }

  // Calendar grid for viewMonth.
  const [vy, vm] = viewMonth.split("-").map(Number);
  const firstDow = new Date(Date.UTC(vy, vm - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(vy, vm, 0)).getUTCDate();
  const openDates = Array.isArray(monthDates) ? new Set(monthDates) : new Set<string>();
  const shiftMonth = (delta: number) => {
    setUserNavigated(true);
    setViewMonth(new Date(Date.UTC(vy, vm - 1 + delta, 1)).toISOString().slice(0, 7));
  };
  const avail = availabilityLabel(tutor, nowMs);
  const reviews = tutor.reviews.slice(0, 3);

  // Shared by the desktop sidebar and the mobile layout.
  const calendar = (
    <>
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" disabled={viewMonth <= todayISO.slice(0, 7)} onClick={() => shiftMonth(-1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <p className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
          {MONTHS[vm - 1]} {vy}
          {monthDates === undefined && <Loader2 className="size-3.5 animate-spin text-ensena-muted" />}
        </p>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-ensena-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const iso = `${viewMonth}-${String(i + 1).padStart(2, "0")}`;
          const weekdayOk = !recurring || selectedDays.includes(dayOfWeekISO(iso));
          const clickable = openDates.has(iso) && weekdayOk;
          const isSelected = startISO === iso;
          return (
            <button
              key={iso}
              type="button"
              disabled={!clickable}
              onClick={() => setStartISO(iso)}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-sm",
                isSelected ? "bg-ensena-primary text-white" : clickable ? "text-ensena-ink hover:bg-ensena-bg-soft" : "cursor-not-allowed text-ensena-border"
              )}
            >
              {i + 1}
              {iso === todayISO && !isSelected && <span className="absolute bottom-0.5 size-1 rounded-full bg-ensena-primary" />}
            </button>
          );
        })}
      </div>
      {monthDates === "error" && <p className="mt-2 text-center text-xs text-rose-600">We couldn&apos;t load {firstName}&apos;s calendar. Please refresh.</p>}
      {Array.isArray(monthDates) && monthDates.length === 0 && <p className="mt-2 text-center text-xs text-ensena-muted">No open {duration}-minute slots this month.</p>}
    </>
  );

  const timeSelect = (triggerClassName: string) => (
    <Select value={time} onValueChange={(v) => v && setTime(v)} disabled={!Array.isArray(timeOptions) || timeOptions.length === 0}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue>
          {() =>
            !startISO
              ? "Pick a start date first"
              : timeOptions === undefined
                ? "Checking times…"
                : timeOptions === "error"
                  ? "Couldn't load times"
                  : timeOptions.length === 0
                    ? "No shared time — try other days"
                    : timeRange(time, duration)
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Array.isArray(timeOptions) &&
          timeOptions.map((t) => (
            <SelectItem key={t} value={t}>
              {timeRange(t, duration)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );

  const blockedReason = !daysComplete
    ? `Select ${daysPerWeek - selectedDays.length} more day${daysPerWeek - selectedDays.length === 1 ? "" : "s"} to continue.`
    : !startISO
      ? "Select a start date to continue."
      : "Select a preferred time to continue.";
  const sessionsText = sessionsLabel(frequency, recurring ? selectedDays.length : 1);
  const optionClass = (on: boolean) => cn("rounded-xl border px-2 py-3 text-center text-sm font-medium", on ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink");

  return (
    <>
    {/* Mobile (below lg, where the bottom tab bar shows): the single-scroll
        mobile booking design with a sticky Continue bar. Same state and
        live availability as the desktop sidebar below. */}
    <div className="pb-40 lg:hidden">
      <header className="sticky top-[61px] z-30 -mx-4 -mt-4 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-2 sm:-mx-6 sm:-mt-6">
        <Link href={`/student-dashboard/tutors/${tutor.id}`} aria-label="Back to tutor profile" className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="font-heading text-base font-semibold text-ensena-ink">Book a session</h1>
        <button
          type="button"
          aria-pressed={save.saved}
          aria-label={save.saved ? "Remove from saved" : "Save tutor"}
          disabled={save.pending}
          onClick={save.toggle}
          className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Heart className={cn("size-5", save.saved && "fill-ensena-primary text-ensena-primary")} />
        </button>
      </header>

      <div className="pt-4">
        <div className="flex items-center gap-4">
          <PersonAvatar name={tutor.name} image={tutor.image} className="size-24 rounded-xl text-3xl" />
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-heading text-lg font-semibold text-ensena-ink">
              <span className="truncate">{tutor.name}</span> <BadgeCheck className="size-4.5 shrink-0 text-ensena-primary" aria-label="Verified tutor" />
            </p>
            <p className="text-sm text-ensena-muted">{tutorTitle(tutor)}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {tutor.rating !== null ? (
                <>
                  <span className="font-medium">{tutor.rating}</span>
                  <span className="text-ensena-muted">({tutor.reviewCount} reviews)</span>
                </>
              ) : (
                <span className="text-ensena-muted">New tutor</span>
              )}
            </p>
            {avail.today && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-ensena-success">
                <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
              </p>
            )}
          </div>
        </div>

        <MobileAbout tutor={tutor} firstName={firstName} />

        <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...tutor.subjects, ...teachingLevels(tutor), ...tutor.exams].filter((v, i, all) => all.indexOf(v) === i).map((tag) => (
              <span key={tag} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">What students say</h2>
            <Link href={`/student-dashboard/tutors/${tutor.id}#reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
              View all reviews
            </Link>
          </div>
          {tutor.reviews.length === 0 ? (
            <p className="mt-3 rounded-xl border border-ensena-border bg-ensena-surface p-4 text-sm text-ensena-muted">No reviews yet. Be one of the first students to learn with {firstName}.</p>
          ) : (
            <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
              {tutor.reviews.slice(0, 6).map((review) => (
                <div key={review.id} className="w-[80%] shrink-0 snap-start rounded-xl border border-ensena-border bg-ensena-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ensena-ink">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" /> {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-4 text-xs text-ensena-muted">{review.comment || "No comment."}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ensena-primary/5 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
            <p className="mt-0.5 text-xs text-ensena-muted">Payment is held in escrow and released to the tutor only after your session.</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Customize your session</h2>

          {tutor.subjects.length > 1 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ensena-ink">Subject</p>
              <p className="text-xs text-ensena-muted">What would you like to learn?</p>
              <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
                <SelectTrigger className="mt-2 h-12 w-full rounded-xl border-ensena-border px-3 text-sm font-medium text-ensena-ink">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tutor.subjects.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4">
            <p className="text-sm font-semibold text-ensena-ink">Duration</p>
            <p className="text-xs text-ensena-muted">Length of each session</p>
            <div className={cn("mt-2 grid gap-2", tutor.classDurations.length > 3 ? "grid-cols-4" : "grid-cols-3")}>
              {tutor.classDurations.map((d) => (
                <button key={d} type="button" onClick={() => changeDuration(d)} className={optionClass(duration === d)}>
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ensena-ink">Frequency</p>
            <p className="text-xs text-ensena-muted">How often do you want lessons?</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {FREQUENCIES.map((f) => (
                <button key={f.key} type="button" onClick={() => changeFrequency(f.key)} className={optionClass(frequency === f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {recurring && (
            <div className="mt-5">
              <p className="text-sm font-semibold text-ensena-ink">How many days per week?</p>
              <p className="text-xs text-ensena-muted">Choose exactly this many days below</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: maxDaysPerWeek }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => changeDaysPerWeek(n)}
                    className={cn("flex size-10 items-center justify-center rounded-lg border text-sm font-medium", daysPerWeek === n ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-sm font-semibold text-ensena-ink">Select days</p>
              <p className="text-xs text-ensena-muted">
                {selectedDays.length} of {daysPerWeek} days selected
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_CHIPS.map((dow) => {
                  const disabled = !teachingDays.includes(dow);
                  const isSelected = selectedDays.includes(dow);
                  const capReached = !isSelected && selectedDays.length >= daysPerWeek;
                  return (
                    <button
                      key={dow}
                      type="button"
                      disabled={disabled || capReached}
                      onClick={() => toggleDay(dow)}
                      title={disabled ? `${firstName} doesn't teach on this day` : undefined}
                      className={cn(
                        "flex h-10 min-w-[3rem] flex-col items-center justify-center gap-0 rounded-lg border px-2.5 text-sm font-medium leading-tight",
                        disabled
                          ? "cursor-not-allowed border-ensena-border text-ensena-border"
                          : isSelected
                            ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                            : capReached
                              ? "cursor-not-allowed border-ensena-border text-ensena-muted"
                              : "border-ensena-border text-ensena-ink"
                      )}
                    >
                      {WEEKDAY_SHORT[dow]}
                      {disabled && <span className="text-[8px] leading-none">Unavailable</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="text-sm font-semibold text-ensena-ink">Start date</p>
            <p className="text-xs text-ensena-muted">{recurring ? "When should your first session happen?" : "When should this session happen?"}</p>
            <div className="mt-2 rounded-2xl border border-ensena-border bg-ensena-surface p-3">{calendar}</div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-ensena-ink">Preferred time</p>
            <p className="text-xs text-ensena-muted">{recurring && weekDates.length > 1 ? "Free on every day you picked" : "Your preferred time"}</p>
            {timeSelect("mt-2 h-12 w-full rounded-full border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink")}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Number of sessions</p>
              <p className="text-xs text-ensena-muted">{recurring ? "Based on the days you selected" : "A single session"}</p>
            </div>
            <span className="text-right font-semibold text-ensena-ink">{sessionsText}</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-ensena-bg-soft p-4">
          <h3 className="text-sm font-semibold text-ensena-ink">Booking summary</h3>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            {[
              ["Subject", subject],
              ["Duration", `${duration} min`],
              ["Frequency", frequencyLabel[frequency]],
              ...(recurring ? [["Days", selectedDays.length ? DAY_CHIPS.filter((d) => selectedDays.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ") : "Not selected"]] : []),
              ["Sessions", sessionsText],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-ensena-muted">{label}</dt>
                <dd className="text-right font-medium text-ensena-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
            <span className="text-sm font-semibold text-ensena-ink">Total amount</span>
            <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
          </div>
          <p className="mt-1 text-xs text-ensena-muted">
            {formatNaira(perSession)} per session{frequency === "monthly" ? " · monthly plan discount applied" : ""}
          </p>
        </div>
      </div>

      {/* Sticky Continue bar — just above the dashboard's bottom tab bar. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md">
        {!canContinue && <p className="mb-2 text-center text-xs font-medium text-rose-600">{blockedReason}</p>}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ensena-ink">{formatNaira(total)}</p>
            <p className="text-xs text-ensena-muted">
              {sessionsText} · {frequencyLabel[frequency]}
            </p>
          </div>
          <Button disabled={!canContinue} onClick={goToReview} className="h-12 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50">
            Continue to Payment →
          </Button>
        </div>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-ensena-muted">
          <Lock className="size-3" /> You won&apos;t be charged yet
        </p>
      </div>
    </div>

    <div className="hidden lg:block">
      <Link href={`/student-dashboard/tutors/${tutor.id}`} className="flex w-fit items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
        <ChevronLeft className="size-4" /> Back to tutor profile
      </Link>

      <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">Book a session with {tutor.name}</h1>
          <p className="text-sm text-ensena-muted">{tutorTitle(tutor)}</p>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-ensena-ink">
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{tutor.rating ?? "New"}</span>
          </span>
          <span className="text-ensena-muted">({tutor.reviewCount} reviews)</span>
          <span className="flex items-center gap-1 rounded-full bg-ensena-success/10 px-2 py-0.5 text-xs font-semibold text-ensena-success">
            <ShieldCheck className="size-3" /> Verified Teacher
          </span>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        <div className="flex flex-col gap-5">
          {/* Tutor */}
          <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:flex-row lg:p-6">
            <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl bg-ensena-primary/5 sm:h-auto sm:min-h-40 sm:w-40">
              <PersonAvatar name={tutor.name} image={tutor.image} className={cn("absolute inset-0 size-full rounded-none", !tutor.image && "text-5xl")} />
              {avail.today && (
                <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-ensena-success">
                  <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
              <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm text-ensena-muted">{tutor.bio || tutor.headline}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
                <li className="flex items-center gap-2">
                  <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {experienceLabel(tutor.yearsExperience)}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.completedLessons}+ lessons taught
                </li>
                <li className="flex items-center gap-2">
                  <BadgeCheck className="size-3.5 shrink-0 text-ensena-primary" /> Expert in {[...teachingLevels(tutor), ...tutor.exams].join(", ")}
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="size-3.5 shrink-0 text-ensena-primary" /> {responseLabel(tutor.responseTime)}
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...tutor.subjects, ...teachingLevels(tutor), ...tutor.exams].filter((v, i, all) => all.indexOf(v) === i).map((tag) => (
                <span key={tag} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">What students say</h2>
              <Link href={`/student-dashboard/tutors/${tutor.id}#reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
                View all reviews
              </Link>
            </div>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-ensena-muted">No reviews yet. Be one of the first students to learn with {firstName}.</p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border border-ensena-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
                        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-ensena-ink">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {review.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 text-xs text-ensena-muted">{review.comment || "No comment."}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  {reviews.map((r, i) => (
                    <span key={r.id} className={i === 0 ? "size-1.5 rounded-full bg-ensena-primary" : "size-1.5 rounded-full bg-ensena-border"} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-ensena-primary/5 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Your payment is protected</p>
              <p className="mt-0.5 text-xs text-ensena-muted">Payment is held in escrow and released to the tutor only after your session.</p>
            </div>
          </div>
        </div>

        {/* Customize your session */}
        <aside className="h-fit lg:sticky lg:top-6">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 shadow-sm lg:p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink lg:text-lg">Customize your session</h2>

            {tutor.subjects.length > 1 && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-ensena-ink">Subject</p>
                <p className="text-xs text-ensena-muted">What would you like to learn?</p>
                <Select value={subject} onValueChange={(v) => v && setSubject(v)}>
                  <SelectTrigger className="mt-2 h-11 w-full rounded-xl border-ensena-border px-3 text-sm font-medium text-ensena-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tutor.subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-5">
              <p className="text-sm font-semibold text-ensena-ink">Duration</p>
              <p className="text-xs text-ensena-muted">Length of each session</p>
              <div className={cn("mt-2 grid gap-2", tutor.classDurations.length > 3 ? "grid-cols-4" : "grid-cols-3")}>
                {tutor.classDurations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => changeDuration(d)}
                    className={cn("rounded-xl border px-2 py-2.5 text-center text-sm font-medium", duration === d ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-ensena-ink">Frequency</p>
              <p className="text-xs text-ensena-muted">How often do you want lessons?</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => changeFrequency(f.key)}
                    className={cn("rounded-xl border px-2 py-2.5 text-center text-sm font-medium", frequency === f.key ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {recurring && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-ensena-ink">How many days per week?</p>
                <p className="text-xs text-ensena-muted">Choose exactly this many days below</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from({ length: maxDaysPerWeek }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => changeDaysPerWeek(n)}
                      className={cn("flex size-9 items-center justify-center rounded-lg border text-xs font-medium", daysPerWeek === n ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-sm font-semibold text-ensena-ink">Select days</p>
                <p className="text-xs text-ensena-muted">
                  {selectedDays.length} of {daysPerWeek} days selected
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DAY_CHIPS.map((dow) => {
                    const disabled = !teachingDays.includes(dow);
                    const isSelected = selectedDays.includes(dow);
                    const capReached = !isSelected && selectedDays.length >= daysPerWeek;
                    return (
                      <button
                        key={dow}
                        type="button"
                        disabled={disabled || capReached}
                        onClick={() => toggleDay(dow)}
                        title={disabled ? `${firstName} doesn't teach on this day` : undefined}
                        className={cn(
                          "flex h-9 min-w-11 flex-col items-center justify-center rounded-lg border px-2 text-xs leading-tight font-medium",
                          disabled
                            ? "cursor-not-allowed border-ensena-border text-ensena-border"
                            : isSelected
                              ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary"
                              : capReached
                                ? "cursor-not-allowed border-ensena-border text-ensena-muted"
                                : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                        )}
                      >
                        {WEEKDAY_SHORT[dow]}
                        {disabled && <span className="text-[8px] leading-none">Unavailable</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="text-sm font-semibold text-ensena-ink">Start date</p>
              <p className="text-xs text-ensena-muted">{recurring ? "When should your first session happen?" : "When should this session happen?"}</p>
              <div className="mt-2 rounded-xl border border-ensena-border p-3">{calendar}</div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-ensena-ink">Preferred time</p>
              <p className="text-xs text-ensena-muted">{recurring && weekDates.length > 1 ? "Free on every day you picked" : "Your preferred time"}</p>
              {timeSelect("mt-2 h-11 w-full rounded-xl border-ensena-border px-3 text-sm font-medium text-ensena-ink")}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Number of sessions</p>
                <p className="text-xs text-ensena-muted">{recurring ? "Based on the days you selected" : "A single session"}</p>
              </div>
              <span className="text-right font-semibold text-ensena-ink">{sessionsLabel(frequency, recurring ? selectedDays.length : 1)}</span>
            </div>

            <div className="mt-6 rounded-xl bg-ensena-bg-soft p-4">
              <h3 className="text-sm font-semibold text-ensena-ink">Booking summary</h3>
              <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ensena-muted">Subject</dt>
                  <dd className="text-right font-medium text-ensena-ink">{subject}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ensena-muted">Duration</dt>
                  <dd className="font-medium text-ensena-ink">{duration} min</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ensena-muted">Frequency</dt>
                  <dd className="font-medium text-ensena-ink">{frequencyLabel[frequency]}</dd>
                </div>
                {recurring && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ensena-muted">Days</dt>
                    <dd className="text-right font-medium text-ensena-ink">{selectedDays.length ? DAY_CHIPS.filter((d) => selectedDays.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ") : "Not selected"}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-ensena-muted">Sessions</dt>
                  <dd className="text-right font-medium text-ensena-ink">{sessionsLabel(frequency, recurring ? selectedDays.length : 1)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                <span className="text-sm font-semibold text-ensena-ink">Total amount</span>
                <span className="text-lg font-semibold text-ensena-primary">{formatNaira(total)}</span>
              </div>
              <p className="mt-1 text-xs text-ensena-muted">
                {formatNaira(perSession)} per session{frequency === "monthly" ? " · monthly plan discount applied" : ""}
              </p>
            </div>

            <Button
              disabled={!canContinue}
              onClick={goToReview}
              className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary-hover disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Continue to Payment →
            </Button>
            {!canContinue && (
              <p className="mt-2 text-center text-xs font-medium text-rose-600">
                {!daysComplete
                  ? `Select ${daysPerWeek - selectedDays.length} more day${daysPerWeek - selectedDays.length === 1 ? "" : "s"} to continue.`
                  : !startISO
                    ? "Select a start date to continue."
                    : "Select a preferred time to continue."}
              </p>
            )}
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ensena-muted">
              <Lock className="size-3.5" /> You won&apos;t be charged yet
            </p>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}

// Mobile "About" card: three-line bio with Read more, then the quick facts.
function MobileAbout({ tutor, firstName }: { tutor: TutorPublicProfile; firstName: string }) {
  const [expanded, setExpanded] = useState(false);
  const bio = tutor.bio || tutor.headline;
  return (
    <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
      <p className={cn("mt-1.5 whitespace-pre-line text-sm text-ensena-muted", !expanded && "line-clamp-3")}>{bio || `${firstName} hasn't written an introduction yet.`}</p>
      {bio && bio.length > 120 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 flex items-center gap-1 text-sm font-semibold text-ensena-primary">
          {expanded ? "Show less" : "Read more"}
          <ChevronRight className={cn("size-3.5 transition-transform", expanded ? "-rotate-90" : "rotate-90")} />
        </button>
      )}
      <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
        <li className="flex items-center gap-2">
          <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {experienceLabel(tutor.yearsExperience)}
        </li>
        <li className="flex items-center gap-2">
          <Users className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.completedLessons}+ lessons taught
        </li>
        <li className="flex items-start gap-2">
          <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" /> Expert in {[...teachingLevels(tutor), ...tutor.exams].join(", ") || "all levels"}
        </li>
        <li className="flex items-center gap-2">
          <MessageCircle className="size-3.5 shrink-0 text-ensena-primary" /> {responseLabel(tutor.responseTime)}
        </li>
      </ul>
    </div>
  );
}
