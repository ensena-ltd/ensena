"use client";

import Link from "next/link";
import { ArrowLeft, CalendarClock, CheckCircle2, MessageSquare, Video, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { formatNaira } from "@/lib/format";
import type { TeachingLesson } from "@/lib/tutor-teaching-server";
import { cn } from "@/lib/utils";

import { PersonAvatar, StatusBadge, canTutorEnter, entryOpensAt, formatLongDate, formatTimeRange, fullWhen, lessonDisplay, useLiveNow } from "./teaching-shared";
import { useLessonActions } from "./use-lesson-actions";

export interface LessonEvent {
  id: string;
  type: string;
  note: string | null;
  atMs: number;
  byTutor: boolean;
}

const eventLabels: Record<string, string> = {
  created: "Booked",
  paid: "Paid",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
  completed: "Completed",
  terminated: "Ended early",
};

export function LessonDetailReal({ lesson: l, series, events, generatedAtMs }: { lesson: TeachingLesson; series: TeachingLesson[]; events: LessonEvent[]; generatedAtMs: number }) {
  const nowMs = useLiveNow(generatedAtMs);
  const actions = useLessonActions();
  const display = lessonDisplay(l, nowMs);
  const changeable = (display === "Upcoming" || display === "Awaiting payment") && l.startMs > nowMs;
  const enterable = (display === "Upcoming" || display === "Awaiting payment") && canTutorEnter(l.startMs, l.endMs, nowMs);

  const rows: [string, string][] = [
    ["Date", formatLongDate(l.startMs)],
    ["Time", `${formatTimeRange(l)} WAT (${l.durationMinutes} min)`],
    ["Mode", l.mode],
    ["Level", l.academicLevel ?? "—"],
    ["Price", l.price > 0 ? formatNaira(l.price) : "—"],
    ["Payment", l.paymentStatus === "paid" ? "Paid" : l.paymentStatus === "refunded" ? "Refunded" : l.paymentStatus === "partially_refunded" ? "Partly refunded" : "Not paid yet"],
    ["Reference", l.bookingReference ?? "—"],
    ["Plan", l.totalSessions && l.totalSessions > 1 ? `${l.frequency === "monthly" ? "Monthly" : "Weekly"} · session ${l.sessionNumber} of ${l.totalSessions}` : "One-off lesson"],
  ];

  return (
    <div>
      <Link href="/tutor-dashboard/private-lessons?tab=Lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Private classes
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-xl font-semibold text-ensena-ink">{l.subject}</h1>
                <p className="text-sm text-ensena-muted">{fullWhen(l.startMs)}</p>
              </div>
              <StatusBadge status={display} />
            </div>
            {display === "Awaiting payment" && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Your student hasn&apos;t paid for this lesson yet. It&apos;s held for them while they finish checkout.</p>}
            {display === "Payment not completed" && <p className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">The student didn&apos;t finish paying, so this slot was released and is bookable again.</p>}
            {display === "Cancelled" && (
              <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                Cancelled{l.cancelledAtMs ? ` on ${fullWhen(l.cancelledAtMs)}` : ""}.{l.cancellationReason ? ` Reason: ${l.cancellationReason}` : ""}
              </p>
            )}
            {l.confirmation && (
              <p className={cn("mt-3 rounded-xl p-3 text-xs", l.confirmation.status === "Disputed" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800")}>
                {l.confirmation.status === "Disputed"
                  ? "Your student reported a problem with this lesson. Ensena support is reviewing it and the payment is on hold."
                  : l.confirmation.escrow === "Released"
                    ? "Your student confirmed this lesson and the payment has been released to your earnings."
                    : "Waiting for your student to confirm. If they don't report a problem within 24 hours, the payment is released automatically."}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-ensena-muted">{k}</dt>
                  <dd className="font-medium text-ensena-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {l.notes && (
              <div className="mt-4 rounded-xl bg-ensena-bg-soft p-3">
                <p className="text-xs font-semibold text-ensena-ink">Notes from {l.studentName.split(" ")[0]}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-ensena-ink">{l.notes}</p>
              </div>
            )}
          </section>

          {series.length > 1 && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">All sessions in this booking</h2>
              <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
                {series.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/tutor-dashboard/private-lessons/${s.id}`} className={cn("text-sm hover:underline", s.id === l.id ? "font-semibold text-ensena-primary" : "text-ensena-ink")}>
                      Session {s.sessionNumber ?? "–"} · {fullWhen(s.startMs)}
                    </Link>
                    <StatusBadge status={lessonDisplay(s, nowMs)} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {events.length > 0 && (
            <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">History</h2>
              <ol className="mt-3 flex flex-col gap-3 border-l border-ensena-border pl-4">
                {events.map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-ensena-primary" />
                    <p className="text-sm font-medium text-ensena-ink">
                      {eventLabels[e.type] ?? e.type} {e.byTutor ? "by you" : ""}
                    </p>
                    <p className="text-xs text-ensena-muted">{fullWhen(e.atMs)}</p>
                    {e.note && <p className="mt-0.5 text-xs text-ensena-muted">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center gap-3">
              <PersonAvatar name={l.studentName} image={l.studentImage} className="size-12" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{l.studentName}</p>
                <Link href={`/tutor-dashboard/students/${l.studentId}`} className="text-xs font-semibold text-ensena-primary hover:underline">
                  View student
                </Link>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {enterable && (
                <Button nativeButton={false} render={<Link href={`/tutor-dashboard/classroom/private/${l.id}`} />} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
                  <Video className="size-4" /> Enter Classroom
                </Button>
              )}
              {!enterable && changeable && <p className="text-center text-xs text-ensena-muted">{entryOpensHint(entryOpensAt(l.startMs), nowMs)}</p>}
              {display === "Needs completing" && (
                <Button onClick={() => actions.complete(l)} loading={actions.completingId === l.id} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
                  <CheckCircle2 className="size-4" /> Mark as complete
                </Button>
              )}
              <Button variant="outline" nativeButton={false} render={<Link href={`/tutor-dashboard/messages?student=${l.studentId}`} />} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">
                <MessageSquare className="size-4" /> Message {l.studentName.split(" ")[0]}
              </Button>
              {changeable && (
                <>
                  <Button variant="outline" onClick={() => actions.reschedule(l)} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">
                    <CalendarClock className="size-4" /> Reschedule
                  </Button>
                  <Button variant="outline" onClick={() => actions.cancel(l)} className="h-10 w-full rounded-full border-rose-200 text-sm font-medium text-rose-600 hover:bg-rose-50">
                    <XCircle className="size-4" /> Cancel lesson
                  </Button>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
      {actions.modals}
    </div>
  );
}
