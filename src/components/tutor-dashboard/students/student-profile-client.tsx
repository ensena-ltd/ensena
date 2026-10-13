"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Calendar,
  ChevronRight,
  Clock,
  Fingerprint,
  GraduationCap,
  Hash,
  Info,
  Lightbulb,
  MessageSquare,
  Pencil,
  Repeat,
  School,
  Target,
  UserCircle,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildBookingReference } from "@/lib/booking-reference";
import {
  initialPrivateLessons,
  privateLessonStatusStyles,
  type PrivateLesson,
  type StudentRecord,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// The Student ID shown here is the platform's shared STDxxxxxxxx reference
// code, deterministically derived from the student's own real internal id
// via buildBookingReference — same system as every other reference code in
// the app, replacing a previous ad hoc "STU-2024-0007" hash format.
function studentIdFor(student: StudentRecord): string {
  return buildBookingReference("student", student.id);
}

function parseHour(time: string): number {
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 12;
  let hours = parseInt(match[1], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours;
}

function preferredTimeFor(name: string): string {
  const lessons = initialPrivateLessons.filter((l) => l.student === name);
  if (lessons.length === 0) return "Not set yet";
  const avgHour = lessons.reduce((sum, l) => sum + parseHour(l.time), 0) / lessons.length;
  if (avgHour < 12) return "Mornings (8AM – 12PM)";
  if (avgHour < 17) return "Afternoons (12PM – 5PM)";
  return "Evenings (5PM – 9PM)";
}

// Approximated from how many lessons this student has on the books in the
// demo dataset — not a literal weekly recurrence rule.
function classFrequencyFor(name: string): string {
  const count = initialPrivateLessons.filter((l) => l.student === name).length;
  if (count >= 3) return `${count} times a week`;
  if (count === 2) return "Twice a week";
  if (count === 1) return "Once a week";
  return "Not scheduled yet";
}

function nextLessonRecordFor(name: string): PrivateLesson | null {
  const upcoming = initialPrivateLessons
    .filter((l) => l.student === name && l.status === "Upcoming")
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

export function StudentProfileClient({ student }: { student: StudentRecord }) {
  const router = useRouter();
  const [notes, setNotes] = useState(student.notes);
  const [editingNotes, setEditingNotes] = useState(false);
  const [showAllLessons, setShowAllLessons] = useState(false);

  const studentId = studentIdFor(student);
  const preferredTime = preferredTimeFor(student.name);
  const classFrequency = classFrequencyFor(student.name);
  const nextLesson = nextLessonRecordFor(student.name);
  const allLessons = initialPrivateLessons
    .filter((l) => l.student === student.name)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recentLessons = showAllLessons ? allLessons : allLessons.slice(0, 5);
  // The booking a tutor would actually reference when following up on this
  // student — their next upcoming lesson, or their most recent one if
  // nothing's scheduled. Reuses the app's one existing booking-reference
  // system (booking-reference.ts) rather than inventing a separate id.
  const primaryBookingLesson = nextLesson ?? recentLessons[0] ?? null;
  const primaryBookingId = primaryBookingLesson ? primaryBookingLesson.bookingReference : null;

  const metaRow = [
    { icon: Calendar, label: "Learning since", value: student.memberSince },
    { icon: Fingerprint, label: "Student ID", value: studentId },
    { icon: Clock, label: "Preferred time", value: preferredTime },
    { icon: Repeat, label: "Class frequency", value: classFrequency },
    ...(primaryBookingId ? [{ icon: Hash, label: "Booking ID", value: primaryBookingId }] : []),
  ];

  const overviewRow = [
    { icon: Target, label: "Learning Goal", value: `${student.level.split(" / ")[0]} ${student.subjects[0]}` },
    { icon: GraduationCap, label: "Academic Level", value: student.level },
    { icon: BadgeCheck, label: "Lessons Completed", value: String(student.lessonsCompleted) },
    { icon: UserCircle, label: "Attendance", value: `${student.attendancePct}%` },
  ];

  // Deliberately no email, phone, parent/guardian, address, date of birth or
  // payment information here — tutors only see what's needed to teach.
  const infoRows = [
    { icon: BadgeCheck, label: "Subjects", value: student.subjects.join(", ") },
    { icon: Target, label: "Exam Focus", value: student.level },
    { icon: School, label: "School (Optional)", value: "Not provided" },
    { icon: Lightbulb, label: "Learning Style", value: "Not set yet" },
    { icon: MessageSquare, label: "Preferred Communication", value: "In-app messages" },
  ];

  return (
    <div>
      <Link
        href="/tutor-dashboard/students"
        className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
      >
        ← Back to Students
      </Link>

      {/* Header card */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xl font-semibold text-ensena-primary">
              {initials(student.name)}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-semibold text-ensena-ink">{student.name}</h1>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
              <p className="text-sm text-ensena-muted">{student.subjects[0]} · Private Student</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/tutor-dashboard/messages?student=${encodeURIComponent(student.name)}`)}
                  className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium"
                >
                  <MessageSquare className="size-4" /> Message
                </Button>
                {nextLesson && (
                  <Button
                    nativeButton={false}
                    render={<Link href={`/tutor-dashboard/classroom/private/${nextLesson.id}`} />}
                    className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
                  >
                    <Calendar className="size-4" /> Enter Next Class
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-1 lg:gap-3 lg:text-right">
            {metaRow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 lg:justify-end">
                  <Icon className="size-4 shrink-0 text-ensena-muted lg:order-2" />
                  <div className="lg:order-1">
                    <p className="text-xs text-ensena-muted">{item.label}</p>
                    <p className="text-sm font-medium text-ensena-ink">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Overview */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Overview</h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {overviewRow.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ensena-bg-soft text-ensena-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-ensena-muted">{item.label}</p>
                    <p className="text-sm font-semibold leading-tight text-ensena-ink">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t border-ensena-border pt-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                Learning Progress <Info className="size-3.5 text-ensena-muted" />
              </p>
              <p className="text-lg font-semibold text-ensena-primary">{student.progressPct}%</p>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
              <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${student.progressPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-ensena-muted">Overall progress based on recorded assessments and class performance.</p>
          </div>
        </div>

        {/* Next Class */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Next Class</h2>
          {nextLesson ? (
            <>
              <div className="mt-3 flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary">
                  <Calendar className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{nextLesson.subject}</p>
                  <p className="text-sm text-ensena-muted">{nextLesson.date}</p>
                  <p className="text-sm text-ensena-muted">{nextLesson.time}</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">{nextLesson.mode}</p>
                </div>
              </div>
              <Button
                nativeButton={false}
                render={<Link href={`/tutor-dashboard/classroom/private/${nextLesson.id}`} />}
                className="mt-4 h-10 w-full rounded-full border border-ensena-primary bg-white text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
              >
                <Video className="size-4" /> Enter Classroom
              </Button>
              <button type="button" className="mt-2 flex w-full items-center justify-center text-sm font-semibold text-ensena-primary hover:underline">
                Reschedule Class
              </button>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-medium text-rose-600">No upcoming lesson</p>
              <Link
                href="/tutor-dashboard/private-lessons?tab=Calendar"
                className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                <Calendar className="size-4" /> Schedule a Lesson
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent Lessons */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Lessons</h2>
            {allLessons.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllLessons((v) => !v)}
                className="text-sm font-semibold text-ensena-primary hover:underline"
              >
                {showAllLessons ? "Show less" : "View All"}
              </button>
            )}
          </div>
          {recentLessons.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">No lessons recorded yet.</p>
          ) : (
            <>
              <div className="mt-3 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Topic</th>
                      <th className="py-2 pr-4 font-medium">Duration</th>
                      <th className="py-2 pr-4 font-medium">Booking ID</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Your Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLessons.map((l) => (
                      <tr key={l.id} className="border-b border-ensena-border last:border-0">
                        <td className="py-2.5 pr-4 text-ensena-muted">{l.date}</td>
                        <td className="py-2.5 pr-4 font-medium text-ensena-ink">{l.subject}</td>
                        <td className="py-2.5 pr-4 text-ensena-muted">{l.duration}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-ensena-muted">{l.bookingReference}</td>
                        <td className="py-2.5 pr-4">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", privateLessonStatusStyles[l.status])}>
                            {l.status}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate py-2.5 text-ensena-muted">{l.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="mt-3 flex flex-col divide-y divide-ensena-border lg:hidden">
                {recentLessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ensena-ink">{l.date} · {l.subject}</p>
                      <p className="truncate font-mono text-xs text-ensena-muted">{l.bookingReference}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", privateLessonStatusStyles[l.status])}>
                      {l.status}
                    </span>
                  </li>
                ))}
              </ul>
              {allLessons.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllLessons((v) => !v)}
                  className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft lg:hidden"
                >
                  {showAllLessons ? "Show less" : "View All Lessons"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Tutor Notes */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Tutor Notes</h2>
            <button
              type="button"
              onClick={() => setEditingNotes((v) => !v)}
              className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
            >
              <Pencil className="size-3.5" /> {editingNotes ? "Done" : "Edit Notes"}
            </button>
          </div>
          {editingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="mt-3 w-full rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink"
            />
          ) : (
            <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-ensena-ink">{notes}</p>
          )}
        </div>
      </div>

      {/* Student Information */}
      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:p-6">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Student Information</h2>
        <div className="mt-3 grid grid-cols-1 divide-y divide-ensena-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {infoRows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-center justify-between gap-3 py-3 sm:pr-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ensena-bg-soft text-ensena-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-ensena-muted">{row.label}</p>
                    <p className="truncate text-sm font-medium text-ensena-ink">{row.value}</p>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-ensena-muted" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
