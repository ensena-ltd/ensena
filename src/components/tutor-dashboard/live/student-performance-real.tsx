"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLATFORM_TIMEZONE } from "@/lib/platform-time";
import type { StudentTeachingView } from "@/lib/tutor-teaching-view";
import { cn } from "@/lib/utils";

import { PersonAvatar, useLiveNow } from "./teaching-shared";

const MONTHS = 6;
const monthKey = (msValue: number) => new Intl.DateTimeFormat("en-CA", { timeZone: PLATFORM_TIMEZONE, year: "numeric", month: "2-digit" }).format(msValue);
const monthName = (key: string) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short" });

function lastMonthKeys(nowMs: number): string[] {
  const [y, m] = monthKey(nowMs).split("-").map(Number);
  return Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (MONTHS - 1 - i), 15));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <p className="text-xs text-ensena-muted">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-ensena-muted">{hint}</p>}
    </div>
  );
}

export function StudentPerformanceReal({ view, generatedAtMs }: { view: StudentTeachingView; generatedAtMs: number }) {
  const nowMs = useLiveNow(generatedAtMs);
  const { student: s, timeline, homework } = view;
  const [hovered, setHovered] = useState<string | null>(null);

  const past = timeline.filter((t) => t.startMs <= nowMs);
  const completed = past.filter((t) => t.status === "Completed");
  const cancelled = timeline.filter((t) => t.status === "Cancelled");
  const decided = completed.length + cancelled.length;
  const attendance = decided ? Math.round((completed.length / decided) * 100) : null;
  const hoursTaught = completed.reduce((h, t) => h + (t.endMs - t.startMs) / 3_600_000, 0);

  const hwDone = homework.filter((h) => h.status === "submitted" || h.status === "graded");
  const hwRate = homework.length ? Math.round((hwDone.length / homework.length) * 100) : null;
  const onTime = hwDone.filter((h) => h.dueMs === null || (h.submittedMs !== null && h.submittedMs <= h.dueMs)).length;

  const keys = lastMonthKeys(nowMs);
  const perMonth = keys.map((k) => ({ key: k, count: completed.filter((t) => monthKey(t.startMs) === k).length }));
  const max = Math.max(1, ...perMonth.map((p) => p.count));

  const bySubject = new Map<string, number>();
  for (const t of completed) {
    const subject = t.title.split(" · ")[0];
    bySubject.set(subject, (bySubject.get(subject) ?? 0) + 1);
  }
  const subjects = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <Link href={`/tutor-dashboard/students/${s.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> {s.name}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <PersonAvatar name={s.name} image={s.image} className="size-12" />
          <div>
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{s.name}&apos;s progress</h1>
            <p className="text-sm text-ensena-muted">{[s.academicLevel, s.subjects.join(", ")].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <Button nativeButton={false} render={<Link href={`/tutor-dashboard/messages?student=${s.id}`} />} className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white">
          <MessageSquare className="size-4" /> Message
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Lessons completed" value={String(completed.length)} hint={`${hoursTaught.toFixed(1)} hours taught`} />
        <Kpi label="Attendance" value={attendance === null ? "–" : `${attendance}%`} hint={decided ? `${cancelled.length} cancelled` : "No lessons yet"} />
        <Kpi label="Homework completed" value={hwRate === null ? "–" : `${hwRate}%`} hint={homework.length ? `${onTime} of ${hwDone.length} on time` : "None set yet"} />
        <Kpi label="Upcoming" value={String(s.upcomingLessons)} hint={s.nextLessonMs ? "Lesson booked" : "Nothing booked"} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-sm font-semibold text-ensena-ink">Lessons completed per month</h2>
          <p className="text-xs text-ensena-muted">Last {MONTHS} months</p>
          <div className="relative mt-4 flex h-40 items-end gap-3 border-b border-ensena-border" role="img" aria-label={`Lessons completed per month: ${perMonth.map((p) => `${monthName(p.key)} ${p.count}`).join(", ")}`}>
            {perMonth.map((p) => (
              <div
                key={p.key}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHovered(p.key)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === p.key && (
                  <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-ensena-ink px-2 py-1 text-[11px] font-medium text-white shadow">
                    {monthName(p.key)}: {p.count} {p.count === 1 ? "lesson" : "lessons"}
                  </span>
                )}
                <div
                  className={cn("w-full max-w-8 rounded-t-[4px] bg-ensena-primary transition-opacity", hovered && hovered !== p.key && "opacity-50")}
                  style={{ height: p.count ? `${Math.max(4, (p.count / max) * 100)}%` : "2px", opacity: p.count ? undefined : 0.25 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-3">
            {perMonth.map((p) => (
              <span key={p.key} className="flex-1 text-center text-[11px] text-ensena-muted">
                {monthName(p.key)}
              </span>
            ))}
          </div>
          <table className="sr-only">
            <caption>Lessons completed per month</caption>
            <tbody>
              {perMonth.map((p) => (
                <tr key={p.key}>
                  <th>{monthName(p.key)}</th>
                  <td>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-sm font-semibold text-ensena-ink">By subject</h2>
          {subjects.length === 0 ? (
            <p className="mt-2 text-sm text-ensena-muted">No completed lessons yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {subjects.map(([subject, count]) => (
                <li key={subject}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate text-ensena-ink">{subject}</span>
                    <span className="text-xs text-ensena-muted">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft">
                    <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${(count / completed.length) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
