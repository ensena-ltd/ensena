"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Download,
  Megaphone,
  MoreVertical,
  Plus,
  Search,
  Star,
  UserPlus,
  Users,
  Users2,
} from "lucide-react";

import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { downloadCsv } from "@/lib/csv";
import { attentionInfoFor, initialPrivateLessons, students, type StudentRecord } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

type StudentType = "Private" | "Group";
type StudentStatus = "Active" | "Needs Attention";

interface EnrichedStudent extends StudentRecord {
  type: StudentType;
  nextLesson: string | null;
  status: StudentStatus;
  attentionReason: string | null;
}

export function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function nextLessonFor(name: string): string | null {
  const upcoming = initialPrivateLessons
    .filter((l) => l.student === name && l.status === "Upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ? `${upcoming[0].date.replace(", 2024", "")}, ${upcoming[0].time}` : null;
}

// No email/phone shown to tutors — reuses the app's one existing
// booking-reference system as the identifier a tutor actually needs
// (their next upcoming lesson, or their most recent one if nothing's
// scheduled), rather than a contact detail.
export function primaryBookingIdFor(name: string): string | null {
  const lessons = initialPrivateLessons.filter((l) => l.student === name);
  const upcoming = lessons.filter((l) => l.status === "Upcoming").sort((a, b) => a.date.localeCompare(b.date))[0];
  const mostRecent = [...lessons].sort((a, b) => b.date.localeCompare(a.date))[0];
  const lesson = upcoming ?? mostRecent;
  return lesson ? lesson.bookingReference : null;
}

// The `students` CRM list (progress/attendance fields) only tracks private
// 1:1 relationships — group-class rosters are a separate, unrelated
// dataset (see initialMyGroupClasses) with no shared student IDs to merge
// against — so every real record here is genuinely "Private".
export const enrichedStudents: EnrichedStudent[] = students.map((s) => {
  const attention = attentionInfoFor(s);
  return {
    ...s,
    type: "Private" as StudentType,
    nextLesson: nextLessonFor(s.name),
    status: attention ? "Needs Attention" : "Active",
    attentionReason: attention?.detail ?? null,
  };
});

const quickActions = [
  { icon: UserPlus, label: "Add New Student", stubMessage: "Adding students directly isn't available in this demo. New students find you through Find a Tutor." },
  { icon: Megaphone, label: "Send Announcement", stubMessage: "Announcements aren't available in this demo yet." },
  { icon: ClipboardList, label: "Create Assignment", stubMessage: "Assignments aren't available in this demo yet." },
  { icon: CalendarClock, label: "Schedule Availability", href: "/tutor-dashboard/private-lessons?tab=Calendar" },
];

const subjectColors = ["#6C63FF", "#1FA971", "#2F9BE0", "#E58A2A", "#B5546B", "#9B6BD6"];

export function StudentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | StudentType>(
    () => (searchParams.get("type") as StudentType | null) ?? "All"
  );
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | StudentStatus>(
    () => (searchParams.get("status") as StudentStatus | null) ?? "All"
  );
  const [sortBy, setSortBy] = useState<"Recent" | "Progress" | "Name">("Recent");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const subjects = useMemo(() => Array.from(new Set(students.flatMap((s) => s.subjects))).sort(), []);

  const filtered = useMemo(() => {
    let list = enrichedStudents.filter((s) => {
      const matchesQuery = query.trim() === "" || s.name.toLowerCase().includes(query.toLowerCase());
      const matchesType = typeFilter === "All" || s.type === typeFilter;
      const matchesSubject = subjectFilter === "All" || s.subjects.includes(subjectFilter);
      const matchesStatus = statusFilter === "All" || s.status === statusFilter;
      return matchesQuery && matchesType && matchesSubject && matchesStatus;
    });
    list = [...list];
    if (sortBy === "Progress") list.sort((a, b) => b.progressPct - a.progressPct);
    else if (sortBy === "Name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [query, typeFilter, subjectFilter, statusFilter, sortBy]);

  const activeCount = enrichedStudents.filter((s) => s.status === "Active").length;
  const repeatCount = enrichedStudents.filter((s) => s.lessonsCompleted >= 20).length;
  const needsAttention = enrichedStudents.filter((s) => s.status === "Needs Attention");

  const subjectCounts = subjects.map((subject, i) => ({
    subject,
    count: students.filter((s) => s.subjects.includes(subject)).length,
    color: subjectColors[i % subjectColors.length],
  }));
  const subjectTotal = subjectCounts.reduce((sum, s) => sum + s.count, 0) || 1;
  let gradientCursor = 0;
  const donutGradient = subjectCounts
    .map((s) => {
      const start = (gradientCursor / subjectTotal) * 360;
      gradientCursor += s.count;
      const end = (gradientCursor / subjectTotal) * 360;
      return `${s.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  const statCards = [
    { label: "Total Students", value: students.length, cardClass: "bg-violet-50/60 border-violet-100", iconClass: "bg-violet-100 text-violet-700", icon: Users },
    { label: "Active Students", value: activeCount, cardClass: "bg-emerald-50/60 border-emerald-100", iconClass: "bg-emerald-100 text-emerald-700", icon: Users2 },
    { label: "Repeat Students", value: repeatCount, cardClass: "bg-amber-50/60 border-amber-100", iconClass: "bg-amber-100 text-amber-700", icon: Star },
    { label: "Needs Attention", value: needsAttention.length, cardClass: "bg-rose-50/60 border-rose-100", iconClass: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  ];

  return (
    <>
      <TutorTopBar
        primaryAction={
          <Link
            href="/tutor-dashboard/private-lessons?tab=Group Classes"
            className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Plus className="size-4" /> Create Group Class
          </Link>
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Students</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your students, track progress, and keep up with their learning journey.</p>
        </div>
        <button
          type="button"
          onClick={() => flash("Adding students directly isn't available in this demo. New students find you through Find a Tutor.")}
          className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5 lg:hidden"
        >
          <Plus className="size-4" /> Add Student
        </button>
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

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {/* Search + filters */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name, subject…"
              className="h-11 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
                <option value="All">All Types</option>
                <option value="Private">Private</option>
                <option value="Group">Group</option>
              </select>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
                <option value="All">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Needs Attention">Needs Attention</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="hidden items-center gap-1.5 text-xs text-ensena-muted lg:flex">
                Sort by:
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
                  <option value="Recent">Recently active</option>
                  <option value="Progress">Progress</option>
                  <option value="Name">Name</option>
                </select>
              </label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink lg:hidden">
                <option value="Recent">Sort: Recent</option>
                <option value="Progress">Sort: Progress</option>
                <option value="Name">Sort: Name</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    [
                      ["Name", "Type", "Subjects", "Status", "Progress %", "Lessons Completed", "Next Lesson"],
                      ...filtered.map((s) => [s.name, s.type, s.subjects.join("; "), s.status, s.progressPct, s.lessonsCompleted, s.nextLesson ?? ""]),
                    ],
                    "ensena-students.csv"
                  )
                }
                className="hidden items-center gap-1.5 text-sm font-semibold text-ensena-muted hover:text-ensena-ink lg:flex"
              >
                Export <Download className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Desktop table */}
          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Next Lesson</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-ensena-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(s.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                          <p className="truncate font-mono text-xs text-ensena-muted">{primaryBookingIdFor(s.name) ?? "No bookings yet"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ensena-ink">
                      {s.subjects.join(", ")}
                      <p className="text-xs text-ensena-muted">{s.level}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", s.type === "Private" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700")}>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ensena-ink">{s.nextLesson ?? <span className="text-ensena-muted">Not scheduled</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${s.progressPct}%` }} /></div>
                        <span className="text-xs text-ensena-muted">{s.progressPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", s.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                        <span className={cn("size-1.5 rounded-full", s.status === "Active" ? "bg-emerald-500" : "bg-amber-500")} /> {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/tutor-dashboard/students/${s.id}`} className="rounded-full border border-ensena-primary px-3 py-1.5 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                          View Student
                        </Link>
                        <button
                          type="button"
                          aria-label={`Message ${s.name}`}
                          onClick={() => router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(s.name)}`)}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Search className="size-8 text-ensena-border" />
                <p className="text-sm font-medium text-ensena-ink">No students found</p>
                <p className="text-xs text-ensena-muted">Try a different filter or search term.</p>
              </div>
            )}
            <p className="border-t border-ensena-border px-4 py-3 text-xs text-ensena-muted">
              Showing {filtered.length} of {students.length} students
            </p>
          </div>

          {/* Mobile list */}
          <div className="mt-5 flex flex-col gap-2.5 lg:hidden">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/tutor-dashboard/students/${s.id}`}
                className="flex items-center gap-3 rounded-xl border border-ensena-border bg-ensena-surface p-3.5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ensena-ink">{s.name}</p>
                  <p className="truncate text-xs text-ensena-muted">{s.subjects.join(", ")} · {s.level}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <span className={cn("rounded-full px-2 py-0.5 font-medium", s.type === "Private" ? "bg-indigo-100 text-indigo-700" : "bg-sky-100 text-sky-700")}>{s.type}</span>
                    <span className="text-ensena-muted">{s.nextLesson ?? "Not scheduled"}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-ensena-ink">{s.progressPct}%</span>
                    <button
                      type="button"
                      aria-label={`Message ${s.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(s.name)}`);
                      }}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </div>
                  <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", s.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    <span className={cn("size-1.5 rounded-full", s.status === "Active" ? "bg-emerald-500" : "bg-amber-500")} /> {s.status}
                  </span>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface py-16 text-center">
                <Search className="size-8 text-ensena-border" />
                <p className="text-sm font-medium text-ensena-ink">No students found</p>
                <p className="text-xs text-ensena-muted">Try a different filter or search term.</p>
              </div>
            )}
            <p className="text-center text-xs text-ensena-muted">
              Showing {filtered.length} of {students.length} students
            </p>
          </div>

          {/* Mobile quick actions strip */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:hidden">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const content = (
                <>
                  <Icon className="size-5 text-ensena-primary" />
                  <span className="mt-1.5 text-xs font-medium text-ensena-ink">{action.label}</span>
                </>
              );
              return action.href ? (
                <Link key={action.label} href={action.href} className="flex flex-col items-center rounded-xl border border-ensena-border bg-ensena-surface p-3 text-center">
                  {content}
                </Link>
              ) : (
                <button key={action.label} type="button" onClick={() => flash(action.stubMessage!)} className="flex flex-col items-center rounded-xl border border-ensena-border bg-ensena-surface p-3 text-center">
                  {content}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop right column */}
        <div className="hidden flex-col gap-4 lg:flex">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Quick Actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                const content = (
                  <>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                      <Icon className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-ensena-ink">{action.label}</span>
                    <ChevronRight className="size-4 text-ensena-muted" />
                  </>
                );
                return action.href ? (
                  <Link key={action.label} href={action.href} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-2.5 hover:bg-ensena-bg-soft">
                    {content}
                  </Link>
                ) : (
                  <button key={action.label} type="button" onClick={() => flash(action.stubMessage!)} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-2.5 text-left hover:bg-ensena-bg-soft">
                    {content}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Needs Attention</h2>
              <button type="button" onClick={() => setStatusFilter("Needs Attention")} className="text-xs font-semibold text-ensena-primary hover:underline">
                View all
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {needsAttention.length === 0 && <p className="text-xs text-ensena-muted">Nothing needs attention right now.</p>}
              {needsAttention.map((s) => (
                <Link key={s.id} href={`/tutor-dashboard/students/${s.id}`} className="flex items-start gap-2 text-xs hover:opacity-80">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  <div>
                    <p className="font-semibold text-ensena-ink">{s.name}</p>
                    <p className="text-ensena-muted">{s.attentionReason}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Top Subjects</h2>
              <span className="text-xs text-ensena-muted">This month</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="size-24 shrink-0 rounded-full"
                style={{ background: subjectCounts.length > 0 ? `conic-gradient(${donutGradient})` : "#f1f1f1" }}
              />
              <div className="flex flex-1 flex-col gap-1.5 text-xs">
                {subjectCounts.map((s) => (
                  <div key={s.subject} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ensena-muted">
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.subject}
                    </span>
                    <span className="font-medium text-ensena-ink">{Math.round((s.count / subjectTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 border-t border-ensena-border pt-3 text-xs text-ensena-muted">
              Total students <span className="float-right font-semibold text-ensena-ink">{students.length}</span>
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </>
  );
}
