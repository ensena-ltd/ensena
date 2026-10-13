"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, ClipboardList, MessageSquare, Wallet, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import type { StudentTeachingView } from "@/lib/tutor-teaching-view";
import { cn } from "@/lib/utils";

import { StatusBadge, fullWhen, formatShortDate, useLiveNow } from "./teaching-shared";

const kindLabel = { private: "Private", group: "Group", discovery: "Discovery" } as const;

/** "Teaching with you" — the tutor's own history with this student. */
export function StudentTeachingPanel({ view, generatedAtMs }: { view: StudentTeachingView; generatedAtMs: number }) {
  const nowMs = useLiveNow(generatedAtMs);
  const { student: s, timeline, homework } = view;
  const upcoming = timeline.filter((t) => t.status === "Upcoming" && t.endMs > nowMs);
  const past = timeline.filter((t) => !(t.status === "Upcoming" && t.endMs > nowMs)).reverse();
  const firstName = s.name.split(" ")[0];

  const stats = [
    { icon: CheckCircle2, label: "Lessons taught", value: String(s.completedLessons) },
    { icon: CalendarDays, label: "Upcoming", value: String(s.upcomingLessons) },
    { icon: XCircle, label: "Cancelled", value: String(s.cancelledLessons) },
    { icon: Wallet, label: "You've earned", value: formatNaira(s.netEarned) },
  ];

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section className="rounded-2xl border border-ensena-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Teaching {firstName}</h2>
            <p className="text-xs text-ensena-muted">
              {s.firstLessonMs ? `Since ${formatShortDate(s.firstLessonMs)}` : ""}
              {s.subjects.length ? ` · ${s.subjects.join(", ")}` : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/tutor-dashboard/students/${s.id}/performance`} />} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
              <BarChart3 className="size-3.5" /> Performance
            </Button>
            <Button nativeButton={false} render={<Link href={`/tutor-dashboard/messages?student=${s.id}`} />} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
              <MessageSquare className="size-3.5" /> Message
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((st) => {
            const Icon = st.icon;
            return (
              <div key={st.label} className="rounded-xl bg-ensena-bg-soft p-3">
                <Icon className="size-4 text-ensena-primary" />
                <p className="mt-1.5 font-heading text-lg font-semibold text-ensena-ink">{st.value}</p>
                <p className="text-xs text-ensena-muted">{st.label}</p>
              </div>
            );
          })}
        </div>
        {s.attention.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1.5">
            {s.attention.map((a) => (
              <li key={a.reason} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {a.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-ensena-border bg-white p-5">
          <h2 className="font-heading text-sm font-semibold text-ensena-ink">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-ensena-muted">Nothing booked with {firstName} right now.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
              {upcoming.slice(0, 8).map((t) => (
                <TimelineRow key={t.key} item={t} />
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-ensena-border bg-white p-5">
          <h2 className="font-heading text-sm font-semibold text-ensena-ink">History ({past.length})</h2>
          {past.length === 0 ? (
            <p className="mt-2 text-sm text-ensena-muted">No past lessons yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
              {past.slice(0, 10).map((t) => (
                <TimelineRow key={t.key} item={t} needsCompleting={t.status === "Upcoming"} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-ensena-border bg-white p-5">
        <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
          <ClipboardList className="size-4 text-ensena-primary" /> Homework ({homework.length})
        </h2>
        {homework.length === 0 ? (
          <p className="mt-2 text-sm text-ensena-muted">No homework set for {firstName} yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
            {homework.map((h) => {
              const overdue = (h.status === "assigned" || h.status === "late") && h.dueMs !== null && h.dueMs < nowMs;
              return (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ensena-ink">{h.title}</p>
                    <p className="text-xs text-ensena-muted">
                      {h.subject}
                      {h.dueMs ? ` · due ${fullWhen(h.dueMs)}` : ""}
                      {h.grade ? ` · grade ${h.grade}` : ""}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize", overdue ? "bg-rose-50 text-rose-600" : h.status === "graded" ? "bg-emerald-50 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted")}>
                    {overdue ? "Overdue" : h.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TimelineRow({ item: t, needsCompleting }: { item: StudentTeachingView["timeline"][number]; needsCompleting?: boolean }) {
  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ensena-ink">{t.title}</p>
        <p className="text-xs text-ensena-muted">
          {kindLabel[t.kind]} · {fullWhen(t.startMs)}
        </p>
      </div>
      <StatusBadge status={needsCompleting ? "Needs completing" : t.status} />
    </>
  );
  return (
    <li>
      {t.href ? (
        <Link href={t.href} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
          {body}
        </Link>
      ) : (
        <div className="flex items-center justify-between gap-3 py-2.5">{body}</div>
      )}
    </li>
  );
}
