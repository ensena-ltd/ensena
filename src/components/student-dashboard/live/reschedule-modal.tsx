"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { getBookableSlots, reschedulePrivateLesson } from "@/lib/actions/student-booking";
import { addDaysToISO, type Slot } from "@/lib/booking-slots";
import type { LearningSession } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import { formatLongDate, formatTime, platformISODate } from "./learning-utils";

const DAYS_SHOWN = 21;

/** Move a private lesson to another open slot in the tutor's real calendar. */
export function RescheduleModal({ session, nowMs, onClose }: { session: LearningSession | null; nowMs: number; onClose: () => void }) {
  const router = useRouter();
  const todayISO = platformISODate(nowMs);
  const [dateISO, setDateISO] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, Slot[] | "error">>({});
  const [picked, setPicked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const [openFor, setOpenFor] = useState<string | null>(null);
  if ((session?.id ?? null) !== openFor) {
    setOpenFor(session?.id ?? null);
    setDateISO(session ? platformISODate(session.startMs) : null);
    setSlots({});
    setPicked(null);
  }

  useEffect(() => {
    if (!session?.personId || !dateISO || slots[dateISO] !== undefined) return;
    let cancelled = false;
    getBookableSlots({ tutorId: session.personId, dateISO, durationMinutes: session.durationMinutes, excludeLessonId: session.id }).then((res) => {
      if (!cancelled) setSlots((prev) => ({ ...prev, [dateISO]: res.ok ? res.slots : "error" }));
    });
    return () => {
      cancelled = true;
    };
  }, [session, dateISO, slots]);

  function confirm() {
    if (!session || picked === null) return;
    startTransition(async () => {
      const result = await reschedulePrivateLesson(session.id, picked);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't move this lesson.");
        setSlots({});
        setPicked(null);
        return;
      }
      toast.success(`Moved to ${formatLongDate(picked)} at ${formatTime(picked)}. ${session.personName} has been notified.`);
      onClose();
      router.refresh();
    });
  }

  const daySlots = dateISO ? slots[dateISO] : undefined;

  return (
    <Modal open={!!session} onClose={onClose} title="Reschedule lesson" widthClassName="sm:max-w-lg">
      {session && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ensena-muted">
            {session.title} with {session.personName} · currently {formatLongDate(session.startMs)} at {formatTime(session.startMs)}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: DAYS_SHOWN }, (_, i) => addDaysToISO(todayISO, i)).map((iso) => {
              const ms = Date.parse(`${iso}T12:00:00Z`);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => {
                    setDateISO(iso);
                    setPicked(null);
                  }}
                  className={cn("flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-xs", dateISO === iso ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
                >
                  <span>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(ms)}</span>
                  <span className="text-sm font-semibold">{iso.slice(8)}</span>
                </button>
              );
            })}
          </div>
          <div className="min-h-12">
            {daySlots === undefined ? (
              <p className="flex items-center gap-2 text-sm text-ensena-muted">
                <Loader2 className="size-4 animate-spin" /> Checking availability…
              </p>
            ) : daySlots === "error" ? (
              <p className="text-sm text-rose-600">We couldn&apos;t load times for this day.</p>
            ) : daySlots.length === 0 ? (
              <p className="text-sm text-ensena-muted">No open times on this day. Try another.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {daySlots.map((s) => (
                  <button
                    key={s.startMs}
                    type="button"
                    onClick={() => setPicked(s.startMs)}
                    className={cn("flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium", picked === s.startMs ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-ensena-border text-ensena-ink hover:border-ensena-primary/50")}
                  >
                    {picked === s.startMs && <Check className="size-3.5" />}
                    {formatTime(s.startMs)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-ensena-muted">Lessons can be moved up to 2 hours before they start. Times are West Africa Time (Lagos).</p>
          <Button onClick={confirm} loading={pending} disabled={picked === null} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            {picked === null ? "Pick a new time" : `Move to ${formatLongDate(picked)} · ${formatTime(picked)}`}
          </Button>
        </div>
      )}
    </Modal>
  );
}
