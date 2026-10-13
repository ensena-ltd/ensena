"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, Info, Plane, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { addTutorBlockedTime, removeTutorBlockedTime, saveTutorAvailability } from "@/lib/actions/tutor-settings";
import { DAY_NAMES } from "@/lib/booking-slots";
import { platformWallTimeToMs, PLATFORM_TIMEZONE } from "@/lib/platform-time";
import type { AvailabilityDay, BlockedTimeRow, TutorAvailabilitySnapshot } from "@/lib/tutor-settings-server";
import { cn } from "@/lib/utils";

// Monday-first, like the rest of the dashboard's calendars.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const fmt = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(ms);

/** "2026-10-14" + "09:30" in Lagos time → epoch ms. */
function lagosMs(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return platformWallTimeToMs(y, m, d, hh, mm);
}

export function summarizeAvailability(days: AvailabilityDay[], vacationMode: boolean): string {
  if (vacationMode) return "Vacation Mode";
  const on = DISPLAY_ORDER.map((d) => days[d]).filter((d) => d?.enabled);
  if (on.length === 0) return "No hours set";
  return `${on.length} ${on.length === 1 ? "day" : "days"} a week`;
}

// Saved straight to tutor_weekly_availability / tutor_blocked_time /
// tutor_profiles.vacation_mode — the same records the student booking page
// reads to decide which slots it can offer.
export function LiveAvailabilityEditor({ availability }: { availability: TutorAvailabilitySnapshot }) {
  const router = useRouter();
  const [days, setDays] = useState<AvailabilityDay[]>(availability.days);
  const [vacationMode, setVacationMode] = useState(availability.vacationMode);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState<BlockedTimeRow[]>(availability.blocked);
  const [source, setSource] = useState(availability);
  if (source !== availability) {
    setSource(availability);
    setDays(availability.days);
    setVacationMode(availability.vacationMode);
    setBlocked(availability.blocked);
  }

  const dirty = vacationMode !== availability.vacationMode || JSON.stringify(days) !== JSON.stringify(availability.days);

  function patchDay(dayOfWeek: number, patch: Partial<AvailabilityDay>) {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  }

  async function save() {
    const bad = days.find((d) => d.enabled && d.end <= d.start);
    if (bad) {
      toast.error(`${DAY_NAMES[bad.dayOfWeek]}: the end time must be after the start time.`);
      return;
    }
    setSaving(true);
    const result = await saveTutorAvailability({ days, vacationMode });
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't save your availability.");
      return;
    }
    toast.success(vacationMode ? "Saved. Vacation Mode is on — students can't book new lessons until you turn it off." : "Availability saved. Students can now book you in these hours.");
    router.refresh();
  }

  // ── Blocked time ──
  const [blockDate, setBlockDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("17:00");
  const [allDay, setAllDay] = useState(true);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function addBlock() {
    if (!blockDate) {
      toast.error("Pick the date you're unavailable.");
      return;
    }
    const endDate = blockEndDate || blockDate;
    if (endDate < blockDate) {
      toast.error("The end date can't be before the start date.");
      return;
    }
    const startMs = lagosMs(blockDate, allDay ? "00:00" : blockStart);
    const endMs = allDay ? lagosMs(endDate, "00:00") + 86_400_000 : lagosMs(endDate, blockEnd);
    setBlocking(true);
    const result = await addTutorBlockedTime({ startMs, endMs, reason: blockReason });
    setBlocking(false);
    if (!result.ok || !result.id) {
      toast.error(result.message ?? "We couldn't block that time.");
      return;
    }
    setBlocked((prev) => [...prev, { id: result.id!, startMs, endMs, reason: blockReason.trim() || null }].sort((a, b) => a.startMs - b.startMs));
    setBlockDate("");
    setBlockEndDate("");
    setBlockReason("");
    toast.success("Time blocked — students can't book you then.");
  }

  async function removeBlock(id: string) {
    setRemovingId(id);
    const result = await removeTutorBlockedTime(id);
    setRemovingId(null);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't remove that blocked time.");
      return;
    }
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    toast.success("Blocked time removed.");
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Regular teaching hours</h2>
        <p className="mt-1 text-xs text-ensena-muted">
          Students can only book private lessons within the times you mark available (West Africa Time).
        </p>
        <div className={cn("mt-4 flex flex-col gap-2.5", vacationMode && "opacity-60")}>
          {DISPLAY_ORDER.map((dow) => {
            const row = days[dow];
            return (
              <div key={dow} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
                  <input type="checkbox" checked={row.enabled} onChange={(e) => patchDay(dow, { enabled: e.target.checked })} className="size-4 rounded border-ensena-border accent-ensena-primary" />
                  {DAY_NAMES[dow]}
                </label>
                {row.enabled ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input type="time" value={row.start} onChange={(e) => patchDay(dow, { start: e.target.value })} aria-label={`${DAY_NAMES[dow]} start`} className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink" />
                    <span className="text-ensena-muted">to</span>
                    <input type="time" value={row.end} onChange={(e) => patchDay(dow, { end: e.target.value })} aria-label={`${DAY_NAMES[dow]} end`} className="h-8 rounded-lg border border-ensena-border px-2 text-xs text-ensena-ink" />
                  </div>
                ) : (
                  <span className="text-xs text-ensena-muted">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>

        <div className={cn("mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed p-3", vacationMode ? "border-amber-300 bg-amber-50" : "border-ensena-border")}>
          <label className="flex items-center gap-2.5 text-sm font-medium text-ensena-ink">
            <input type="checkbox" checked={vacationMode} onChange={(e) => setVacationMode(e.target.checked)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
            <span className="flex items-center gap-1.5">
              <Plane className="size-4 text-ensena-primary" /> Vacation Mode
            </span>
          </label>
          <span className="text-right text-xs text-ensena-muted">{vacationMode ? "New bookings paused — existing lessons stay booked" : "Pauses new bookings"}</span>
        </div>

        <Button onClick={save} loading={saving} disabled={!dirty} className="mt-4 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-50">
          <Save className="size-4" /> {dirty ? "Save Availability" : "Saved"}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
            <CalendarX2 className="size-4 text-ensena-primary" /> Blocked time
          </h2>
          <p className="mt-1 text-xs text-ensena-muted">Away for a day or an afternoon? Block it here and students won&apos;t be able to book you then.</p>

          <div className="mt-3 flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
                From
                <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
                To (optional)
                <input type="date" value={blockEndDate} min={blockDate || undefined} onChange={(e) => setBlockEndDate(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-ensena-ink">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-4 rounded border-ensena-border accent-ensena-primary" />
              All day
            </label>
            {!allDay && (
              <div className="flex items-center gap-1.5 text-xs">
                <input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} aria-label="Blocked from" className="h-9 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
                <span className="text-ensena-muted">to</span>
                <input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} aria-label="Blocked until" className="h-9 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
              </div>
            )}
            <input value={blockReason} onChange={(e) => setBlockReason(e.target.value.slice(0, 120))} placeholder="Reason (only you see this)" className="h-9 rounded-lg border border-ensena-border px-3 text-sm" />
            <Button variant="outline" onClick={addBlock} loading={blocking} className="h-9 rounded-full border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
              Block this time
            </Button>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {blocked.length === 0 ? (
              <li className="rounded-xl bg-ensena-bg-soft px-3 py-4 text-center text-xs text-ensena-muted">No upcoming blocked time.</li>
            ) : (
              blocked.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ensena-ink">
                      {fmt(b.startMs)} – {fmt(b.endMs)}
                    </p>
                    {b.reason && <p className="truncate text-[11px] text-ensena-muted">{b.reason}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove blocked time"
                    disabled={removingId === b.id}
                    onClick={() => removeBlock(b.id)}
                    className="shrink-0 rounded-full p-1.5 text-ensena-muted hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="flex items-start gap-2 rounded-2xl bg-ensena-primary/5 p-4 text-xs text-ensena-ink">
          <Info className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
          Students see these hours on your profile, and they control which slots the booking page offers for new lessons and reschedules. Lessons already booked are never cancelled by changes here.
        </div>
      </div>
    </div>
  );
}
