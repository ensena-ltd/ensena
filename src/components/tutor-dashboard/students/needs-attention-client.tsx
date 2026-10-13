"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  MessageSquare,
  MoreVertical,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { enrichedStudents, initials } from "@/components/tutor-dashboard/students/students-client";
import type { AttentionIssueTag } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const issueTagStyles: Record<AttentionIssueTag, string> = {
  "Missed Lesson": "bg-rose-100 text-rose-700",
  "No Upcoming Lesson": "bg-amber-100 text-amber-700",
  "At Risk": "bg-indigo-100 text-indigo-700",
};

// The students dataset (lastLesson, memberSince, etc.) is its own
// independently-authored demo dataset anchored to May 2024 — separate from
// the Schedule/Calendar data, which is generated relative to the real
// current date. Relative-time math here needs the matching May 2024
// anchor, not "real today", or every date would read as ~2 years ago.
const STUDENT_DATA_ANCHOR = "2024-05-22";

function relativeTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const anchor = new Date(STUDENT_DATA_ANCHOR);
  if (Number.isNaN(d.getTime())) return dateStr;
  const diffDays = Math.round((anchor.getTime() - d.getTime()) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const weeks = Math.round(diffDays / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function NeedsAttentionClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function messageStudent(name: string) {
    router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(name)}`);
  }

  const needsAttention = enrichedStudents.filter((s) => s.status === "Needs Attention");
  const filtered = needsAttention.filter((s) => query.trim() === "" || s.name.toLowerCase().includes(query.toLowerCase()));

  const missedLessonCount = needsAttention.filter((s) => s.attentionReason?.includes("Attendance")).length;
  const noUpcomingCount = needsAttention.filter((s) => s.nextLesson === null).length;
  const atRiskCount = needsAttention.length - missedLessonCount - noUpcomingCount;

  const statCards = [
    { icon: Users, iconClass: "bg-rose-100 text-rose-700", cardClass: "bg-rose-50/60 border-rose-100", label: "Need Attention", value: needsAttention.length },
    { icon: Calendar, iconClass: "bg-amber-100 text-amber-700", cardClass: "bg-amber-50/60 border-amber-100", label: "Missed Lessons", value: missedLessonCount },
    { icon: Clock, iconClass: "bg-indigo-100 text-indigo-700", cardClass: "bg-indigo-50/60 border-indigo-100", label: "No Upcoming Lesson", value: noUpcomingCount },
    { icon: TrendingUp, iconClass: "bg-emerald-100 text-emerald-700", cardClass: "bg-emerald-50/60 border-emerald-100", label: "At Risk", value: Math.max(0, atRiskCount) },
  ];

  return (
    <>
      <TutorTopBar
        primaryAction={
          <div className="relative w-80 max-w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, classes..."
              className="h-10 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm"
            />
          </div>
        }
      />

      <p className="flex items-center gap-1.5 text-sm text-ensena-muted">
        <Link href="/tutor-dashboard/students" className="hover:text-ensena-ink hover:underline">Students</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-ensena-ink">Needs Attention</span>
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Needs Attention</h1>
          <p className="mt-1 text-sm text-ensena-muted">Students who need your help or follow-up.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2.5 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn("rounded-2xl border p-3 sm:p-4", stat.cardClass)}>
              <span className={cn("flex size-8 sm:size-9 items-center justify-center rounded-xl", stat.iconClass)}>
                <Icon className="size-4 sm:size-4.5" />
              </span>
              <p className="mt-2 sm:mt-3 font-heading text-xl sm:text-2xl font-semibold text-ensena-ink">{stat.value}</p>
              <p className="text-[11px] sm:text-sm text-ensena-ink">{stat.label}</p>
              <p className="hidden text-xs text-ensena-muted sm:block">Students</p>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface py-16 text-center">
          <AlertTriangle className="size-8 text-ensena-border" />
          <p className="text-sm font-medium text-ensena-ink">Nothing needs attention right now</p>
          <p className="text-xs text-ensena-muted">Great job staying on top of your students.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface lg:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Issue</th>
                  <th className="px-4 py-3 font-medium">Subject / Class</th>
                  <th className="px-4 py-3 font-medium">Last Activity</th>
                  <th className="px-4 py-3 font-medium">Next Lesson</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const attention = s.attentionReason?.includes("Attendance")
                    ? "Missed Lesson"
                    : s.nextLesson === null
                      ? "No Upcoming Lesson"
                      : ("At Risk" as AttentionIssueTag);
                  return (
                    <tr key={s.id} className="border-b border-ensena-border last:border-0 align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(s.name)}</span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                            <p className="truncate text-xs text-ensena-muted">{s.type} Student</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", issueTagStyles[attention])}>{attention}</span>
                        <p className="mt-1 max-w-[220px] text-xs text-ensena-muted">{s.attentionReason}</p>
                      </td>
                      <td className="px-4 py-3 text-ensena-ink">
                        {s.subjects.join(", ")}
                        <p className="text-xs text-ensena-muted">{s.level}</p>
                      </td>
                      <td className="px-4 py-3 text-ensena-ink">
                        {s.lastLesson}
                        <p className="text-xs text-ensena-muted">{relativeTimeAgo(s.lastLesson)}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.nextLesson ? (
                          <p className="flex items-center gap-1 text-ensena-ink"><Calendar className="size-3.5 text-ensena-muted" /> {s.nextLesson}</p>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-semibold text-rose-600">No upcoming lesson</span>
                            <Link href={`/tutor-dashboard/students/${s.id}`} className="flex items-center gap-1 text-xs font-medium text-ensena-primary hover:underline">
                              <Calendar className="size-3" /> Schedule a lesson
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {attention === "At Risk" ? (
                            <Link href={`/tutor-dashboard/students/${s.id}`} className="flex items-center gap-1.5 rounded-full border border-ensena-primary px-3 py-1.5 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                              <TrendingUp className="size-3.5" /> View Progress
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => messageStudent(s.name)}
                              className="flex items-center gap-1.5 rounded-full border border-ensena-primary px-3 py-1.5 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                            >
                              <MessageSquare className="size-3.5" /> Message
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Message ${s.name}`}
                            onClick={() => messageStudent(s.name)}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-ensena-border px-4 py-3 text-xs text-ensena-muted">
              Showing {filtered.length} of {needsAttention.length} students
            </p>
          </div>

          {/* Mobile list */}
          <div className="mt-5 flex flex-col gap-3 lg:hidden">
            {filtered.map((s) => {
              const attention = s.attentionReason?.includes("Attendance")
                ? "Missed Lesson"
                : s.nextLesson === null
                  ? "No Upcoming Lesson"
                  : ("At Risk" as AttentionIssueTag);
              return (
                <div key={s.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">{initials(s.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{s.name}</p>
                        <p className="truncate text-xs text-ensena-muted">{s.type} Student</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Message ${s.name}`}
                      onClick={() => messageStudent(s.name)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", issueTagStyles[attention])}>{attention}</span>
                  </div>
                  <p className="mt-1 text-xs text-ensena-muted">{s.attentionReason}</p>

                  <p className="mt-2 text-sm font-medium text-ensena-ink">{s.subjects.join(", ")}</p>
                  <p className="text-xs text-ensena-muted">{s.level}</p>

                  <div className="mt-3 flex items-center justify-between border-t border-ensena-border pt-3">
                    {s.nextLesson ? (
                      <p className="flex items-center gap-1 text-sm text-ensena-ink"><Calendar className="size-3.5 text-ensena-muted" /> {s.nextLesson}</p>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-rose-600">No upcoming lesson</span>
                        <Link href={`/tutor-dashboard/students/${s.id}`} className="flex items-center gap-1 text-xs font-medium text-ensena-primary hover:underline">
                          <Calendar className="size-3" /> Schedule a lesson
                        </Link>
                      </div>
                    )}
                  </div>

                  {attention === "At Risk" ? (
                    <Link href={`/tutor-dashboard/students/${s.id}`} className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                      <TrendingUp className="size-4" /> View Progress
                    </Link>
                  ) : (
                    <button type="button" className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                      <MessageSquare className="size-4" /> Message
                    </button>
                  )}
                </div>
              );
            })}
            <p className="text-center text-xs text-ensena-muted">
              Showing {filtered.length} of {needsAttention.length} students
            </p>
          </div>
        </>
      )}
    </>
  );
}
