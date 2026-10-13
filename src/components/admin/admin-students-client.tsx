"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAccountStatusVersion } from "@/hooks/use-account-status";
import { getAccountStatus, setAccountStatus, type AccountStatus } from "@/lib/account-status-store";
import { adminStudentStatusStyles, initialAdminStudents, type AdminStudent } from "@/lib/admin-data";
import { currentActorLabel } from "@/lib/admin-session";
import { sendMessage } from "@/lib/admin-communications-store";
import { studentProfiles } from "@/lib/admin-student-profile-data";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

type StatusFilter = AccountStatus | "All";
type RiskFilter = "All" | "Low" | "Medium" | "High";

const statusTabs: StatusFilter[] = ["All", "Active", "Suspended", "Banned"];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminStudentsClient() {
  const searchParams = useSearchParams();
  const riskParam = searchParams.get("risk");
  const initialRisk: RiskFilter = riskParam === "Low" || riskParam === "Medium" || riskParam === "High" ? riskParam : "All";
  const statusParam = searchParams.get("status");
  const initialStatus: StatusFilter = statusParam === "Active" || statusParam === "Suspended" || statusParam === "Banned" ? statusParam : "All";

  const [students, setStudents] = useState<AdminStudent[]>(initialAdminStudents);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(initialRisk);
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceSubject, setAnnounceSubject] = useState("");
  const [announceBody, setAnnounceBody] = useState("");
  const router = useRouter();
  useAccountStatusVersion(); // re-render whenever any student's real status changes

  function sendAnnouncement() {
    if (!announceSubject.trim() || !announceBody.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: `${checked.size} selected student${checked.size === 1 ? "" : "s"}`,
      recipientCount: checked.size,
      channels: ["In-App", "Email"],
      subject: announceSubject,
      body: announceBody,
    });
    flash(`Announcement sent to ${checked.size} student${checked.size === 1 ? "" : "s"}.`);
    setAnnounceOpen(false);
    setAnnounceSubject("");
    setAnnounceBody("");
    setChecked(new Set());
  }

  const levels = ["All Levels", ...Array.from(new Set(students.map((s) => s.level)))];

  const filtered = students.filter((s) => {
    const profile = studentProfiles[s.id];
    const matchesStatus = statusFilter === "All" || getAccountStatus("student", s.id).status === statusFilter;
    const matchesRisk = riskFilter === "All" || profile?.riskLevel === riskFilter;
    const matchesLevel = levelFilter === "All Levels" || s.level === levelFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === "" || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    return matchesStatus && matchesRisk && matchesLevel && matchesQuery;
  });

  const allProfiles = students.map((s) => studentProfiles[s.id]).filter(Boolean);
  const avgAttendance = Math.round(allProfiles.reduce((sum, p) => sum + p.attendancePct, 0) / allProfiles.length);
  const avgHomework = Math.round(allProfiles.reduce((sum, p) => sum + p.homeworkCompletionPct, 0) / allProfiles.length);
  const avgLearningScore = Math.round(allProfiles.reduce((sum, p) => sum + p.aiLearningScore, 0) / allProfiles.length);
  const atRiskStudents = students.filter((s) => studentProfiles[s.id]?.riskLevel === "High");
  const activeStudents = students.filter((s) => getAccountStatus("student", s.id).status === "Active");
  const newestMonth = students.reduce((latest, s) => (s.joined > latest ? s.joined : latest), students[0]?.joined ?? "");
  const groupClassStudents = students.filter((s) => (studentProfiles[s.id]?.groupClassesCount ?? 0) > 0);
  const counsellingStudents = students.filter((s) => (studentProfiles[s.id]?.counsellingUpcoming.length ?? 0) > 0);
  const inactiveStudents = students.filter((s) => (studentProfiles[s.id]?.attendancePct ?? 100) < 70);

  const stats = [
    { label: "Total Students", value: students.length },
    { label: "Active Students", value: activeStudents.length },
    { label: "New This Month", value: students.filter((s) => s.joined === newestMonth).length },
    { label: "Online Now", value: Math.round(activeStudents.length * 0.4) },
    { label: "Private Lesson Students", value: students.length - groupClassStudents.length },
    { label: "Group Class Students", value: groupClassStudents.length },
    { label: "Students in Counselling", value: counsellingStudents.length },
    { label: "Avg. Attendance", value: `${avgAttendance}%` },
    { label: "Avg. Homework Completion", value: `${avgHomework}%` },
    { label: "Avg. Learning Score", value: `${avgLearningScore}%` },
    { label: "Students at Risk", value: atRiskStudents.length },
    { label: "Inactive (30+ Days)", value: inactiveStudents.length },
  ];

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openStudent(id: string, e: React.MouseEvent) {
    const href = `/admin/students/${id}`;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Students</h1>
        <p className="mt-1 text-sm text-ensena-muted">The student success management center: learning progress, attendance, and wellbeing.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
            <p className="text-[11px] text-ensena-muted">{s.label}</p>
            <p className="text-lg font-semibold text-ensena-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {atRiskStudents.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-700"><AlertTriangle className="size-4" /> Student Success Alerts</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {atRiskStudents.map((s) => {
              const p = studentProfiles[s.id];
              return (
                <button key={s.id} type="button" onClick={(e) => openStudent(s.id, e)} className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100">
                  {s.name}: {p?.riskFlags[0] ?? "Needs attention"}
                </button>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students by name, email, or ID…"
              className="h-10 w-72 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {levels.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {statusTabs.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskFilter)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {(["All", "Low", "Medium", "High"] as const).map((r) => <option key={r}>{r === "All" ? "All Risk Levels" : `${r} Risk`}</option>)}
          </select>
          <button type="button" onClick={() => downloadCsv([["ID", "Name", "Email", "Level", "Attendance", "Learning Score", "Status"], ...filtered.map((s) => { const p = studentProfiles[s.id]; return [s.id, s.name, s.email, s.level, `${p?.attendancePct}%`, `${p?.aiLearningScore}%`, getAccountStatus("student", s.id).status]; })], "ensena-students.csv")} className="ml-auto flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Download className="size-3.5" /> Export
          </button>
        </div>

        {checked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-ensena-ink">{checked.size} selected</span>
            <button type="button" onClick={() => { checked.forEach((id) => setAccountStatus("student", id, "Suspended", "Bulk admin action", currentActorLabel())); flash("Selected students suspended."); setChecked(new Set()); }} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-amber-600 hover:bg-amber-50">Suspend Selected</button>
            <button type="button" onClick={() => setAnnounceOpen(true)} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Send Announcement</button>
            <button type="button" onClick={() => flash("Assigning a counsellor isn't available in this demo yet. There's a single counsellor (Benny) shared by every student.")} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Assign Counsellor</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="w-8 py-2 pr-2">
                  <input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0} onChange={() => setChecked((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((s) => s.id))))} className="size-3.5 rounded border-ensena-border" />
                </th>
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Academic Level</th>
                <th className="py-2 pr-4 font-medium">Tutors</th>
                <th className="py-2 pr-4 font-medium">Attendance</th>
                <th className="py-2 pr-4 font-medium">Learning Score</th>
                <th className="py-2 pr-4 font-medium">Bookings</th>
                <th className="py-2 pr-4 font-medium">Progress</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const p = studentProfiles[s.id];
                return (
                  <tr key={s.id} className="cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft" onClick={(e) => openStudent(s.id, e)}>
                    <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleCheck(s.id)} className="size-3.5 rounded border-ensena-border" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(s.name)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ensena-ink">{s.name}</p>
                          <p className="truncate text-xs text-ensena-muted">ID: {s.id.toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ensena-muted">{s.level}</td>
                    <td className="py-3 pr-4 text-ensena-ink">{p?.tutors.length ?? 0} Tutors</td>
                    <td className="py-3 pr-4 text-ensena-ink">{p?.attendancePct}%</td>
                    <td className="py-3 pr-4 text-ensena-ink">{p?.aiLearningScore}%</td>
                    <td className="py-3 pr-4 text-ensena-ink">{s.lessonsCompleted} Lessons</td>
                    <td className="py-3 pr-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", p?.progressLabel === "Excellent" ? "bg-emerald-100 text-emerald-700" : p?.progressLabel === "Good" ? "bg-blue-100 text-blue-700" : p?.progressLabel === "Needs Attention" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>
                        {p?.progressLabel}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{(() => { const st = getAccountStatus("student", s.id).status; return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", adminStudentStatusStyles[st])}>{st}</span>; })()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No students match this filter.</p>}
        </div>
      </div>

      <Modal open={announceOpen} onClose={() => setAnnounceOpen(false)} title="Send Announcement">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Sends to {checked.size} selected student{checked.size === 1 ? "" : "s"} via the real messaging/communications log.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={announceSubject} onChange={(e) => setAnnounceSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} rows={4} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button
            onClick={sendAnnouncement}
            disabled={!announceSubject.trim() || !announceBody.trim()}
            className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Announcement
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
