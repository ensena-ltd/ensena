"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Plus,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CounsellorSettingsTab } from "@/components/admin/counsellor-settings-tab";
import {
  counsellingDashboardStats,
  counsellingStatusStyles,
  initialCounsellingAppointments,
  recentCounsellingActivity,
  studentSlug,
  type CounsellingAppointment,
  type CounsellingStatus,
  type RecentActivityType,
} from "@/lib/admin-counselling-data";
import { cn } from "@/lib/utils";

type Tab = "Dashboard" | "Appointments" | "Students" | "Intake Forms" | "Action Plans" | "Counsellor Settings";
const tabs: Tab[] = ["Dashboard", "Appointments", "Students", "Intake Forms", "Action Plans", "Counsellor Settings"];
const appointmentStatusTabs: (CounsellingStatus | "All")[] = ["All", "New Booking", "Upcoming", "In Progress", "Completed", "Follow-up", "Cancelled"];

const activityIconStyles: Record<RecentActivityType, { icon: typeof CalendarPlus; tint: string }> = {
  booking: { icon: CalendarPlus, tint: "bg-blue-100 text-blue-700" },
  intake: { icon: FileText, tint: "bg-purple-100 text-purple-700" },
  session: { icon: Video, tint: "bg-emerald-100 text-emerald-700" },
  "action-plan": { icon: ClipboardList, tint: "bg-amber-100 text-amber-700" },
};

export function AdminCounsellingDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabs.includes(tabParam as Tab) ? (tabParam as Tab) : "Dashboard";

  const [appointments, setAppointments] = useState<CounsellingAppointment[]>(initialCounsellingAppointments);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [apptStatusFilter, setApptStatusFilter] = useState<CounsellingStatus | "All">("All");
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  function setTab(next: Tab) {
    router.push(next === "Dashboard" ? "/admin/counsellors" : `/admin/counsellors?tab=${encodeURIComponent(next)}`);
  }

  function goToAppointments(status: CounsellingStatus | "All") {
    setApptStatusFilter(status);
    setTab("Appointments");
  }

  function scheduleAppointment(entry: { student: string; level: string; dateLabel: string; time: string }) {
    const id = `cns-${appointments.length + 1}`;
    setAppointments((prev) => [
      ...prev,
      {
        id,
        student: entry.student,
        studentImage: "/teacher-1.jpg.png",
        level: entry.level || "—",
        exam: "—",
        dateISO: "2026-08-27",
        dateLabel: entry.dateLabel || "Aug 27, 2026",
        time: entry.time || "4:00 PM",
        endTime: entry.time || "4:00 PM",
        durationMinutes: 30,
        status: "Upcoming",
        bookedLabel: "Just now",
        bookedAgo: "Just now",
        intakeReviewed: true,
        intake: { concerns: [], message: "Scheduled directly by admin.", academicLevel: entry.level || "—", subjects: [], examGoal: "No specific exam", goalText: "", supportPreferences: [] },
        aiSummary: { summary: "Manually scheduled by an admin. No intake submitted yet.", suggestedTopics: [] },
      },
    ]);
    setScheduleOpen(false);
    flash(`Appointment scheduled for ${entry.student}.`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{tab === "Counsellor Settings" ? "Counsellor Settings" : "Counselling"}</h1>
          <p className="mt-1 text-sm text-ensena-muted">
            {tab === "Counsellor Settings" ? "Manage your profile, availability and counselling session preferences." : "Manage student sessions, intake forms and follow-ups."}
          </p>
        </div>
        {tab !== "Counsellor Settings" && (
          <Button onClick={() => setScheduleOpen(true)} className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
            <Plus className="size-4" /> Schedule Appointment
          </Button>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dashboard" && <DashboardTab appointments={appointments} onNavigateStatus={goToAppointments} onNavigateTab={setTab} />}

      {tab === "Appointments" && (
        <AppointmentsTab appointments={appointments} statusFilter={apptStatusFilter} setStatusFilter={setApptStatusFilter} />
      )}

      {tab === "Students" && <StudentsTab appointments={appointments} />}

      {tab === "Intake Forms" && <IntakeFormsTab appointments={appointments} />}

      {tab === "Action Plans" && <ActionPlansTab appointments={appointments} />}

      {tab === "Counsellor Settings" && <CounsellorSettingsTab />}

      <Modal open={scheduleOpen} onClose={() => setScheduleOpen(false)} title="Schedule Appointment">
        <ScheduleAppointmentForm onSubmit={scheduleAppointment} onCancel={() => setScheduleOpen(false)} />
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

function ScheduleAppointmentForm({ onSubmit, onCancel }: { onSubmit: (e: { student: string; level: string; dateLabel: string; time: string }) => void; onCancel: () => void }) {
  const [student, setStudent] = useState("");
  const [level, setLevel] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [time, setTime] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ensena-muted">Books directly onto Benny&apos;s schedule. This should only be used for sessions arranged outside the normal student booking flow.</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ensena-muted">Student name</span>
        <input value={student} onChange={(e) => setStudent(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-ensena-muted">Academic level</span>
        <input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. SSS2" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Date</span>
          <input value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} placeholder="Aug 27, 2026" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Time</span>
          <input value={time} onChange={(e) => setTime(e.target.value)} placeholder="4:00 PM" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>
      </div>
      <div className="mt-1 flex gap-2">
        <Button variant="outline" onClick={onCancel} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
        <Button disabled={!student.trim()} onClick={() => onSubmit({ student: student.trim(), level: level.trim(), dateLabel: dateLabel.trim(), time: time.trim() })} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-40">
          Schedule
        </Button>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================

function DashboardTab({
  appointments,
  onNavigateStatus,
  onNavigateTab,
}: {
  appointments: CounsellingAppointment[];
  onNavigateStatus: (s: CounsellingStatus | "All") => void;
  onNavigateTab: (t: Tab) => void;
}) {
  const todaysSessions = appointments.filter((a) => a.dateLabel === "Today" && a.status === "Upcoming");
  const newBookings = appointments.filter((a) => a.status === "New Booking");
  const followUps = appointments.filter((a) => a.status === "Follow-up" && a.followUp?.needed);

  const statCards = [
    { label: "Today's Appointments", value: counsellingDashboardStats.todaysAppointments, sub: "Sessions scheduled today", icon: CalendarCheck, tint: "bg-rose-100 text-rose-600", onClick: () => onNavigateStatus("Upcoming") },
    { label: "New Bookings", value: counsellingDashboardStats.newBookings, sub: "New bookings to review", icon: CalendarPlus, tint: "bg-purple-100 text-purple-600", onClick: () => onNavigateStatus("New Booking") },
    { label: "Upcoming", value: counsellingDashboardStats.upcomingNext7Days, sub: "Next 7 days", icon: Clock, tint: "bg-blue-100 text-blue-600", onClick: () => onNavigateStatus("Upcoming") },
    { label: "Completed", value: counsellingDashboardStats.completedThisMonth, sub: "This month", icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-600", onClick: () => onNavigateStatus("Completed") },
    { label: "Follow-ups", value: counsellingDashboardStats.followUpsDue, sub: "Students requiring follow-up", icon: Users, tint: "bg-amber-100 text-amber-600", onClick: () => onNavigateTab("Students") },
  ];

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {statCards.map((c) => (
          <button key={c.label} type="button" onClick={c.onClick} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4 text-left transition-colors hover:border-ensena-primary/40">
            <div className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}>
              <c.icon className="size-4.5" />
            </div>
            <p className="mt-2.5 text-2xl font-semibold text-ensena-ink">{c.value}</p>
            <p className="text-xs font-medium text-ensena-ink">{c.label}</p>
            <p className="truncate text-[11px] text-ensena-muted">{c.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Counselling Sessions</h2>
            <button type="button" onClick={() => onNavigateStatus("Upcoming")} className="text-xs font-semibold text-ensena-primary hover:underline">View All Appointments →</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Level</th>
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {todaysSessions.map((a, i) => (
                  <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                        <span className="font-medium text-ensena-ink">{a.student}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-ensena-muted">{a.level}</td>
                    <td className="py-3 pr-3 text-ensena-ink">{a.time}</td>
                    <td className="py-3 pr-3 text-ensena-muted">{a.intake.concerns[0] ?? "General support"}</td>
                    <td className="py-3 pr-3 text-ensena-muted"><span className="inline-flex items-center gap-1"><Video className="size-3.5" /> Video Call</span></td>
                    <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", counsellingStatusStyles[a.status])}>{a.status}</span></td>
                    <td className="py-3 pr-3 text-right">
                      {i === 0 ? (
                        <Link href={`/admin/counsellors/${a.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">Start Session</Link>
                      ) : (
                        <Link href={`/admin/counsellors/${a.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View</Link>
                      )}
                    </td>
                  </tr>
                ))}
                {todaysSessions.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-ensena-muted">No sessions scheduled today.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">New Counselling Bookings</h2>
            <button type="button" onClick={() => onNavigateStatus("New Booking")} className="text-xs font-semibold text-ensena-primary hover:underline">View All →</button>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {newBookings.map((a) => (
              <li key={a.id} className="rounded-xl border border-ensena-border p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="36px" className="object-cover" /></div>
                    <div>
                      <p className="text-sm font-semibold text-ensena-ink">{a.student}</p>
                      <p className="text-xs text-ensena-muted">{a.level} · {a.exam}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">New</span>
                </div>
                <p className="mt-2 text-xs text-ensena-muted">{a.intake.concerns[0] ?? "General support"}</p>
                <p className="mt-1 text-[11px] text-ensena-muted">Booked {a.bookedLabel}</p>
                <Link href={`/admin/counsellors/${a.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                  Review Intake
                </Link>
              </li>
            ))}
            {newBookings.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No new bookings to review.</p>}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Students Requiring Follow-up</h2>
            <button type="button" onClick={() => onNavigateTab("Students")} className="text-xs font-semibold text-ensena-primary hover:underline">View All →</button>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {followUps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ensena-ink">{a.student}</p>
                    <p className="truncate text-xs text-ensena-muted">{a.level} · Last session: {a.dateLabel}</p>
                  </div>
                </div>
                <Link href={`/admin/counsellors/students/${studentSlug(a.student)}`} className="shrink-0 rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                  Follow-up due {a.followUp?.date}
                </Link>
              </li>
            ))}
            {followUps.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No students currently need follow-up.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Counselling Activity</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {recentCounsellingActivity.map((a) => {
              const { icon: Icon, tint } = activityIconStyles[a.type];
              return (
                <li key={a.id} className="flex items-start gap-2.5">
                  <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", tint)}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-ensena-ink">{a.title}</p>
                    <p className="text-ensena-muted">{a.description}</p>
                    <p className="mt-0.5 text-[10px] text-ensena-muted/80">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ==================== APPOINTMENTS ====================

function AppointmentsTab({
  appointments,
  statusFilter,
  setStatusFilter,
}: {
  appointments: CounsellingAppointment[];
  statusFilter: CounsellingStatus | "All";
  setStatusFilter: (s: CounsellingStatus | "All") => void;
}) {
  const filtered = appointments.filter((a) => statusFilter === "All" || a.status === statusFilter);
  const sorted = [...filtered].sort((a, b) => b.dateISO.localeCompare(a.dateISO));

  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex flex-wrap gap-1.5">
        {appointmentStatusTabs.map((s) => (
          <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", statusFilter === s ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Level</th>
              <th className="py-2 pr-3 font-medium">Date &amp; Time</th>
              <th className="py-2 pr-3 font-medium">Reason</th>
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                    <span className="font-medium text-ensena-ink">{a.student}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{a.level}</td>
                <td className="py-3 pr-3 text-ensena-muted">
                  <p className="text-ensena-ink">{a.dateLabel}</p>
                  <p>{a.time}</p>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{a.intake.concerns[0] ?? "General support"}</td>
                <td className="py-3 pr-3 text-ensena-muted"><span className="inline-flex items-center gap-1"><Video className="size-3.5" /> Video</span></td>
                <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", counsellingStatusStyles[a.status])}>{a.status}</span></td>
                <td className="py-3 pr-3 text-right">
                  <Link href={`/admin/counsellors/${a.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                    {a.status === "New Booking" ? "Review Intake" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-ensena-muted">No appointments match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== STUDENTS ====================

interface CounsellingStudentSummary {
  student: string;
  studentImage: string;
  level: string;
  mainConcern: string;
  lastSessionLabel: string;
  followUpDate: string;
  status: "Active" | "Completed";
}

function summarizeStudents(appointments: CounsellingAppointment[]): CounsellingStudentSummary[] {
  const byStudent = new Map<string, CounsellingAppointment[]>();
  for (const a of appointments) {
    const list = byStudent.get(a.student) ?? [];
    list.push(a);
    byStudent.set(a.student, list);
  }
  return Array.from(byStudent.entries()).map(([student, list]) => {
    const sorted = [...list].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    const latest = sorted[0];
    const hasActive = list.some((a) => a.status === "Upcoming" || a.status === "New Booking" || a.status === "In Progress" || (a.status === "Follow-up" && a.followUp?.needed));
    return {
      student,
      studentImage: latest.studentImage,
      level: latest.level,
      mainConcern: latest.intake.concerns[0] ?? "General support",
      lastSessionLabel: latest.dateLabel,
      followUpDate: list.find((a) => a.followUp?.needed)?.followUp?.date ?? "—",
      status: hasActive ? "Active" : "Completed",
    };
  });
}

function StudentsTab({ appointments }: { appointments: CounsellingAppointment[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const students = useMemo(() => summarizeStudents(appointments), [appointments]);
  const filtered = students.filter((s) => query.trim() === "" || s.student.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Counselling Students</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students…" className="h-10 w-56 rounded-full border border-ensena-border px-4 text-sm" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Level</th>
              <th className="py-2 pr-3 font-medium">Main Concern</th>
              <th className="py-2 pr-3 font-medium">Last Session</th>
              <th className="py-2 pr-3 font-medium">Follow-up</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.student}
                onClick={(e) => {
                  const href = `/admin/counsellors/students/${studentSlug(s.student)}`;
                  if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
                  else router.push(href);
                }}
                className="cursor-pointer border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft"
              >
                <td className="py-3 pr-3">
                  <Link href={`/admin/counsellors/students/${studentSlug(s.student)}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={s.studentImage} alt={s.student} fill sizes="32px" className="object-cover" /></div>
                    <span className="font-medium text-ensena-ink">{s.student}</span>
                  </Link>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{s.level}</td>
                <td className="py-3 pr-3 text-ensena-muted">{s.mainConcern}</td>
                <td className="py-3 pr-3 text-ensena-muted">{s.lastSessionLabel}</td>
                <td className="py-3 pr-3 text-ensena-muted">{s.followUpDate}</td>
                <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", s.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-ensena-bg-soft text-ensena-muted")}>{s.status}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-ensena-muted">No students match this search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== INTAKE FORMS ====================

function IntakeFormsTab({ appointments }: { appointments: CounsellingAppointment[] }) {
  const sorted = [...appointments].sort((a, b) => (a.intakeReviewed === b.intakeReviewed ? 0 : a.intakeReviewed ? 1 : -1));

  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Intake Forms</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Level</th>
              <th className="py-2 pr-3 font-medium">Main Concern</th>
              <th className="py-2 pr-3 font-medium">Submitted</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                    <span className="font-medium text-ensena-ink">{a.student}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{a.level}</td>
                <td className="py-3 pr-3 text-ensena-muted">{a.intake.concerns[0] ?? "General support"}</td>
                <td className="py-3 pr-3 text-ensena-muted">{a.bookedLabel}</td>
                <td className="py-3 pr-3">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", a.intakeReviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                    {a.intakeReviewed ? "Reviewed" : "New"}
                  </span>
                </td>
                <td className="py-3 pr-3 text-right">
                  <Link href={`/admin/counsellors/${a.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                    {a.intakeReviewed ? "View" : "Review"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== ACTION PLANS ====================

function ActionPlansTab({ appointments }: { appointments: CounsellingAppointment[] }) {
  const plans = appointments.filter((a) => a.actionPlan);

  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Action Plans</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium">Progress</th>
              <th className="py-2 pr-3 font-medium">Follow-up</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((a) => {
              const plan = a.actionPlan!;
              const done = plan.tasks.filter((t) => t.status === "Done").length;
              return (
                <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-3">
                    <Link href={`/admin/counsellors/students/${studentSlug(a.student)}`} className="flex items-center gap-2">
                      <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.studentImage} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{a.student}</span>
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-ensena-muted">{plan.title}</td>
                  <td className="py-3 pr-3 text-ensena-ink">{done}/{plan.tasks.length}</td>
                  <td className="py-3 pr-3 text-ensena-muted">{a.followUp?.date ?? "—"}</td>
                  <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", done === plan.tasks.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{done === plan.tasks.length ? "Completed" : "In Progress"}</span></td>
                </tr>
              );
            })}
            {plans.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-ensena-muted">No action plans yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
