"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Circle,
  FileText,
  MessageSquare,
  MonitorPlay,
  RefreshCcw,
  Lightbulb,
  Star,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { FullDetailsPageLayout, type FullDetailsAction } from "@/components/admin/shared/full-details-page-layout";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { splitEarnings } from "@/lib/commission";
import { currentActorLabel } from "@/lib/admin-session";
import { sendMessage } from "@/lib/admin-communications-store";
import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useTutorRating } from "@/hooks/use-reviews";
import { escrowNet, groupSessionSummaries } from "@/lib/escrow-release";
import { buildBookingReference } from "@/lib/booking-reference";
import {
  groupClassStatusStyles,
  initialGroupClasses,
  sessionStatusStyles,
  type GroupClassRow,
  type GroupClassStatus,
  type RosterStudent,
} from "@/lib/admin-group-classes-data";
import { cn } from "@/lib/utils";

type MoreSection = "Escrow" | "Homework" | "Classroom" | "Reviews" | "Certificates" | "Activity Log";
const moreSections: MoreSection[] = ["Escrow", "Homework", "Classroom", "Reviews", "Certificates", "Activity Log"];

export function GroupClassFullDetailsClient({ classId }: { classId: string }) {
  const router = useRouter();
  const initial = initialGroupClasses.find((c) => c.id === classId) as GroupClassRow;
  const [groupClass, setGroupClass] = useState<GroupClassRow>(initial);
  const [moreSection, setMoreSection] = useState<MoreSection>("Escrow");
  const { lessons: escrowLessons } = useLessonConfirmations();
  const liveRating = useTutorRating(groupClass.tutor, groupClass.rating, groupClass.reviewCount);
  // Best-effort join: this admin GroupClassRow and the tutor's own
  // MyGroupClass (the record the Virtual Classroom actually writes escrow
  // data against) live in separate, independently-authored id spaces — a
  // known, already-accepted seam elsewhere in this app (see classroom-data.ts).
  // Matching on tutor name is the same name-based joining convention already
  // used throughout the admin dashboard (e.g. dispute review's
  // sourceTutor/sourceStudent lookups). A tutor with more than one class on
  // the admin side will see all of their real sessions here regardless of
  // which specific class they belong to, until a real shared id exists.
  const realSessions = groupSessionSummaries(escrowLessons, { tutor: groupClass.tutor });
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentName, setAddStudentName] = useState("");
  const [removingStudent, setRemovingStudent] = useState<RosterStudent | null>(null);
  const [refundingStudent, setRefundingStudent] = useState<RosterStudent | null>(null);
  const [msgTutorOpen, setMsgTutorOpen] = useState(false);
  const [msgStudentsOpen, setMsgStudentsOpen] = useState(false);
  const [msgStudentsSubject, setMsgStudentsSubject] = useState("");
  const [msgStudentsBody, setMsgStudentsBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  // Real broadcast record — same sendMessage(...) store admin-communications-client.tsx
  // already writes to for a defined audience, reused here instead of a
  // second, disconnected "message sent" toast with nothing behind it.
  function sendMessageToStudents() {
    if (!msgStudentsSubject.trim() || !msgStudentsBody.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: `${groupClass.title} (enrolled students)`,
      recipientCount: groupClass.studentsEnrolled,
      channels: ["In-App"],
      subject: msgStudentsSubject.trim(),
      body: msgStudentsBody.trim(),
    });
    flash(`Message sent to all ${groupClass.studentsEnrolled} students.`);
    setMsgStudentsSubject("");
    setMsgStudentsBody("");
    setMsgStudentsOpen(false);
  }

  function updateClass(patch: Partial<GroupClassRow>) {
    setGroupClass((prev) => ({ ...prev, ...patch }));
  }

  function setStatus(status: GroupClassStatus) {
    updateClass({ status });
  }

  const split = splitEarnings(groupClass.revenue);

  function releaseEscrowLine() {
    setGroupClass((prev) => {
      const idx = prev.escrow.log.findIndex((l) => l.status === "Scheduled");
      if (idx === -1) return prev;
      const log = prev.escrow.log.map((l, i) => (i === idx ? { ...l, status: "Released" as const } : l));
      return { ...prev, escrow: { ...prev.escrow, log, released: prev.escrow.released + prev.escrow.perSessionAmount, totalHeld: Math.max(0, prev.escrow.totalHeld - prev.escrow.perSessionAmount) } };
    });
    flash("Escrow released for next completed session.");
  }

  // Mirrors releaseEscrowLine's own pattern exactly (same log-entry lookup,
  // same real state mutation) — the money moves into `frozen` instead of
  // `released`, and out of `totalHeld` either way.
  function freezeEscrowLine() {
    setGroupClass((prev) => {
      const idx = prev.escrow.log.findIndex((l) => l.status === "Scheduled");
      if (idx === -1) return prev;
      const log = prev.escrow.log.map((l, i) => (i === idx ? { ...l, status: "Frozen" as const } : l));
      return { ...prev, escrow: { ...prev.escrow, log, frozen: prev.escrow.frozen + prev.escrow.perSessionAmount, totalHeld: Math.max(0, prev.escrow.totalHeld - prev.escrow.perSessionAmount) } };
    });
    flash(`Escrow frozen for ${groupClass.classCode}.`);
  }

  function addStudent() {
    if (!addStudentName.trim()) return;
    updateClass({
      studentsEnrolled: groupClass.studentsEnrolled + 1,
      students: [
        ...groupClass.students,
        { id: `st-new-${Date.now()}`, name: addStudentName.trim(), image: "/teacher-1.jpg.png", attendancePct: 100, homeworkPct: 100, avgScore: 0, paymentStatus: "Paid", sessionsPaid: groupClass.sessionsTotal, amountPaid: groupClass.sessionsTotal * groupClass.pricePerSession, certificateEligible: false },
      ],
    });
    flash(`${addStudentName.trim()} added to ${groupClass.title}.`);
    setAddStudentName("");
    setAddStudentOpen(false);
  }
  function confirmRemoveStudent() {
    if (!removingStudent) return;
    updateClass({ studentsEnrolled: Math.max(0, groupClass.studentsEnrolled - 1), students: groupClass.students.filter((s) => s.id !== removingStudent.id) });
    flash(`${removingStudent.name} removed from the class.`);
    setRemovingStudent(null);
  }
  function confirmRefundStudent() {
    if (!refundingStudent) return;
    updateClass({ students: groupClass.students.map((s) => (s.id === refundingStudent.id ? { ...s, paymentStatus: "Refunded" } : s)) });
    flash(`Refund issued to ${refundingStudent.name}.`);
    setRefundingStudent(null);
  }
  function confirmCancelClass() {
    setStatus("Cancelled");
    flash("Class cancelled. Remaining escrow has been frozen.");
    setCancelling(false);
  }

  const actions: FullDetailsAction[] = [
    ...(groupClass.status === "Live"
      ? [
          { key: "join", label: "Join Class", onClick: () => router.push(`/admin/classroom-join/${groupClass.id}`), variant: "success" as const },
          { key: "observe", label: "Observe", onClick: () => router.push(`/admin/group-classes/${groupClass.id}/observe`) },
        ]
      : []),
    { key: "message", label: "Message Tutor", onClick: () => setMsgTutorOpen(true) },
    ...(groupClass.status !== "Cancelled" && groupClass.status !== "Archived"
      ? [{ key: "cancel", label: "Cancel Class", onClick: () => setCancelling(true), variant: "danger" as const }]
      : []),
    {
      key: "export",
      label: "Export Report",
      onClick: () =>
        downloadCsv(
          [
            ["Field", "Value"],
            ["Title", groupClass.title],
            ["Tutor", groupClass.tutor],
            ["Subject", groupClass.subject],
            ["Students", groupClass.studentsEnrolled],
            ["Revenue", groupClass.revenue],
            ["Status", groupClass.status],
          ],
          `${groupClass.title.replace(/\s+/g, "-").toLowerCase()}-report.csv`
        ),
    },
  ];

  return (
    <div>
      <FullDetailsPageLayout
        backHref="/admin/group-classes"
        backLabel="Back to Group Classes"
        name={groupClass.title}
        subtitle={`${groupClass.classCode} · ${groupClass.tutor} · Created ${groupClass.createdDate}`}
        badges={
          <>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", groupClassStatusStyles[groupClass.status])}>{groupClass.status}</span>
            <span className="rounded-full bg-ensena-primary/10 px-2.5 py-0.5 text-xs font-medium text-ensena-primary">{groupClass.subject}</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">{groupClass.academicLevel}</span>
          </>
        }
        actions={actions}
        tabs={[
          {
            key: "overview",
            label: "Overview",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Students</p><p className="text-lg font-semibold text-ensena-ink">{groupClass.studentsEnrolled} / {groupClass.maxStudents}</p><p className="text-xs text-ensena-muted">{Math.round((groupClass.studentsEnrolled / groupClass.maxStudents) * 100)}% Filled</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Revenue</p><p className="text-lg font-semibold text-ensena-ink">{formatNaira(split.gross)}</p><p className="text-xs text-ensena-muted">Gross Revenue</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Tutor Earnings</p><p className="text-lg font-semibold text-ensena-success">{formatNaira(split.net)}</p><p className="text-xs text-ensena-muted">After commission (15%)</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Rating</p><p className="flex items-center gap-1 text-lg font-semibold text-ensena-ink"><Star className="size-4 fill-amber-400 text-amber-400" /> {liveRating.rating || "N/A"}</p><p className="text-xs text-ensena-muted">{liveRating.reviews} reviews</p></div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Schedule</p>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-ensena-muted">Days</dt><dd className="text-ensena-ink">{groupClass.scheduleDays.split(",").join(", ")}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Time</dt><dd className="text-ensena-ink">{groupClass.scheduleTime}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Start Date</dt><dd className="text-ensena-ink">{groupClass.startDate}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">End Date</dt><dd className="text-ensena-ink">{groupClass.endDate}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Timezone</dt><dd className="text-ensena-ink">{groupClass.timezone}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Meeting Link</dt><dd className="truncate text-ensena-primary">{groupClass.meetingLink}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-ensena-border p-4">
                    <p className="text-sm font-semibold text-ensena-ink">Class Info</p>
                    <dl className="mt-2 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between"><dt className="text-ensena-muted">Mode</dt><dd className="text-ensena-ink">{groupClass.mode}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Max Students</dt><dd className="text-ensena-ink">{groupClass.maxStudents}</dd></div>
                      {groupClass.classGrade && (
                        <div className="flex justify-between"><dt className="text-ensena-muted">Class</dt><dd className="text-ensena-ink">{groupClass.classGrade}</dd></div>
                      )}
                      <div className="flex justify-between"><dt className="text-ensena-muted">Educational Level</dt><dd className="text-ensena-ink">{groupClass.academicLevel}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Language</dt><dd className="text-ensena-ink">{groupClass.language}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Weekly Homework</dt><dd className="text-ensena-ink">{groupClass.weeklyHomework ? "Yes" : "No"}</dd></div>
                      <div className="flex justify-between"><dt className="text-ensena-muted">Certificate</dt><dd className="text-ensena-ink">{groupClass.certificateOnCompletion ? "Issued on Completion" : "None"}</dd></div>
                    </dl>
                  </div>
                </div>

                <div className="rounded-2xl border border-ensena-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ensena-ink">Class Progress</p>
                    <span className="text-sm font-medium text-ensena-primary">{Math.round((groupClass.sessionsCompleted / groupClass.sessionsTotal) * 100) || 0}% Completed</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${Math.round((groupClass.sessionsCompleted / groupClass.sessionsTotal) * 100) || 0}%` }} /></div>
                  <p className="mt-2 text-sm text-ensena-muted">{groupClass.sessionsCompleted} sessions completed · {Math.max(0, groupClass.sessionsTotal - groupClass.sessionsCompleted)} sessions remaining</p>
                </div>

                <div className="rounded-2xl bg-ensena-primary/5 p-4">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><Lightbulb className="size-4 text-ensena-primary" /> Class Insight</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ensena-muted">
                    {groupClass.aiInsights.map((insight, i) => <li key={i}>{insight}</li>)}
                  </ul>
                </div>

                <div className="rounded-2xl border border-ensena-border p-4">
                  <p className="text-sm font-semibold text-ensena-ink">Quick Actions</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <button type="button" onClick={() => flash("Editing a class's details isn't available in this demo yet.")} className="flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft"><FileText className="size-4" /> Edit Class</button>
                    <button
                      type="button"
                      disabled={!groupClass.classroom.recordingAvailable}
                      onClick={() => flash("Enseña's classroom doesn't capture video/audio recordings yet. This is an honest gap, not a missing file.")}
                      className={cn("flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium", groupClass.classroom.recordingAvailable ? "text-ensena-ink hover:bg-ensena-bg-soft" : "text-ensena-border/70")}
                    >
                      <MonitorPlay className="size-4" /> View Recording
                    </button>
                    <button type="button" onClick={() => setMsgStudentsOpen(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft"><MessageSquare className="size-4" /> Msg Students</button>
                    <button type="button" onClick={() => setAddStudentOpen(true)} className="flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-success hover:bg-ensena-success/10"><UserPlus className="size-4" /> Add Student</button>
                    <button type="button" onClick={releaseEscrowLine} className="flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-success hover:bg-ensena-success/10">Release Escrow</button>
                    <button type="button" onClick={() => { updateClass({ status: "Archived" }); flash("Class archived."); }} className="flex items-center justify-center gap-1.5 rounded-lg border border-ensena-border px-3 py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Archive Class</button>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "participants",
            label: "Participants",
            content: (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-ensena-ink">Roster ({groupClass.students.length})</p>
                    <p className="text-xs text-ensena-muted">{groupClass.scheduleDays.split(",").length} day{groupClass.scheduleDays.split(",").length === 1 ? "" : "s"}/week · {groupClass.sessionsTotal} sessions total · {formatNaira(groupClass.pricePerSession)}/session</p>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groupClass.students.map((s) => (
                      <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-ensena-bg-soft p-3">
                        <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={s.image} alt={s.name} fill sizes="36px" className="object-cover" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ensena-ink">{s.name}</p>
                          <p className="text-xs text-ensena-muted">Attendance {s.attendancePct}% · HW {s.homeworkPct}% · Avg {s.avgScore}%</p>
                          <p className="text-xs text-ensena-muted">
                            Paid {s.sessionsPaid}/{groupClass.sessionsTotal} sessions · {formatNaira(groupClass.pricePerSession)}/session · {formatNaira(s.amountPaid)} total
                          </p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", s.paymentStatus === "Paid" ? "bg-emerald-100 text-emerald-700" : s.paymentStatus === "Pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700")}>{s.paymentStatus}</span>
                        {s.certificateEligible && <Award className="size-4 shrink-0 text-amber-500" />}
                        <button type="button" onClick={() => setRemovingStudent(s)} className="shrink-0 rounded-full p-1.5 text-ensena-muted hover:bg-white hover:text-rose-600"><UserMinus className="size-4" /></button>
                        <button type="button" onClick={() => setRefundingStudent(s)} className="shrink-0 rounded-full p-1.5 text-ensena-muted hover:bg-white hover:text-rose-600"><RefreshCcw className="size-4" /></button>
                      </li>
                    ))}
                    {groupClass.students.length === 0 && <p className="text-sm text-ensena-muted">No students enrolled yet.</p>}
                  </ul>
                  <button type="button" onClick={() => setAddStudentOpen(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"><UserPlus className="size-4" /> Add Student</button>
                </div>

                <div>
                  <p className="text-sm font-semibold text-ensena-ink">Waiting List ({groupClass.waitlist.length})</p>
                  {/* Read-only history only — no real waitlist pipeline exists
                      to admit/notify someone into (a full class simply
                      refuses new enrollments today, see
                      group-class-enrollment-store.ts), so these entries are
                      never anything but seed/historical data. Admit/Notify
                      buttons were removed rather than left to fire a fake
                      success toast for an action that changes nothing. */}
                  <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {groupClass.waitlist.map((w) => (
                      <li key={w.id} className="flex items-center gap-2.5 rounded-xl bg-ensena-bg-soft p-3">
                        <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={w.image} alt={w.name} fill sizes="36px" className="object-cover" /></div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ensena-ink">{w.name}</p><p className="text-xs text-ensena-muted">Joined waitlist {w.joinedDate}</p></div>
                      </li>
                    ))}
                    {groupClass.waitlist.length === 0 && <p className="text-sm text-ensena-muted">No one is on the waiting list.</p>}
                  </ul>
                </div>
              </div>
            ),
          },
          {
            key: "schedule",
            label: "Schedule",
            content: (
              <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {groupClass.sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      {s.status === "Completed" ? <CheckCircle2 className="size-4 text-ensena-success" /> : <Circle className="size-4 text-ensena-border" />}
                      <div><p className="font-medium text-ensena-ink">{s.label}</p><p className="text-xs text-ensena-muted">{s.date}</p></div>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", sessionStatusStyles[s.status])}>{s.status}</span>
                  </li>
                ))}
              </ol>
            ),
          },
          {
            key: "sessions",
            label: "Sessions",
            content: (
              <div>
                <p className="text-xs text-ensena-muted">Real per-session attendance and payment status, from the Virtual Classroom and escrow system. Not a separate ledger.</p>
                {realSessions.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-ensena-bg-soft p-4 text-center text-sm text-ensena-muted">No sessions have been completed through the Virtual Classroom yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                          <th className="py-2 pr-4 font-medium">Date</th>
                          <th className="py-2 pr-4 font-medium">Attendance</th>
                          <th className="py-2 pr-4 font-medium">Status</th>
                          <th className="py-2 pr-4 text-right font-medium">Earnings</th>
                          <th className="py-2 pr-4 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {realSessions.map((s) => {
                          const allClear = !s.tutorAbsent && s.heldGross === 0;
                          const expanded = expandedSessionId === s.sessionId;
                          return (
                            <Fragment key={s.sessionId}>
                              <tr className="border-b border-ensena-border text-sm last:border-0">
                                <td className="py-2.5 pr-4 text-ensena-ink">
                                  <p>{s.scheduledLabel ?? "—"}</p>
                                  <p className="font-mono text-[11px] text-ensena-muted">{s.records[0]?.sessionReferenceCode ?? buildBookingReference("session", s.sessionId)}</p>
                                </td>
                                <td className="py-2.5 pr-4 text-ensena-muted">{s.presentCount}/{s.totalStudents}</td>
                                <td className="py-2.5 pr-4">
                                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", s.tutorAbsent ? "bg-rose-100 text-rose-700" : allClear ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                                    {s.tutorAbsent ? "Tutor Absent" : allClear ? "Released" : "Awaiting Confirmation"}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-right font-medium text-ensena-ink">{formatNaira(escrowNet(s.totalGross))}</td>
                                <td className="py-2.5 pr-4 text-right">
                                  <button type="button" onClick={() => setExpandedSessionId(expanded ? null : s.sessionId)} className="text-xs font-semibold text-ensena-primary hover:underline">
                                    {expanded ? "Hide" : "View"}
                                  </button>
                                </td>
                              </tr>
                              {expanded && (
                                <tr>
                                  <td colSpan={5} className="bg-ensena-bg-soft px-3 py-3">
                                    <ul className="flex flex-col gap-1.5">
                                      {s.records.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                                          <span className="text-ensena-ink">{r.student}</span>
                                          <span className="text-ensena-muted">{r.attendance?.present ? "Present" : "Absent"}</span>
                                          <span className={r.escrowStatus === "Frozen" ? "font-medium text-rose-600" : r.escrowStatus === "Released" ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>{r.escrowStatus}</span>
                                          {r.disputeStatus ? (
                                            <Link href={`/admin/disputes/${r.id}`} className="font-medium text-ensena-primary hover:underline">View Dispute</Link>
                                          ) : (
                                            <span className="text-ensena-muted">—</span>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "attendance",
            label: "Attendance",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Avg. Attendance</p><p className="text-lg font-semibold text-ensena-ink">{groupClass.attendance.avgAttendancePct}%</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Camera Usage</p><p className="text-lg font-semibold text-ensena-ink">{groupClass.attendance.cameraUsagePct}%</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Late</p><p className="text-lg font-semibold text-amber-600">{groupClass.attendance.late}</p></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Absent</p><p className="text-lg font-semibold text-rose-600">{groupClass.attendance.absent}</p></div>
                </div>
                <div className="rounded-xl bg-ensena-bg-soft p-3 text-sm"><p className="text-ensena-muted">Participation Score</p><p className="font-semibold text-ensena-ink">{groupClass.attendance.participationScore} / 5</p></div>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">Per Student</p>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {groupClass.students.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
                        <span className="text-ensena-ink">{s.name}</span>
                        <span className={cn("font-medium", s.attendancePct >= 85 ? "text-ensena-success" : s.attendancePct >= 70 ? "text-amber-600" : "text-rose-600")}>{s.attendancePct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          },
          {
            key: "payments",
            label: "Payments",
            content: (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><div className="flex justify-between text-sm"><span className="text-ensena-muted">Students Paid</span><span className="font-medium text-ensena-ink">{formatNaira(split.gross)}</span></div></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><div className="flex justify-between text-sm"><span className="text-ensena-muted">Ensena Commission (15%)</span><span className="font-medium text-rose-600">{formatNaira(split.commission)}</span></div></div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3"><div className="flex justify-between text-sm"><span className="text-ensena-muted">Tutor Earnings (85%)</span><span className="font-medium text-ensena-success">{formatNaira(split.net)}</span></div></div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">Per-Session Release History</p>
                  <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {groupClass.escrow.log.map((l, i) => (
                      <li key={i} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
                        <span className="text-ensena-ink">{l.session}</span>
                        <span className="text-ensena-muted">{formatNaira(l.amount)}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", l.status === "Released" ? "bg-emerald-100 text-emerald-700" : l.status === "Frozen" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>{l.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ),
          },
          {
            key: "more",
            label: "More",
            content: (
              <div>
                <div className="flex flex-wrap gap-1.5 pb-3">
                  {moreSections.map((m) => (
                    <button key={m} type="button" onClick={() => setMoreSection(m)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", moreSection === m ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{m}</button>
                  ))}
                </div>
                {moreSection === "Escrow" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Held in Escrow</p><p className="font-semibold text-amber-600">{formatNaira(groupClass.escrow.totalHeld)}</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Released</p><p className="font-semibold text-ensena-success">{formatNaira(groupClass.escrow.released)}</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Per-Session Amount</p><p className="font-semibold text-ensena-ink">{formatNaira(groupClass.escrow.perSessionAmount)}</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Frozen</p><p className="font-semibold text-rose-600">{formatNaira(groupClass.escrow.frozen)}</p></div>
                    </div>
                    <p className="text-sm text-ensena-muted">{groupClass.weeks} weeks · {groupClass.sessionsTotal} sessions · each session releases {formatNaira(groupClass.escrow.perSessionAmount)} to the tutor once completed.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={releaseEscrowLine} className="h-9 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">Release Next Session</Button>
                      <Button variant="outline" onClick={freezeEscrowLine} className="h-9 rounded-full border-ensena-border text-xs font-medium">Freeze Escrow</Button>
                    </div>
                  </div>
                )}
                {moreSection === "Homework" && (
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Assignments</p><p className="font-semibold text-ensena-ink">{groupClass.homeworkStats.assignmentsCount}</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Submission Rate</p><p className="font-semibold text-ensena-ink">{groupClass.homeworkStats.submissionPct}%</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Average Score</p><p className="font-semibold text-ensena-ink">{groupClass.homeworkStats.avgScore}%</p></div>
                      <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Late Submissions</p><p className="font-semibold text-amber-600">{groupClass.homeworkStats.lateSubmissions}</p></div>
                    </div>
                    <p className="rounded-xl bg-ensena-primary/5 p-3 text-sm text-ensena-muted"><BookOpen className="mr-1.5 inline size-3.5 text-ensena-primary" />{groupClass.homeworkPlan}</p>
                  </div>
                )}
                {moreSection === "Classroom" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Meeting Link</span><span className="truncate text-ensena-primary">{groupClass.meetingLink}</span></div>
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Recording</span><span className="text-ensena-ink">{groupClass.classroom.recordingAvailable ? "Available" : "Not available"}</span></div>
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Whiteboard</span><span className="text-ensena-ink">{groupClass.classroom.whiteboardActive ? "Active" : "Idle"}</span></div>
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Chat Messages</span><span className="text-ensena-ink">{groupClass.classroom.chatMessages}</span></div>
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Polls</span><span className="text-ensena-ink">{groupClass.classroom.pollsCount}</span></div>
                    <div className="flex justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm"><span className="text-ensena-muted">Connection Quality</span><span className="text-ensena-success">{groupClass.classroom.connectionQuality}</span></div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() =>
                          downloadCsv(
                            [["Field", "Value"], ["Class", groupClass.title], ["Whiteboard Active", groupClass.classroom.whiteboardActive ? "Yes" : "No"], ["Connection Quality", groupClass.classroom.connectionQuality]],
                            `${groupClass.classCode}-whiteboard-summary.csv`
                          )
                        }
                        className="rounded-full border border-ensena-border px-3 py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                      >
                        Download Whiteboard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadCsv(
                            [["Field", "Value"], ["Class", groupClass.title], ["Chat Messages", groupClass.classroom.chatMessages], ["Polls", groupClass.classroom.pollsCount]],
                            `${groupClass.classCode}-chat-summary.csv`
                          )
                        }
                        className="rounded-full border border-ensena-border px-3 py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                      >
                        Download Chat
                      </button>
                    </div>
                  </div>
                )}
                {moreSection === "Reviews" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-ensena-bg-soft p-3">
                      <p className="flex items-center gap-1 text-lg font-semibold text-ensena-ink"><Star className="size-4 fill-amber-400 text-amber-400" /> {liveRating.rating || "N/A"}</p>
                      <p className="text-sm text-ensena-muted">{liveRating.reviews} reviews</p>
                    </div>
                    {groupClass.reviews.breakdown.map((count, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-ensena-muted">{5 - i}★</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-amber-400" style={{ width: `${groupClass.reviewCount ? (count / groupClass.reviewCount) * 100 : 0}%` }} /></div>
                        <span className="w-6 text-right text-ensena-muted">{count}</span>
                      </div>
                    ))}
                    <p className="text-sm font-semibold text-ensena-ink">Comments</p>
                    {groupClass.reviews.comments.map((r, i) => (
                      <div key={i} className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
                        <div className="flex items-center justify-between"><span className="font-medium text-ensena-ink">{r.student}</span><span className="text-xs text-ensena-muted">{r.date}</span></div>
                        <p className="mt-1 text-ensena-muted">{r.comment}</p>
                      </div>
                    ))}
                    <p className="rounded-xl bg-ensena-primary/5 p-3 text-sm text-ensena-muted"><Lightbulb className="mr-1.5 inline size-3.5 text-ensena-primary" />{groupClass.aiInsights[groupClass.aiInsights.length - 1]}</p>
                  </div>
                )}
                {moreSection === "Certificates" && (
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl bg-ensena-bg-soft p-3 text-sm"><p className="text-ensena-muted">Certificates Issued</p><p className="font-semibold text-ensena-ink">{groupClass.certificatesIssued} / {groupClass.studentsEnrolled}</p></div>
                    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {groupClass.students.map((s) => (
                        <li key={s.id} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-3 py-2 text-sm">
                          <span className="text-ensena-ink">{s.name}</span>
                          {s.certificateEligible ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><Award className="size-3.5" /> {groupClass.status === "Completed" ? "Issued" : "Eligible"}</span>
                          ) : (
                            <span className="text-xs text-ensena-muted">Not eligible yet</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {moreSection === "Activity Log" && (
                  <ol className="flex flex-col gap-2">
                    {groupClass.activityLog.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="size-4 shrink-0 text-ensena-success" />
                        <span className="flex-1 text-ensena-ink">{a.action}</span>
                        <span className="text-ensena-muted">{a.time}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal open={cancelling} onClose={() => setCancelling(false)} title="Cancel Class">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This cancels the class for all enrolled students and freezes any remaining escrow until resolved. This action is logged.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelling(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Keep Class</Button>
            <Button onClick={confirmCancelClass} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Cancel Class</Button>
          </div>
        </div>
      </Modal>

      <Modal open={addStudentOpen} onClose={() => setAddStudentOpen(false)} title={`Add Student to ${groupClass.title}`}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Student name</span>
            <input value={addStudentName} onChange={(e) => setAddStudentName(e.target.value)} placeholder="e.g. Chioma Nwankwo" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button onClick={addStudent} className="h-10 w-full rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">Add Student</Button>
        </div>
      </Modal>

      <Modal open={!!removingStudent} onClose={() => setRemovingStudent(null)} title="Remove Student">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Remove {removingStudent?.name} from this class? They will lose access to remaining sessions.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRemovingStudent(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmRemoveStudent} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Remove</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!refundingStudent} onClose={() => setRefundingStudent(null)} title="Refund Student">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Refund {refundingStudent?.name} for this class back to their original payment method.</p>
          <Button onClick={confirmRefundStudent} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Confirm Refund</Button>
        </div>
      </Modal>

      <AdminMsgTutorModal open={msgTutorOpen} onClose={() => setMsgTutorOpen(false)} recipientName={groupClass.tutor} role="Tutor" />

      <Modal open={msgStudentsOpen} onClose={() => setMsgStudentsOpen(false)} title={`Message All Students: ${groupClass.title}`}>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Sent to all {groupClass.studentsEnrolled} enrolled students.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={msgStudentsSubject} onChange={(e) => setMsgStudentsSubject(e.target.value)} placeholder="e.g. Schedule change this week" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={msgStudentsBody} onChange={(e) => setMsgStudentsBody(e.target.value)} rows={3} placeholder="Write your message…" className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={sendMessageToStudents} disabled={!msgStudentsSubject.trim() || !msgStudentsBody.trim()} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
            Send to {groupClass.studentsEnrolled} Students
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
