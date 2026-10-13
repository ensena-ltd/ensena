"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Download, MessageSquare, Search, TrendingUp, UserCheck, Users } from "lucide-react";

import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import type { AttentionReason, TeachingSnapshot, TeachingStudent } from "@/lib/tutor-teaching-server";
import { cn } from "@/lib/utils";

import { EmptyState, PersonAvatar, fullWhen, formatShortDate, useLiveNow } from "./teaching-shared";

const typeStyle: Record<string, string> = {
  Private: "bg-indigo-100 text-indigo-700",
  Group: "bg-sky-100 text-sky-700",
  Discovery: "bg-violet-100 text-violet-700",
};

function TypeChips({ types }: { types: TeachingStudent["types"] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => (
        <span key={t} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", typeStyle[t])}>
          {t}
        </span>
      ))}
    </div>
  );
}

function StatusPill({ s }: { s: TeachingStudent }) {
  const attention = s.attention.length > 0;
  const active = s.upcomingLessons > 0;
  const label = attention ? "Needs attention" : active ? "Active" : "Inactive";
  return (
    <span className={cn("flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", attention ? "bg-amber-100 text-amber-700" : active ? "bg-emerald-100 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted")}>
      <span className={cn("size-1.5 rounded-full", attention ? "bg-amber-500" : active ? "bg-emerald-500" : "bg-ensena-muted")} /> {label}
    </span>
  );
}

export function StudentsReal({ data }: { data: TeachingSnapshot }) {
  const nowMs = useLiveNow(data.generatedAtMs);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<"All" | "Private" | "Group" | "Discovery">("All");
  const [subject, setSubject] = useState("All");
  const [status, setStatus] = useState<"All" | "Active" | "Needs attention" | "Inactive">("All");
  const [sort, setSort] = useState<"Next" | "Recent" | "Name" | "Lessons">("Next");

  const students = data.students;
  const subjects = useMemo(() => [...new Set(students.flatMap((s) => s.subjects))].sort(), [students]);
  const statusOf = (s: TeachingStudent) => (s.attention.length ? "Needs attention" : s.upcomingLessons > 0 ? "Active" : "Inactive");

  const q = query.trim().toLowerCase();
  const filtered = students
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.subjects.some((x) => x.toLowerCase().includes(q)) || s.academicLevel.toLowerCase().includes(q))
    .filter((s) => type === "All" || s.types.includes(type))
    .filter((s) => subject === "All" || s.subjects.includes(subject))
    .filter((s) => status === "All" || statusOf(s) === status)
    .sort((a, b) => {
      if (sort === "Name") return a.name.localeCompare(b.name);
      if (sort === "Lessons") return b.completedLessons - a.completedLessons;
      if (sort === "Recent") return (b.lastLessonMs ?? 0) - (a.lastLessonMs ?? 0);
      return (a.nextLessonMs ?? Infinity) - (b.nextLessonMs ?? Infinity);
    });

  const statCards = [
    { icon: Users, iconClass: "bg-violet-100 text-violet-700", cardClass: "bg-violet-50/60 border-violet-100", label: "Total Students", value: students.length },
    { icon: UserCheck, iconClass: "bg-emerald-100 text-emerald-700", cardClass: "bg-emerald-50/60 border-emerald-100", label: "Active (lesson booked)", value: students.filter((s) => s.upcomingLessons > 0).length },
    { icon: BookOpen, iconClass: "bg-blue-100 text-blue-700", cardClass: "bg-blue-50/60 border-blue-100", label: "Lessons Taught", value: students.reduce((n, s) => n + s.completedLessons, 0) },
    { icon: AlertTriangle, iconClass: "bg-amber-100 text-amber-700", cardClass: "bg-amber-50/60 border-amber-100", label: "Need Attention", value: students.filter((s) => s.attention.length).length },
  ];

  function exportCsv() {
    downloadCsv(
      [
        ["Name", "Level", "Types", "Subjects", "Status", "Lessons completed", "Upcoming", "Next lesson", "Last lesson", "Earned (net, NGN)"],
        ...filtered.map((s) => [
          s.name,
          s.academicLevel,
          s.types.join("; "),
          s.subjects.join("; "),
          statusOf(s),
          s.completedLessons,
          s.upcomingLessons,
          s.nextLessonMs ? fullWhen(s.nextLessonMs) : "",
          s.lastLessonMs ? fullWhen(s.lastLessonMs) : "",
          s.netEarned,
        ]),
      ],
      "ensena-students.csv"
    );
  }

  const selectClass = "h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Students</h1>
          <p className="mt-1 text-sm text-ensena-muted">Everyone who&apos;s booked a lesson, group class or discovery session with you.</p>
        </div>
        <Link href="/tutor-dashboard/students/needs-attention" className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
          <AlertTriangle className="size-4 text-amber-500" /> Needs attention
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn("rounded-2xl border p-4", stat.cardClass)}>
              <span className={cn("flex size-9 items-center justify-center rounded-xl", stat.iconClass)}>
                <Icon className="size-4.5" />
              </span>
              <p className="mt-3 text-sm text-ensena-ink">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {students.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<Users className="size-8 text-ensena-border" />} title="No students yet">
            Students appear here once they book a lesson, join a group class or book a discovery session with you. Keep your{" "}
            <Link href="/tutor-dashboard/profile?tab=Public Profile" className="font-semibold text-ensena-primary hover:underline">
              profile
            </Link>{" "}
            and{" "}
            <Link href="/tutor-dashboard/profile?tab=Availability" className="font-semibold text-ensena-primary hover:underline">
              availability
            </Link>{" "}
            up to date to get found.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students by name, subject or level…" className="h-11 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectClass} aria-label="Type">
                <option value="All">All types</option>
                <option value="Private">Private</option>
                <option value="Group">Group</option>
                <option value="Discovery">Discovery</option>
              </select>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={selectClass} aria-label="Subject">
                <option value="All">All subjects</option>
                {subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectClass} aria-label="Status">
                <option value="All">All status</option>
                <option>Active</option>
                <option>Needs attention</option>
                <option>Inactive</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectClass} aria-label="Sort">
                <option value="Next">Sort: next lesson</option>
                <option value="Recent">Sort: recently taught</option>
                <option value="Lessons">Sort: most lessons</option>
                <option value="Name">Sort: name</option>
              </select>
            </div>
            <button type="button" onClick={exportCsv} className="flex items-center gap-1.5 text-sm font-semibold text-ensena-muted hover:text-ensena-ink">
              Export <Download className="size-3.5" />
            </button>
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface lg:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Subjects</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Next lesson</th>
                  <th className="px-4 py-3 font-medium">Lessons</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-ensena-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar name={s.name} image={s.image} className="size-9 text-xs" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                          <p className="truncate text-xs text-ensena-muted">{s.academicLevel || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[180px] px-4 py-3 text-ensena-ink">
                      <p className="truncate">{s.subjects.join(", ") || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <TypeChips types={s.types} />
                    </td>
                    <td className="px-4 py-3 text-ensena-ink">{s.nextLessonMs ? fullWhen(s.nextLessonMs) : <span className="text-ensena-muted">Not scheduled</span>}</td>
                    <td className="px-4 py-3 text-ensena-ink">
                      {s.completedLessons}
                      <span className="text-xs text-ensena-muted"> done · {s.upcomingLessons} upcoming</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill s={s} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/tutor-dashboard/students/${s.id}`} className="rounded-full border border-ensena-primary px-3 py-1.5 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                          View
                        </Link>
                        <Link href={`/tutor-dashboard/messages?student=${s.id}`} aria-label={`Message ${s.name}`} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                          <MessageSquare className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-ensena-muted">No students match these filters.</p>}
            <p className="border-t border-ensena-border px-4 py-3 text-xs text-ensena-muted">
              Showing {filtered.length} of {students.length} students
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:hidden">
            {filtered.map((s) => (
              <Link key={s.id} href={`/tutor-dashboard/students/${s.id}`} className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <PersonAvatar name={s.name} image={s.image} className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{s.name}</p>
                    <StatusPill s={s} />
                  </div>
                  <p className="truncate text-xs text-ensena-muted">{s.subjects.join(", ")}</p>
                  <p className="text-xs text-ensena-muted">{s.nextLessonMs ? `Next: ${fullWhen(s.nextLessonMs)}` : `${s.completedLessons} lessons taught`}</p>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="py-8 text-center text-sm text-ensena-muted">No students match these filters.</p>}
          </div>
        </>
      )}
      <p className="mt-4 text-xs text-ensena-muted">Last updated {nowMs ? formatShortDate(nowMs) : ""}. Earnings shown are after Ensena&apos;s commission.</p>
    </div>
  );
}

const reasonStyle: Record<AttentionReason, string> = {
  unpaid: "bg-amber-50 text-amber-800",
  disputed: "bg-rose-50 text-rose-700",
  inactive: "bg-ensena-bg-soft text-ensena-ink",
  cancellations: "bg-orange-50 text-orange-800",
  homework: "bg-sky-50 text-sky-800",
};

const reasonTitle: Record<AttentionReason, string> = {
  unpaid: "Unpaid booking",
  disputed: "Lesson reported",
  inactive: "Gone quiet",
  cancellations: "Frequent cancellations",
  homework: "Homework overdue",
};

export function NeedsAttentionReal({ data }: { data: TeachingSnapshot }) {
  const flagged = data.students.filter((s) => s.attention.length > 0);
  const [reason, setReason] = useState<AttentionReason | "All">("All");
  const shown = reason === "All" ? flagged : flagged.filter((s) => s.attention.some((a) => a.reason === reason));
  const counts = (Object.keys(reasonTitle) as AttentionReason[]).map((r) => ({ r, n: flagged.filter((s) => s.attention.some((a) => a.reason === r)).length })).filter((c) => c.n > 0);

  return (
    <div>
      <Link href="/tutor-dashboard/students" className="text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        ← All students
      </Link>
      <h1 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">Needs Attention</h1>
      <p className="mt-1 text-sm text-ensena-muted">Students who might need a nudge, a follow-up or a quick check-in.</p>

      {flagged.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<TrendingUp className="size-8 text-ensena-success" />} title="Everyone's on track">
            No unpaid bookings, reported lessons, overdue homework or students who&apos;ve gone quiet.
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setReason("All")} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", reason === "All" ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted")}>
              All ({flagged.length})
            </button>
            {counts.map(({ r, n }) => (
              <button key={r} type="button" onClick={() => setReason(r)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", reason === r ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted")}>
                {reasonTitle[r]} ({n})
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {shown.map((s) => (
              <div key={s.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PersonAvatar name={s.name} image={s.image} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{s.name}</p>
                    <p className="truncate text-xs text-ensena-muted">
                      {s.subjects.join(", ")} · {s.completedLessons} lessons taught{s.netEarned > 0 ? ` · ${formatNaira(s.netEarned)} earned` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/tutor-dashboard/students/${s.id}`} className="flex h-9 items-center rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      View student
                    </Link>
                    <Link href={`/tutor-dashboard/messages?student=${s.id}`} className="flex h-9 items-center gap-1 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                      <MessageSquare className="size-3.5" /> Message
                    </Link>
                  </div>
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {s.attention.map((a) => (
                    <li key={a.reason} className={cn("rounded-lg px-3 py-2 text-xs", reasonStyle[a.reason])}>
                      <span className="font-semibold">{reasonTitle[a.reason]}:</span> {a.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
