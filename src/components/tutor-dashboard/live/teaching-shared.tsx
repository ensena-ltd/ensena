"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { formatShortDate, formatTime, platformISODate } from "@/components/student-dashboard/live/learning-utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { canEnterClassroom, getClassEntryState, TUTOR_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { platformWallTimeToMs, PLATFORM_TIMEZONE } from "@/lib/platform-time";
import type { TeachingLesson } from "@/lib/tutor-teaching-server";
import { cn } from "@/lib/utils";

// Shared bits for the live (Supabase-backed) tutor Classes and Students
// pages. Every time is shown in the platform timezone (Africa/Lagos).

export { PersonAvatar, useLiveNow } from "@/components/student-dashboard/live/live-shared";
export { formatLongDate, formatShortDate, formatTime, formatTimeRange, monthDay, platformISODate, relativeDay } from "@/components/student-dashboard/live/learning-utils";

export const dayLabel = (msValue: number) => new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, weekday: "long", month: "short", day: "numeric" }).format(msValue);

export const fullWhen = (msValue: number) => `${formatShortDate(msValue)} · ${formatTime(msValue)}`;

/** Tutors can open the classroom up to 24h early, until the end time. */
export function canTutorEnter(startMs: number, endMs: number, nowMs: number): boolean {
  return canEnterClassroom(getClassEntryState({ startMs, endMs, role: "tutor", nowMs }));
}

export function entryOpensAt(startMs: number): number {
  return startMs - TUTOR_ENTRY_WINDOW_MS;
}

export type LessonDisplay = "Upcoming" | "Awaiting payment" | "Needs completing" | "Completed" | "Cancelled" | "Payment not completed";

/** How a private lesson should read to the tutor right now. */
export function lessonDisplay(l: TeachingLesson, nowMs: number): LessonDisplay {
  if (l.status === "Cancelled") return "Cancelled";
  if (l.status === "Completed") return "Completed";
  if (l.holdExpired) return "Payment not completed";
  if (l.endMs <= nowMs) return "Needs completing";
  if (l.status === "Pending" || l.paymentStatus !== "paid") return "Awaiting payment";
  return "Upcoming";
}

const badgeStyles: Record<string, string> = {
  Upcoming: "bg-emerald-50 text-emerald-700",
  Scheduled: "bg-emerald-50 text-emerald-700",
  Published: "bg-emerald-50 text-emerald-700",
  Active: "bg-emerald-50 text-emerald-700",
  "Awaiting payment": "bg-amber-50 text-amber-700",
  Draft: "bg-amber-50 text-amber-700",
  "Needs completing": "bg-sky-50 text-sky-700",
  InProgress: "bg-sky-50 text-sky-700",
  Completed: "bg-ensena-bg-soft text-ensena-muted",
  Cancelled: "bg-rose-50 text-rose-600",
  "Payment not completed": "bg-ensena-bg-soft text-ensena-muted",
  NoShow: "bg-rose-50 text-rose-600",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status === "InProgress" ? "In progress" : status === "NoShow" ? "No-show" : status;
  return <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", badgeStyles[status] ?? "bg-ensena-bg-soft text-ensena-muted", className)}>{label}</span>;
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border bg-ensena-surface px-6 py-12 text-center">
      {icon}
      <p className="text-sm font-semibold text-ensena-ink">{title}</p>
      {children && <div className="max-w-sm text-xs text-ensena-muted">{children}</div>}
    </div>
  );
}

/** A confirm-with-reason dialog (cancelling a lesson, session or class). */
export function ReasonModal({
  open,
  title,
  description,
  confirmLabel,
  placeholder,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  placeholder: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (reason.trim().length < 3) {
      toast.error("Please add a short reason.");
      return;
    }
    setBusy(true);
    const ok = await onConfirm(reason);
    setBusy(false);
    if (ok) {
      setReason("");
      onClose();
    }
  }

  return (
    <Modal open={open} onClose={() => !busy && onClose()} title={title}>
      <div className="flex flex-col gap-3">
        <div className="text-sm text-ensena-muted">{description}</div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} rows={3} placeholder={placeholder} className="rounded-xl border border-ensena-border p-3 text-sm" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
            Keep it
          </Button>
          <Button onClick={confirm} loading={busy} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Pick a new date + time (Lagos) for a lesson. */
export function RescheduleModal({
  lesson,
  onClose,
  onConfirm,
}: {
  lesson: TeachingLesson | null;
  onClose: () => void;
  onConfirm: (newStartMs: number, note: string) => Promise<boolean>;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [lessonId, setLessonId] = useState<string | null>(null);
  if (lesson && lesson.id !== lessonId) {
    setLessonId(lesson.id);
    setDate(platformISODate(lesson.startMs));
    setTime(new Intl.DateTimeFormat("en-GB", { timeZone: PLATFORM_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(lesson.startMs));
    setNote("");
  }

  async function confirm() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      toast.error("Pick a new date and time.");
      return;
    }
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    setBusy(true);
    const ok = await onConfirm(platformWallTimeToMs(y, m, d, hh, mm), note);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal open={!!lesson} onClose={() => !busy && onClose()} title="Reschedule lesson">
      {lesson && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            {lesson.subject} with {lesson.studentName} · currently {fullWhen(lesson.startMs)} ({lesson.durationMinutes} min). {lesson.studentName.split(" ")[0]} will be told straight away.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
              New date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
              New time (WAT)
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm text-ensena-ink" />
            </label>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="Note for your student (optional)" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          <Button onClick={confirm} loading={busy} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            Move lesson
          </Button>
        </div>
      )}
    </Modal>
  );
}
