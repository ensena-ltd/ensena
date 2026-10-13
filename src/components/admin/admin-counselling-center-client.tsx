"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BellRing,
  BookOpen,
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Download,
  FileText,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Lightbulb,
  Search,
  Send,
  Star,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import {
  actionPlanStatusStyles,
  aiCounsellingRecommendations,
  aiPredictions,
  aiRecommendationActions,
  answerCounsellorQuestion,
  appointmentStatusStyles,
  caseStatusStyles,
  counsellingDashboardStats,
  counsellingReports,
  counsellingResources,
  followUpsDue,
  initialActionPlans,
  initialAppointments,
  initialAvailability,
  initialBlockedDates,
  initialIntakeForms,
  initialStudentCases,
  intakeFormStatusStyles,
  recentStudentActivity,
  riskStyles,
  type ActionPlanRecord,
  type ActivityType,
  type Appointment,
  type AppointmentStatus,
  type AvailabilityDay,
  type BlockedDate,
  type CaseStatus,
  type FollowUpDue,
  type IntakeForm,
  type IntakeFormStatus,
  type StudentCase,
} from "@/lib/admin-counselling-center-data";
import { studentSlug } from "@/lib/admin-counselling-data";
import { currentActorLabel } from "@/lib/admin-session";
import { sendMessage } from "@/lib/admin-communications-store";
import { buildMonthCells, fromISO, MONTH_NAMES, toISO, WEEKDAY_SHORT } from "@/lib/calendar-grid";
import { downloadCsv } from "@/lib/csv";
import { to12HourDisplay, to24HourValue } from "@/lib/time-format";
import { cn } from "@/lib/utils";

type SectionKey =
  | "Dashboard"
  | "Appointments"
  | "Students"
  | "Intake Forms"
  | "Notes"
  | "Follow-ups"
  | "Messages"
  | "Calendar"
  // MVP assumes a single counsellor (the founder), managed from here — these
  // stay valid section keys but aren't linked from nav/sidebar until a real
  // multi-counsellor / AI-assisted workflow is scoped for Phase 2.
  | "Insights"
  | "Action Plans"
  | "Resources"
  | "Reports"
  | "Settings";

const topTabs: SectionKey[] = ["Dashboard", "Appointments", "Students", "Intake Forms", "Notes", "Follow-ups", "Messages", "Calendar"];
const validSections: SectionKey[] = [...topTabs, "Insights", "Action Plans", "Resources", "Reports", "Settings"];

const activityIconStyles: Record<ActivityType, { icon: typeof CalendarPlus; tint: string }> = {
  booking: { icon: CalendarPlus, tint: "bg-blue-100 text-blue-700" },
  intake: { icon: FileText, tint: "bg-purple-100 text-purple-700" },
  "action-plan": { icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-700" },
  missed: { icon: AlertTriangle, tint: "bg-rose-100 text-rose-700" },
  improvement: { icon: TrendingUp, tint: "bg-emerald-100 text-emerald-700" },
};

function callTypeIcon(type: string) {
  if (type === "Phone") return <Phone className="size-3" />;
  if (type === "Message") return <MessageSquare className="size-3" />;
  return <Video className="size-3" />;
}

const caseTabs: (CaseStatus | "All")[] = ["All", "Active", "Monitoring", "Improved", "Closed"];
const intakeTabs: IntakeFormStatus[] = ["Pending", "Submitted", "Reviewed", "Archived"];

export function AdminCounsellingCenterClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");
  // Derived directly from the URL (not local state) so the sidebar's own Links and the
  // in-page tab strip below always agree on which section is active.
  const section: SectionKey = validSections.includes(sectionParam as SectionKey) ? (sectionParam as SectionKey) : "Dashboard";
  function setSection(next: SectionKey) {
    router.replace(`${pathname}?section=${encodeURIComponent(next)}`, { scroll: false });
  }
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  // Hydration-safe "today" (defers to real date after mount so SSR/client markup match).
  const [todayISO, setTodayISO] = useState("2024-05-22");
  useEffect(() => {
    const timeout = setTimeout(() => setTodayISO(toISO(new Date())), 0);
    return () => clearTimeout(timeout);
  }, []);

  // ---------------- Appointments ----------------
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [apptStatusFilter, setApptStatusFilter] = useState<AppointmentStatus | "All">("All");
  const [selectedApptId, setSelectedApptId] = useState<string>(initialAppointments[0].id);
  const [reschedulingApptId, setReschedulingApptId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");
  const [cancellingApptId, setCancellingApptId] = useState<string | null>(null);

  const filteredAppointments = appointments.filter((a) => apptStatusFilter === "All" || a.status === apptStatusFilter);
  const selectedAppt = appointments.find((a) => a.id === selectedApptId) ?? appointments[0];

  function openReschedule(id: string) {
    setReschedulingApptId(id);
    setRescheduleDate(todayISO);
    setRescheduleTime("10:00");
  }
  function confirmReschedule() {
    if (!reschedulingApptId) return;
    const newDate = new Date(rescheduleDate + "T00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    setAppointments((prev) => prev.map((a) => (a.id === reschedulingApptId ? { ...a, dateLabel: newDate, dateISO: rescheduleDate, time: to12HourDisplay(rescheduleTime), status: "Rescheduled" } : a)));
    flash(`Appointment rescheduled to ${newDate}.`);
    setReschedulingApptId(null);
  }
  function confirmCancelAppt() {
    if (!cancellingApptId) return;
    setAppointments((prev) => prev.map((a) => (a.id === cancellingApptId ? { ...a, status: "Cancelled" } : a)));
    flash("Appointment cancelled.");
    setCancellingApptId(null);
  }
  function completeSession(id: string) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Completed" } : a)));
    flash("Session marked complete.");
  }

  // ---------------- Students (CRM) ----------------
  const [cases, setCases] = useState<StudentCase[]>(initialStudentCases);
  const [caseTab, setCaseTab] = useState<(typeof caseTabs)[number]>("All");
  const [caseQuery, setCaseQuery] = useState("");
  const [viewingCaseId, setViewingCaseId] = useState<string | null>(null);
  const [caseModalTab, setCaseModalTab] = useState<"Overview" | "Timeline" | "History" | "Charts">("Overview");

  // ---------------- Notes (private, admin-only) ----------------
  const [addingNoteForCaseId, setAddingNoteForCaseId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState({ summary: "", advice: "", recommendedTutors: "", recommendedGroupClasses: "", nextSteps: "" });
  function submitNote() {
    if (!addingNoteForCaseId) return;
    const parts = [
      noteDraft.summary && `Summary: ${noteDraft.summary}`,
      noteDraft.advice && `Advice: ${noteDraft.advice}`,
      noteDraft.recommendedTutors && `Recommended tutors: ${noteDraft.recommendedTutors}`,
      noteDraft.recommendedGroupClasses && `Recommended group classes: ${noteDraft.recommendedGroupClasses}`,
      noteDraft.nextSteps && `Next steps: ${noteDraft.nextSteps}`,
    ].filter(Boolean);
    if (parts.length === 0) return;
    setCases((prev) => prev.map((c) => (c.id === addingNoteForCaseId ? { ...c, privateNotes: [...c.privateNotes, parts.join(" · ")] } : c)));
    setNoteDraft({ summary: "", advice: "", recommendedTutors: "", recommendedGroupClasses: "", nextSteps: "" });
    setAddingNoteForCaseId(null);
  }

  const filteredCases = cases.filter((c) => {
    const matchesTab = caseTab === "All" || c.status === caseTab;
    const q = caseQuery.trim().toLowerCase();
    const matchesQuery = q === "" || c.student.toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });
  const viewingCase = cases.find((c) => c.id === viewingCaseId) ?? null;

  // ---------------- Intake Forms ----------------
  const [intakeForms, setIntakeForms] = useState<IntakeForm[]>(initialIntakeForms);
  const [intakeTab, setIntakeTab] = useState<IntakeFormStatus>("Pending");
  const [viewingIntakeId, setViewingIntakeId] = useState<string | null>(null);
  const viewingIntake = intakeForms.find((f) => f.id === viewingIntakeId) ?? null;

  function acceptIntake(id: string) {
    setIntakeForms((prev) => prev.map((f) => (f.id === id ? { ...f, status: "Reviewed" } : f)));
    flash("Intake form accepted.");
    setViewingIntakeId(null);
  }
  function requestMoreInfo(id: string) {
    flash("Requested more information from student.");
    setViewingIntakeId(null);
    void id;
  }

  // ---------------- Action Plans ----------------
  const [actionPlans, setActionPlans] = useState<ActionPlanRecord[]>(initialActionPlans);
  const [viewingPlanId, setViewingPlanId] = useState<string | null>(actionPlans[0]?.id ?? null);
  const viewingPlan = actionPlans.find((p) => p.id === viewingPlanId) ?? null;

  function toggleTask(planId: string, taskIndex: number) {
    setActionPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const tasks = p.tasks.map((t, i) => (i === taskIndex ? { ...t, done: !t.done } : t));
        const progressPct = Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
        return { ...p, tasks, progressPct };
      })
    );
  }

  // Real record creation — pushes an actual Appointment/ActionPlanRecord
  // into this page's own local state (the same state every other real
  // action here already mutates: reschedule/cancel/complete/acceptIntake),
  // then jumps to the section where it now genuinely appears, rather than
  // just flashing a success toast with nothing behind it.
  function bookAppointmentFor(input: { student: string; image: string; level?: string; reason: string }) {
    const id = `appt-${Date.now()}`;
    const newAppt: Appointment = {
      id,
      student: input.student,
      image: input.image,
      level: input.level ?? "—",
      reason: input.reason,
      tag: "Follow-up",
      tagColor: "bg-blue-100 text-blue-700",
      dateLabel: "Upcoming",
      dateISO: todayISO,
      time: "Time to be confirmed",
      duration: "30 mins",
      type: "Video",
      status: "Upcoming",
      notes: "",
    };
    setAppointments((prev) => [newAppt, ...prev]);
    setSelectedApptId(id);
    setSection("Appointments");
    flash(`Appointment created for ${input.student}. Set a time in Appointments.`);
  }

  function createActionPlanFor(input: { student: string; image: string; goal: string }) {
    const id = `plan-${Date.now()}`;
    const newPlan: ActionPlanRecord = {
      id,
      student: input.student,
      image: input.image,
      goal: input.goal,
      progressPct: 0,
      dueDate: "Not set",
      status: "On Track",
      metric: { label: input.goal, before: 0, current: 0, target: 100 },
      tasks: [],
      aiTracking: { homework: "No data yet", attendance: "No data yet", studyTime: "No data yet", tutorFeedback: "No data yet", overall: "No data yet" },
      followUpSchedule: [],
    };
    setActionPlans((prev) => [newPlan, ...prev]);
    setViewingPlanId(id);
    setSection("Action Plans");
    flash(`Action plan started for ${input.student}. Add tasks to get going.`);
  }

  function closeCaseFor(studentName: string) {
    setCases((prev) => prev.map((c) => (c.student === studentName ? { ...c, status: "Closed" } : c)));
    flash(`Case closed for ${studentName}.`);
  }

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  function sendBroadcast() {
    if (!broadcastSubject.trim() || !broadcastBody.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: "Students with an active counselling case",
      recipientCount: cases.filter((c) => c.status !== "Closed").length,
      channels: ["In-App", "Email"],
      subject: broadcastSubject,
      body: broadcastBody,
    });
    flash("Broadcast sent.");
    setBroadcastOpen(false);
    setBroadcastSubject("");
    setBroadcastBody("");
  }

  // ---------------- Calendar / Availability (Settings) ----------------
  const [availability, setAvailability] = useState<AvailabilityDay[]>(initialAvailability);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(initialBlockedDates);
  const [calendarMonthISO, setCalendarMonthISO] = useState("2024-05-22");
  useEffect(() => {
    const timeout = setTimeout(() => setCalendarMonthISO(toISO(new Date())), 0);
    return () => clearTimeout(timeout);
  }, []);
  const calendarMonth = useMemo(() => fromISO(calendarMonthISO), [calendarMonthISO]);
  const monthCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth]);

  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockModalDate, setBlockModalDate] = useState("");
  const [blockModalAllDay, setBlockModalAllDay] = useState(true);
  const [blockModalStart, setBlockModalStart] = useState("09:00");
  const [blockModalEnd, setBlockModalEnd] = useState("17:00");
  const [blockModalReason, setBlockModalReason] = useState("");

  function openBlockModalFor(dateISO: string) {
    setBlockModalDate(dateISO);
    setBlockModalAllDay(true);
    setBlockModalStart("09:00");
    setBlockModalEnd("17:00");
    setBlockModalReason("");
    setBlockModalOpen(true);
  }
  function submitBlockDate() {
    setBlockedDates((prev) => [
      ...prev,
      { date: blockModalDate, reason: blockModalReason || "Blocked", allDay: blockModalAllDay, startTime: blockModalAllDay ? undefined : to12HourDisplay(blockModalStart), endTime: blockModalAllDay ? undefined : to12HourDisplay(blockModalEnd) },
    ]);
    flash(`${blockModalDate} blocked.`);
    setBlockModalOpen(false);
  }
  function isBlocked(dateISO: string) {
    return blockedDates.some((b) => b.date === dateISO && b.allDay);
  }

  // ---------------- AI Assistant ----------------
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "counsellor" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi Cynthia, ask me about student risk levels, attendance, tutor fit, study plans, or today's sessions." },
  ]);
  const [aiInput, setAiInput] = useState("");
  function sendAiMessage() {
    const q = aiInput.trim();
    if (!q) return;
    setAiMessages((prev) => [...prev, { role: "counsellor", text: q }, { role: "ai", text: answerCounsellorQuestion(q) }]);
    setAiInput("");
  }

  const highRiskCases = cases.filter((c) => c.risk === "High");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Counselling Center</h1>
          <p className="mt-1 text-sm text-ensena-muted">Support, guide and help students achieve their academic and personal goals</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search students, appointments, notes…" className="h-10 w-80 rounded-full border border-ensena-border pl-9 pr-12 text-sm" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-ensena-border px-1.5 py-0.5 text-[10px] text-ensena-muted">⌘K</span>
        </div>
      </div>

      {/* Top section tabs */}
      <div className="mt-5 flex flex-wrap gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-xs">
        {topTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSection(t)}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-medium", section === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
            {t === "Intake Forms" && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">{intakeForms.filter((f) => f.status === "Pending").length}</span>}
          </button>
        ))}
      </div>

      {section === "Dashboard" && (
        <DashboardSection
          onNavigate={setSection}
          highRiskCount={highRiskCases.length}
          onOpenAppointment={(id) => { setSection("Appointments"); setSelectedApptId(id); }}
          appointments={appointments}
          onBookFollowUp={bookAppointmentFor}
          onOpenBroadcast={() => setBroadcastOpen(true)}
          onOpenAssistant={() => setAiAssistantOpen(true)}
        />
      )}

      {section === "Appointments" && (
        <AppointmentsSection
          appointments={filteredAppointments}
          statusFilter={apptStatusFilter}
          setStatusFilter={setApptStatusFilter}
          selected={selectedAppt}
          onSelect={setSelectedApptId}
          onReschedule={openReschedule}
          onCancel={setCancellingApptId}
          onComplete={completeSession}
          onCreateActionPlan={createActionPlanFor}
          onBookFollowUp={bookAppointmentFor}
          flash={flash}
        />
      )}

      {section === "Students" && (
        <StudentsSection
          cases={filteredCases}
          caseTab={caseTab}
          setCaseTab={setCaseTab}
          caseQuery={caseQuery}
          setCaseQuery={setCaseQuery}
          onView={setViewingCaseId}
        />
      )}

      {section === "Intake Forms" && (
        <IntakeFormsSection
          forms={intakeForms.filter((f) => f.status === intakeTab)}
          tab={intakeTab}
          setTab={setIntakeTab}
          onView={setViewingIntakeId}
        />
      )}

      {section === "Notes" && <NotesSection cases={cases} onAddNote={setAddingNoteForCaseId} />}

      {section === "Follow-ups" && <FollowUpsSection items={followUpsDue} onBookFollowUp={bookAppointmentFor} onCloseCase={closeCaseFor} />}

      {section === "Insights" && <AiInsightsSection highRiskCases={highRiskCases} flash={flash} />}

      {section === "Action Plans" && (
        <ActionPlansSection plans={actionPlans} selected={viewingPlan} onSelect={setViewingPlanId} onToggleTask={toggleTask} />
      )}

      {section === "Resources" && <ResourcesSection flash={flash} />}

      {section === "Messages" && <MessagesSection />}

      {section === "Calendar" && (
        <CalendarSection
          calendarMonth={calendarMonth}
          monthCells={monthCells}
          setCalendarMonthISO={setCalendarMonthISO}
          isBlocked={isBlocked}
          openBlockModalFor={openBlockModalFor}
          appointments={appointments}
        />
      )}

      {section === "Reports" && <ReportsSection flash={flash} />}

      {section === "Settings" && (
        <SettingsSection availability={availability} setAvailability={setAvailability} blockedDates={blockedDates} setBlockedDates={setBlockedDates} flash={flash} />
      )}

      {/* Floating assistant trigger */}
      <button
        type="button"
        onClick={() => setAiAssistantOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white shadow-lg hover:bg-ensena-primary-hover"
      >
        <MessageSquare className="size-4" /> Ask a Question
      </button>

      {/* ---------------- Modals ---------------- */}

      <Modal open={!!reschedulingApptId} onClose={() => setReschedulingApptId(null)} title="Reschedule Appointment">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New Date</span>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New Time</span>
            <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button onClick={confirmReschedule} className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Confirm Reschedule</Button>
        </div>
      </Modal>

      <Modal open={!!cancellingApptId} onClose={() => setCancellingApptId(null)} title="Cancel Appointment">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This cancels the appointment and notifies the student.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancellingApptId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Keep Appointment</Button>
            <Button onClick={confirmCancelAppt} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Cancel Appointment</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!viewingCase} onClose={() => setViewingCaseId(null)} title={viewingCase?.student ?? "Student"}>
        {viewingCase && <StudentCaseModalBody studentCase={viewingCase} tab={caseModalTab} setTab={setCaseModalTab} />}
      </Modal>

      <Modal open={!!viewingIntake} onClose={() => setViewingIntakeId(null)} title={viewingIntake ? `${viewingIntake.student}: Intake Form` : "Intake Form"}>
        {viewingIntake && (
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-semibold text-ensena-ink">Personal Goals</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {viewingIntake.goals.map((g) => (
                  <span key={g} className="rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">{g}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-ensena-primary/5 p-3">
              <p className="flex items-center gap-1 font-semibold text-ensena-ink"><FileText className="size-3.5 text-ensena-primary" /> Summary</p>
              <dl className="mt-1.5 flex flex-col gap-1 text-xs">
                <div className="flex justify-between"><dt className="text-ensena-muted">Track</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.examTrack}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Dream Course</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.dreamCourse}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Weak Subject</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.weakSubject}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Budget</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.budget}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Preference</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.tutorPreference}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Motivation</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.motivation}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Needs Accountability</dt><dd className="text-ensena-ink">{viewingIntake.aiSummary.needsAccountability ? "Yes" : "No"}</dd></div>
              </dl>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <Button onClick={() => acceptIntake(viewingIntake.id)} className="h-9 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">Accept</Button>
              <Button variant="outline" onClick={() => requestMoreInfo(viewingIntake.id)} className="h-9 rounded-full border-ensena-border text-xs font-medium">Request More Info</Button>
              <Button
                variant="outline"
                onClick={() => {
                  bookAppointmentFor({ student: viewingIntake.student, image: viewingIntake.image, level: viewingIntake.level, reason: viewingIntake.goals[0] ?? "Counselling follow-up" });
                  setViewingIntakeId(null);
                }}
                className="h-9 rounded-full border-ensena-border text-xs font-medium"
              >
                Book Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  createActionPlanFor({ student: viewingIntake.student, image: viewingIntake.image, goal: viewingIntake.goals[0] ?? `Support with ${viewingIntake.aiSummary.weakSubject}` });
                  setViewingIntakeId(null);
                }}
                className="h-9 rounded-full border-ensena-border text-xs font-medium"
              >
                Create Action Plan
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!addingNoteForCaseId} onClose={() => setAddingNoteForCaseId(null)} title="Add Session Note">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Session summary</span>
            <textarea value={noteDraft.summary} onChange={(e) => setNoteDraft((d) => ({ ...d, summary: e.target.value }))} rows={2} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Advice given</span>
            <textarea value={noteDraft.advice} onChange={(e) => setNoteDraft((d) => ({ ...d, advice: e.target.value }))} rows={2} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Recommended tutors</span>
            <input value={noteDraft.recommendedTutors} onChange={(e) => setNoteDraft((d) => ({ ...d, recommendedTutors: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Recommended group classes</span>
            <input value={noteDraft.recommendedGroupClasses} onChange={(e) => setNoteDraft((d) => ({ ...d, recommendedGroupClasses: e.target.value }))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Next steps</span>
            <textarea value={noteDraft.nextSteps} onChange={(e) => setNoteDraft((d) => ({ ...d, nextSteps: e.target.value }))} rows={2} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <p className="text-[11px] text-ensena-muted">Private (visible only to admins).</p>
          <Button onClick={submitNote} className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Save Note</Button>
        </div>
      </Modal>

      <Modal open={blockModalOpen} onClose={() => setBlockModalOpen(false)} title={`Block ${blockModalDate}`}>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={blockModalAllDay} onChange={(e) => setBlockModalAllDay(e.target.checked)} className="size-4 rounded border-ensena-border" />
            Block entire day
          </label>
          {!blockModalAllDay && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Start</span>
                <input type="time" value={blockModalStart} onChange={(e) => setBlockModalStart(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">End</span>
                <input type="time" value={blockModalEnd} onChange={(e) => setBlockModalEnd(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason (optional)</span>
            <input value={blockModalReason} onChange={(e) => setBlockModalReason(e.target.value)} placeholder="e.g. Personal leave" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button onClick={submitBlockDate} className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Block Date</Button>
        </div>
      </Modal>

      <Modal open={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} title="Assistant">
        <div className="flex h-[420px] flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {aiMessages.map((m, i) => (
              <div key={i} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.role === "ai" ? "bg-ensena-bg-soft text-ensena-ink" : "ml-auto bg-ensena-primary text-white")}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAiMessage()}
              placeholder="Ask about risk levels, attendance, study plans…"
              className="h-10 flex-1 rounded-full border border-ensena-border px-4 text-sm"
            />
            <button type="button" onClick={sendAiMessage} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white hover:bg-ensena-primary-hover">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Send Broadcast">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">
            Sends to every student with an active counselling case ({cases.filter((c) => c.status !== "Closed").length} students) via the real messaging/communications log.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} rows={4} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button
            onClick={sendBroadcast}
            disabled={!broadcastSubject.trim() || !broadcastBody.trim()}
            className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Broadcast
          </Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

// ==================== DASHBOARD ====================

function DashboardSection({
  onNavigate,
  highRiskCount,
  appointments,
  onOpenAppointment,
  onBookFollowUp,
  onOpenBroadcast,
  onOpenAssistant,
}: {
  onNavigate: (s: SectionKey) => void;
  highRiskCount: number;
  appointments: Appointment[];
  onOpenAppointment: (id: string) => void;
  onBookFollowUp: (input: { student: string; image: string; reason: string }) => void;
  onOpenBroadcast: () => void;
  onOpenAssistant: () => void;
}) {
  const todaysAppointments = appointments.filter((a) => a.dateLabel === "Today");

  const statCards = [
    { label: "Today's Appointments", value: counsellingDashboardStats.todaysAppointments, sub: `${todaysAppointments.length} upcoming`, icon: CalendarIcon, tint: "bg-blue-100 text-blue-700" },
    { label: "Upcoming This Week", value: counsellingDashboardStats.upcomingThisWeek, sub: `↑ ${counsellingDashboardStats.upcomingThisWeekDeltaPct}% vs last week`, icon: Clock, tint: "bg-emerald-100 text-emerald-700" },
    { label: "Pending Intake Forms", value: counsellingDashboardStats.pendingIntakeForms, sub: "Needs review", icon: FileText, tint: "bg-purple-100 text-purple-700" },
    { label: "Students Under Monitoring", value: counsellingDashboardStats.studentsUnderMonitoring, sub: `↑ ${counsellingDashboardStats.studentsUnderMonitoringDelta} vs last week`, icon: Users, tint: "bg-emerald-100 text-emerald-700" },
    { label: "High Risk Students", value: highRiskCount || counsellingDashboardStats.highRiskStudents, sub: "Needs attention", icon: AlertTriangle, tint: "bg-amber-100 text-amber-700" },
    { label: "Completed This Month", value: counsellingDashboardStats.completedThisMonth, sub: `↑ ${counsellingDashboardStats.completedThisMonthDeltaPct}% vs last month`, icon: CheckCircle2, tint: "bg-blue-100 text-blue-700" },
    { label: "Avg. Satisfaction", value: `${counsellingDashboardStats.avgSatisfaction}★`, sub: `From ${counsellingDashboardStats.avgSatisfactionReviews} reviews`, icon: Star, tint: "bg-yellow-100 text-yellow-700" },
  ];

  const quickActions = [
    { label: "Create Appointment", icon: CalendarPlus, tint: "text-blue-600", action: () => onNavigate("Appointments") },
    { label: "Block Time", icon: Clock, tint: "text-ensena-muted", action: () => onNavigate("Calendar") },
    { label: "Send Message", icon: MessageSquare, tint: "text-blue-600", action: () => onNavigate("Messages") },
    { label: "Create Action Plan", icon: Award, tint: "text-rose-600", action: () => onNavigate("Action Plans") },
    { label: "Upload Resource", icon: Upload, tint: "text-purple-600", action: () => onNavigate("Resources") },
    { label: "Generate Report", icon: BarChart3, tint: "text-blue-600", action: () => onNavigate("Reports") },
    { label: "Send Broadcast", icon: Megaphone, tint: "text-rose-600", action: onOpenBroadcast },
    { label: "Student Report", icon: FileText, tint: "text-purple-600", action: onOpenAssistant },
    { label: "View Calendar", icon: CalendarIcon, tint: "text-blue-600", action: () => onNavigate("Calendar") },
  ];

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
            <div className={cn("flex size-8 items-center justify-center rounded-full", c.tint)}>
              <c.icon className="size-4" />
            </div>
            <p className="mt-2 text-lg font-semibold text-ensena-ink">{c.value}</p>
            <p className="truncate text-[11px] text-ensena-muted">{c.label}</p>
            <p className="truncate text-[10px] text-ensena-muted/80">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Today&apos;s Schedule</h2>
            <button type="button" onClick={() => onNavigate("Calendar")} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Calendar</button>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {todaysAppointments.map((a) => (
              <li key={a.id} className="rounded-xl border border-ensena-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{a.time}</p>
                    <p className="text-[11px] text-ensena-muted">{a.duration}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", a.tagColor)}>{a.tag}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={a.image} alt={a.student} fill sizes="32px" className="object-cover" /></div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ensena-ink">{a.student}</p>
                    <p className="truncate text-[11px] text-ensena-muted">{a.level}</p>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-ensena-muted">Topic: {a.reason}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <button type="button" onClick={() => onOpenAppointment(a.id)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-full bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700">
                    <Video className="size-3.5" /> Join Call
                  </button>
                  <button type="button" onClick={() => onOpenAppointment(a.id)} className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
                    <MoreHorizontal className="size-4" />
                  </button>
                </div>
              </li>
            ))}
            {todaysAppointments.length === 0 && <p className="text-xs text-ensena-muted">No appointments today.</p>}
          </ul>
          <button type="button" onClick={() => onNavigate("Appointments")} className="mt-3 text-xs font-medium text-ensena-primary hover:underline">View full schedule →</button>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Priority Queue</h2>
            <button type="button" onClick={() => onNavigate("Insights")} className="text-xs font-medium text-ensena-primary hover:underline">View All</button>
          </div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {aiCounsellingRecommendations.map((r) => (
              <li key={r.id} className={cn("rounded-xl border-l-4 bg-ensena-bg-soft p-3", r.priority === "High" ? "border-rose-500" : "border-amber-500")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={r.image} alt={r.student} fill sizes="32px" className="object-cover" /></div>
                    <div>
                      <p className="text-sm font-medium text-ensena-ink">{r.student}</p>
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-semibold", r.priority === "High" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>{r.priority} Risk</span>
                    </div>
                  </div>
                  <Link href={`/admin/counsellors/students/${studentSlug(r.student)}`} aria-label={`View ${r.student}'s profile`} className="text-ensena-muted hover:text-ensena-ink">
                    <MoreHorizontal className="size-4" />
                  </Link>
                </div>
                <p className="mt-1.5 text-xs text-ensena-muted">{r.reason}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-ensena-ink">{r.recommendedAction}</span>
                  <span className={cn("text-[10px] font-semibold", r.priority === "High" ? "text-rose-600" : "text-amber-600")}>Priority: {r.priority}</span>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onNavigate("Insights")} className="mt-3 text-xs font-medium text-ensena-primary hover:underline">View full insights →</button>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Student Activity</h2>
            <span className="text-xs font-medium text-ensena-primary">View All</span>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {recentStudentActivity.map((a) => {
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

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Students Needing Follow-up</h2>
            <button type="button" onClick={() => onNavigate("Students")} className="text-xs font-medium text-ensena-primary hover:underline">View All</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 pr-3 font-medium">Risk Level</th>
                  <th className="py-2 pr-3 font-medium">Days Overdue</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {initialStudentCases.filter((c) => c.attendancePct < 90).slice(0, 4).map((c, i) => (
                  <tr key={c.id} className="border-b border-ensena-border text-xs last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={c.image} alt={c.student} fill sizes="28px" className="object-cover" /></div>
                        <span className="font-medium text-ensena-ink">{c.student}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-ensena-muted">{c.attendancePct < 70 ? "Low attendance & performance" : "Homework completion low"}</td>
                    <td className="py-2.5 pr-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", riskStyles[c.risk])}>{c.risk}</span></td>
                    <td className="py-2.5 pr-3 text-ensena-ink">{(i + 1) * 2} days</td>
                    <td className="py-2.5 pr-3">
                      <button type="button" onClick={() => onBookFollowUp({ student: c.student, image: c.image, reason: c.attendancePct < 70 ? "Low attendance & performance" : "Homework completion low" })} className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">Book Now</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Quick Actions</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quickActions.map((qa) => (
              <button key={qa.label} type="button" onClick={qa.action} className="flex flex-col items-center gap-1.5 rounded-xl border border-ensena-border px-2 py-3 text-center text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                <qa.icon className={cn("size-4.5", qa.tint)} />
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== APPOINTMENTS ====================

function AppointmentsSection({
  appointments,
  statusFilter,
  setStatusFilter,
  selected,
  onSelect,
  onReschedule,
  onCancel,
  onComplete,
  onCreateActionPlan,
  onBookFollowUp,
  flash,
}: {
  appointments: Appointment[];
  statusFilter: AppointmentStatus | "All";
  setStatusFilter: (s: AppointmentStatus | "All") => void;
  selected: Appointment;
  onSelect: (id: string) => void;
  onReschedule: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onCreateActionPlan: (input: { student: string; image: string; goal: string }) => void;
  onBookFollowUp: (input: { student: string; image: string; reason: string }) => void;
  flash: (m: string) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Appointments</h2>
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Confirmed", "Upcoming", "Completed", "Rescheduled", "Cancelled"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn("rounded-full px-3 py-1 text-xs font-medium", statusFilter === s ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{s}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Reason</th>
                <th className="py-2 pr-3 font-medium">Date &amp; Time</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} onClick={() => onSelect(a.id)} className={cn("cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft", selected.id === a.id && "bg-ensena-primary/5")}>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={a.image} alt={a.student} fill sizes="28px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{a.student}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-ensena-muted">{a.tag}</td>
                  <td className="py-2.5 pr-3 text-ensena-muted">
                    <p className="text-ensena-ink">{a.dateLabel}</p>
                    <p>{a.time}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-ensena-muted">{callTypeIcon(a.type)}</td>
                  <td className="py-2.5 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", appointmentStatusStyles[a.status])}>{a.status}</span></td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-sm text-ensena-muted">No appointments match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-ensena-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-heading text-sm font-semibold text-ensena-ink">{selected.student}</p>
            <p className="text-xs text-ensena-muted">{selected.level}</p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", appointmentStatusStyles[selected.status])}>{selected.status}</span>
        </div>

        <dl className="mt-3 flex flex-col gap-1.5 text-xs">
          <div className="flex justify-between"><dt className="text-ensena-muted">Reason</dt><dd className="text-ensena-ink">{selected.reason}</dd></div>
          <div className="flex justify-between"><dt className="text-ensena-muted">Date</dt><dd className="text-ensena-ink">{selected.dateLabel}, {selected.time}</dd></div>
          <div className="flex justify-between"><dt className="text-ensena-muted">Duration</dt><dd className="text-ensena-ink">{selected.duration}</dd></div>
          {selected.meetingLink && <div className="flex justify-between gap-2"><dt className="shrink-0 text-ensena-muted">Meeting Link</dt><dd className="truncate text-ensena-primary">{selected.meetingLink}</dd></div>}
        </dl>

        {selected.previousSessionSummary && (
          <div className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-xs">
            <p className="font-semibold text-ensena-ink">Previous Session</p>
            <p className="mt-1 text-ensena-muted">{selected.previousSessionSummary}</p>
          </div>
        )}

        {selected.aiSummary && (
          <div className="mt-3 rounded-xl bg-ensena-primary/5 p-3 text-xs">
            <p className="flex items-center gap-1 font-semibold text-ensena-ink"><FileText className="size-3.5 text-ensena-primary" /> Summary</p>
            <p className="mt-1 text-ensena-muted">{selected.aiSummary}</p>
          </div>
        )}

        <p className="mt-3 text-xs font-semibold text-ensena-ink">Notes</p>
        <p className="mt-1 text-xs text-ensena-muted">{selected.notes}</p>

        <div className="mt-4 grid grid-cols-2 gap-1.5 text-xs">
          <button type="button" onClick={() => flash("Video calling isn't available in this demo yet. Coordinate with the student directly.")} className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 font-semibold text-white hover:bg-blue-700"><Video className="size-3.5" /> Join Meeting</button>
          <button type="button" onClick={() => onReschedule(selected.id)} className="rounded-full border border-ensena-border py-2 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Reschedule</button>
          <button type="button" onClick={() => onCancel(selected.id)} className="rounded-full border border-ensena-border py-2 font-medium text-rose-600 hover:bg-rose-50">Cancel</button>
        </div>

        <div className="mt-3 border-t border-ensena-border pt-3">
          <p className="text-xs font-semibold text-ensena-ink">After Session</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
            <button type="button" onClick={() => onComplete(selected.id)} className="rounded-full border border-ensena-border py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Complete Session</button>
            <button type="button" onClick={() => onCreateActionPlan({ student: selected.student, image: selected.image, goal: selected.reason })} className="rounded-full border border-ensena-border py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Create Action Plan</button>
            <button type="button" onClick={() => onBookFollowUp({ student: selected.student, image: selected.image, reason: selected.reason })} className="rounded-full border border-ensena-border py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Book Follow-up</button>
            <button type="button" onClick={() => flash("Sending resources isn't available in this demo yet.")} className="rounded-full border border-ensena-border py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Send Resources</button>
            <button type="button" onClick={() => flash("Summary generation isn't available in this demo yet.")} className="col-span-2 rounded-full border border-ensena-border py-1.5 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Generate Summary</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STUDENTS ====================

function StudentsSection({
  cases,
  caseTab,
  setCaseTab,
  caseQuery,
  setCaseQuery,
  onView,
}: {
  cases: StudentCase[];
  caseTab: (typeof caseTabs)[number];
  setCaseTab: (t: (typeof caseTabs)[number]) => void;
  caseQuery: string;
  setCaseQuery: (q: string) => void;
  onView: (id: string) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {caseTabs.map((t) => (
            <button key={t} type="button" onClick={() => setCaseTab(t)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", caseTab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{t}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input value={caseQuery} onChange={(e) => setCaseQuery(e.target.value)} placeholder="Search students…" className="h-10 w-56 rounded-full border border-ensena-border pl-9 pr-4 text-sm" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Risk</th>
              <th className="py-2 pr-3 font-medium">Priority Score</th>
              <th className="py-2 pr-3 font-medium">Last Session</th>
              <th className="py-2 pr-3 font-medium">Next Session</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} onClick={() => onView(c.id)} className="cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={c.image} alt={c.student} fill sizes="32px" className="object-cover" /></div>
                    <div>
                      <p className="font-medium text-ensena-ink">{c.student}</p>
                      <p className="text-xs text-ensena-muted">{c.level}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-3"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", riskStyles[c.risk])}>{c.risk}</span></td>
                <td className="py-3 pr-3 text-ensena-ink">{c.aiScore}%</td>
                <td className="py-3 pr-3 text-ensena-muted">{c.lastSession}</td>
                <td className="py-3 pr-3 text-ensena-muted">{c.nextSession}</td>
                <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", caseStatusStyles[c.status])}>{c.status}</span></td>
              </tr>
            ))}
            {cases.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-ensena-muted">No students match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentCaseModalBody({
  studentCase,
  tab,
  setTab,
}: {
  studentCase: StudentCase;
  tab: "Overview" | "Timeline" | "History" | "Charts";
  setTab: (t: "Overview" | "Timeline" | "History" | "Charts") => void;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={studentCase.image} alt={studentCase.student} fill sizes="48px" className="object-cover" /></div>
        <div>
          <p className="font-semibold text-ensena-ink">{studentCase.student}</p>
          <p className="text-xs text-ensena-muted">{studentCase.level} · {studentCase.primaryGoal}</p>
        </div>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold", riskStyles[studentCase.risk])}>{studentCase.risk} Risk</span>
      </div>

      <div className="flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-xs">
        {(["Overview", "Timeline", "History", "Charts"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("flex-1 rounded-full px-2.5 py-1.5 font-medium", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted")}>{t}</button>
        ))}
      </div>

      <div className="max-h-[360px] overflow-y-auto text-xs">
        {tab === "Overview" && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-ensena-bg-soft p-2.5"><p className="text-ensena-muted">Priority Score</p><p className="text-sm font-semibold text-ensena-ink">{studentCase.aiScore}%</p></div>
              <div className="rounded-lg bg-ensena-bg-soft p-2.5"><p className="text-ensena-muted">Status</p><p className="text-sm font-semibold text-ensena-ink">{studentCase.status}</p></div>
              <div className="rounded-lg bg-ensena-bg-soft p-2.5"><p className="text-ensena-muted">Attendance</p><p className="text-sm font-semibold text-ensena-ink">{studentCase.attendancePct}%</p></div>
              <div className="rounded-lg bg-ensena-bg-soft p-2.5"><p className="text-ensena-muted">Homework</p><p className="text-sm font-semibold text-ensena-ink">{studentCase.homeworkPct}%</p></div>
            </div>
            <p className="font-semibold text-ensena-ink">Subjects</p>
            <div className="flex flex-wrap gap-1.5">{studentCase.subjects.map((s) => <span key={s} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-ensena-ink">{s}</span>)}</div>
            {studentCase.intake && (
              <div className="rounded-xl bg-ensena-primary/5 p-2.5">
                <p className="flex items-center gap-1 font-semibold text-ensena-ink"><FileText className="size-3 text-ensena-primary" /> Intake Summary</p>
                <p className="mt-1 text-ensena-muted">{studentCase.intake.examTrack} · {studentCase.intake.dreamCourse} · Weak in {studentCase.intake.weakSubject} · {studentCase.intake.tutorPreference}</p>
              </div>
            )}
            {studentCase.privateNotes.length > 0 && (
              <div>
                <p className="font-semibold text-ensena-ink">Private Notes</p>
                <ul className="mt-1 list-disc pl-4 text-ensena-muted">{studentCase.privateNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        {tab === "Timeline" && (
          <ol className="flex flex-col gap-1.5">
            {studentCase.timeline.map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                {t.done ? <CheckCircle2 className="size-3.5 shrink-0 text-ensena-success" /> : <Circle className="size-3.5 shrink-0 text-ensena-border" />}
                <span className={t.done ? "text-ensena-ink" : "text-ensena-muted"}>{t.label}</span>
              </li>
            ))}
          </ol>
        )}

        {tab === "History" && (
          <div className="flex flex-col gap-2">
            {studentCase.history.map((h, i) => (
              <div key={i} className="rounded-lg bg-ensena-bg-soft p-2.5">
                <div className="flex justify-between"><span className="font-medium text-ensena-ink">{h.date}</span><span className="text-ensena-muted">{h.duration}</span></div>
                <p className="mt-1 text-ensena-muted">{h.notes}</p>
                <p className="mt-1 text-[10px] font-medium text-ensena-primary">{h.outcome}</p>
              </div>
            ))}
            {studentCase.history.length === 0 && <p className="text-ensena-muted">No previous sessions.</p>}
          </div>
        )}

        {tab === "Charts" && (
          <div className="flex flex-col gap-2">
            {[
              { label: "Attendance", pct: studentCase.attendancePct },
              { label: "Homework", pct: studentCase.homeworkPct },
              { label: "Priority Score", pct: studentCase.aiScore },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-ensena-muted"><span>{row.label}</span><span>{row.pct}%</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${row.pct}%` }} /></div>
              </div>
            ))}
            {studentCase.outcome && (
              <div className="mt-1 rounded-xl bg-emerald-50 p-2.5">
                <p className="font-semibold text-emerald-700">Outcome: {studentCase.outcome.outcome}</p>
                <p className="mt-1 text-ensena-muted">Attendance {studentCase.outcome.attendanceBefore}% → {studentCase.outcome.attendanceAfter}% · Score {studentCase.outcome.scoreBefore}% → {studentCase.outcome.scoreAfter}%</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== INTAKE FORMS ====================

function IntakeFormsSection({
  forms,
  tab,
  setTab,
  onView,
}: {
  forms: IntakeForm[];
  tab: IntakeFormStatus;
  setTab: (t: IntakeFormStatus) => void;
  onView: (id: string) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex flex-wrap gap-1.5">
        {intakeTabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}>{t}</button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {forms.map((f) => (
          <button key={f.id} type="button" onClick={() => onView(f.id)} className="rounded-xl border border-ensena-border p-4 text-left hover:bg-ensena-bg-soft">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={f.image} alt={f.student} fill sizes="36px" className="object-cover" /></div>
                <div>
                  <p className="text-sm font-medium text-ensena-ink">{f.student}</p>
                  <p className="text-xs text-ensena-muted">{f.level}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", intakeFormStatusStyles[f.status])}>{f.status}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">{f.goals.map((g) => <span key={g} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] text-ensena-ink">{g}</span>)}</div>
            <p className="mt-2 text-[11px] text-ensena-muted">Submitted {f.submittedDate}</p>
          </button>
        ))}
        {forms.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted lg:col-span-2">No {tab.toLowerCase()} intake forms.</p>}
      </div>
    </div>
  );
}

// ==================== AI INSIGHTS ====================

function AiInsightsSection({ highRiskCases, flash }: { highRiskCases: StudentCase[]; flash: (m: string) => void }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink"><AlertTriangle className="size-4.5 text-rose-600" /> High Risk Students</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {highRiskCases.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-xl border-l-4 border-rose-500 bg-ensena-bg-soft p-2.5 text-xs">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={c.image} alt={c.student} fill sizes="32px" className="object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ensena-ink">{c.student}</p>
                <p className="text-ensena-muted">Attendance {c.attendancePct}% · Homework {c.homeworkPct}%</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink"><Lightbulb className="size-4.5 text-ensena-primary" /> Recommendations</h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-xs">
          {aiRecommendationActions.map((a, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-ensena-primary/5 px-3 py-2 text-ensena-ink">
              <Lightbulb className="size-3 shrink-0 text-ensena-primary" /> {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink"><BarChart3 className="size-4.5 text-ensena-primary" /> Trends: Most Common Problems</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {counsellingReports.commonStruggles.map((s) => (
            <li key={s.label}>
              <div className="flex justify-between text-xs"><span className="text-ensena-ink">{s.label}</span><span className="text-ensena-muted">{s.pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${s.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink"><TrendingUp className="size-4.5 text-ensena-primary" /> Predictions</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {aiPredictions.map((p) => (
            <li key={p.student} className="flex items-center gap-2 text-xs">
              <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={p.image} alt={p.student} fill sizes="28px" className="object-cover" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ensena-ink">{p.student}</p>
                <p className={cn(p.tone === "positive" ? "text-ensena-success" : "text-amber-700")}>{p.prediction}</p>
              </div>
              <span className="shrink-0 rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-ink">{p.confidence}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 xl:col-span-2">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Report Generator</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => flash("Generated reports aren't available in this demo yet. See the Reports tab for a real exportable summary.")} className="rounded-xl border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">Weekly Report</button>
          <button type="button" onClick={() => flash("Generated reports aren't available in this demo yet. See the Reports tab for a real exportable summary.")} className="rounded-xl border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">Monthly Report</button>
          <button type="button" onClick={() => flash("Generated reports aren't available in this demo yet. See the Reports tab for a real exportable summary.")} className="rounded-xl border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">Individual Report</button>
        </div>
      </div>
    </div>
  );
}

// ==================== ACTION PLANS ====================

function ActionPlansSection({
  plans,
  selected,
  onSelect,
  onToggleTask,
}: {
  plans: ActionPlanRecord[];
  selected: ActionPlanRecord | null;
  onSelect: (id: string) => void;
  onToggleTask: (planId: string, taskIndex: number) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Action Plans</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-3 font-medium">Student</th>
                <th className="py-2 pr-3 font-medium">Goal</th>
                <th className="py-2 pr-3 font-medium">Progress</th>
                <th className="py-2 pr-3 font-medium">Due Date</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.id} onClick={() => onSelect(p.id)} className={cn("cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft", selected?.id === p.id && "bg-ensena-primary/5")}>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={p.image} alt={p.student} fill sizes="28px" className="object-cover" /></div>
                      <span className="font-medium text-ensena-ink">{p.student}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-ensena-muted">{p.goal}</td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${p.progressPct}%` }} /></div>
                      <span className="text-xs text-ensena-ink">{p.progressPct}%</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-ensena-muted">{p.dueDate}</td>
                  <td className="py-3 pr-3"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", actionPlanStatusStyles[p.status])}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="rounded-2xl border border-ensena-border p-5">
          <div className="flex items-center gap-2.5">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={selected.image} alt={selected.student} fill sizes="40px" className="object-cover" /></div>
            <div>
              <p className="font-heading text-sm font-semibold text-ensena-ink">{selected.student}</p>
              <p className="text-xs text-ensena-muted">{selected.goal}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-xs">
            <div className="flex justify-between"><span className="text-ensena-muted">{selected.metric.label}</span><span className="font-semibold text-ensena-ink">{selected.metric.current}%</span></div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${Math.min(100, (selected.metric.current / selected.metric.target) * 100)}%` }} /></div>
            <p className="mt-1 text-[10px] text-ensena-muted">Before: {selected.metric.before}% · Target: {selected.metric.target}%</p>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <p className="font-semibold text-ensena-ink">Tasks</p>
              <span className="font-medium text-ensena-primary">{selected.progressPct}% Complete</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-success" style={{ width: `${selected.progressPct}%` }} /></div>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs">
              {selected.tasks.map((t, i) => (
                <li key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => onToggleTask(selected.id, i)}>
                    {t.done ? <CheckCircle2 className="size-3.5 text-ensena-success" /> : <Circle className="size-3.5 text-ensena-border" />}
                  </button>
                  <span className={t.done ? "text-ensena-ink line-through decoration-ensena-border" : "text-ensena-ink"}>{t.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-3 rounded-xl bg-ensena-primary/5 p-3">
            <p className="flex items-center gap-1 text-xs font-semibold text-ensena-ink"><TrendingUp className="size-3.5 text-ensena-primary" /> Automatic Tracking</p>
            <dl className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex justify-between"><dt className="text-ensena-muted">Homework</dt><dd className="text-ensena-ink">{selected.aiTracking.homework}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Attendance</dt><dd className="text-ensena-ink">{selected.aiTracking.attendance}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Study Time</dt><dd className="text-ensena-ink">{selected.aiTracking.studyTime}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Tutor Feedback</dt><dd className="text-ensena-ink">{selected.aiTracking.tutorFeedback}</dd></div>
              <div className="col-span-2 flex justify-between border-t border-ensena-border/60 pt-1"><dt className="font-medium text-ensena-muted">Overall</dt><dd className="font-semibold text-ensena-primary">{selected.aiTracking.overall}</dd></div>
            </dl>
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold text-ensena-ink">Follow-up Schedule</p>
            <ol className="mt-1.5 flex flex-col gap-1.5 text-xs">
              {selected.followUpSchedule.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2.5 py-1.5">
                  <span className="text-ensena-ink">{f.week}: {f.label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", f.status === "Done" ? "bg-emerald-100 text-emerald-700" : f.status === "Upcoming" ? "bg-blue-100 text-blue-700" : "bg-ensena-bg-soft text-ensena-muted")}>{f.status}</span>
                </li>
              ))}
            </ol>
          </div>

          {selected.completionReport && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs">
              <p className="font-semibold text-emerald-700">{selected.completionReport.status}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
                {(["attendance", "score", "homework"] as const).map((k) => (
                  <div key={k}>
                    <p className="capitalize text-ensena-muted">{k}</p>
                    <p className="text-ensena-ink">{selected.completionReport!.before[k]}% → <span className="font-semibold text-emerald-700">{selected.completionReport!.after[k]}%</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== NOTES ====================
// Private, admin-only session notes. One counsellor, recorded after every
// session: summary, advice given, recommended tutors/group classes, next steps.

function NotesSection({ cases, onAddNote }: { cases: StudentCase[]; onAddNote: (caseId: string) => void }) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {cases.map((c) => (
        <div key={c.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={c.image} alt={c.student} fill sizes="36px" className="object-cover" /></div>
              <div>
                <p className="font-heading text-sm font-semibold text-ensena-ink">{c.student}</p>
                <p className="text-xs text-ensena-muted">{c.level}</p>
              </div>
            </div>
            <button type="button" onClick={() => onAddNote(c.id)} className="rounded-full bg-ensena-primary px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
              Add Note
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-1.5 text-xs">
            {c.privateNotes.map((n, i) => (
              <li key={i} className="rounded-lg bg-ensena-bg-soft px-2.5 py-2 text-ensena-ink">{n}</li>
            ))}
            {c.privateNotes.length === 0 && <li className="text-ensena-muted">No notes recorded yet.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ==================== FOLLOW-UPS ====================

function FollowUpsSection({
  items,
  onBookFollowUp,
  onCloseCase,
}: {
  items: FollowUpDue[];
  onBookFollowUp: (input: { student: string; image: string; reason: string }) => void;
  onCloseCase: (studentName: string) => void;
}) {
  const [msgTarget, setMsgTarget] = useState<{ name: string } | null>(null);
  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Students Needing Follow-up</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2 pr-3 font-medium">Student</th>
              <th className="py-2 pr-3 font-medium">Reason</th>
              <th className="py-2 pr-3 font-medium">Recommended Follow-up</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id} className="border-b border-ensena-border text-xs last:border-0">
                <td className="py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={f.image} alt={f.student} fill sizes="28px" className="object-cover" /></div>
                    <span className="font-medium text-ensena-ink">{f.student}</span>
                  </div>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{f.topic}</td>
                <td className="py-3 pr-3 text-ensena-ink">{f.due}</td>
                <td className="py-3 pr-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", f.urgency === "Overdue" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>{f.urgency}</span>
                </td>
                <td className="py-3 pr-3">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onBookFollowUp({ student: f.student, image: f.image, reason: f.topic })} className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">Book Follow-up</button>
                    <button type="button" onClick={() => setMsgTarget({ name: f.student })} className="rounded-full border border-ensena-border px-2.5 py-1 text-[11px] font-medium text-ensena-ink hover:bg-ensena-bg-soft">Message</button>
                    <button type="button" onClick={() => onCloseCase(f.student)} className="rounded-full border border-ensena-border px-2.5 py-1 text-[11px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">Close Case</button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-ensena-muted">No students currently need follow-up.</td></tr>}
          </tbody>
        </table>
      </div>
      <AdminMsgTutorModal open={!!msgTarget} onClose={() => setMsgTarget(null)} recipientName={msgTarget?.name ?? ""} role="Student" />
    </div>
  );
}

// ==================== RESOURCES ====================

function ResourcesSection({ flash }: { flash: (m: string) => void }) {
  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Resource Library</h2>
        <button type="button" onClick={() => flash("Uploading resources isn't available in this demo yet. No real file storage is connected.")} className="flex items-center gap-1.5 rounded-full bg-ensena-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
          <Upload className="size-3.5" /> Upload Resource
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {counsellingResources.map((r) => (
          <div key={r.title} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-3 text-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ensena-primary/10 text-ensena-primary"><BookOpen className="size-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ensena-ink">{r.title}</p>
              <p className="text-ensena-muted">{r.category} · {r.type} · {r.size}</p>
            </div>
            <button type="button" onClick={() => flash("This resource isn't stored as a real file in this demo yet.")} className="shrink-0 rounded-full p-1.5 text-ensena-muted hover:bg-ensena-bg-soft"><Download className="size-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MESSAGES ====================

function MessagesSection() {
  const threads = [
    { name: "Sarah Johnson", image: "/teacher-4.jpg.png", last: "Thank you for the session today!", time: "10:32 AM", unread: 2 },
    { name: "David Okoro", image: "/teacher-1.jpg.png", last: "Can we move Thursday's call?", time: "Yesterday", unread: 0 },
    { name: "Mary Bello", image: "/teacher-2.jpg.png", last: "I submitted the essay you asked for.", time: "Yesterday", unread: 1 },
    { name: "Ibrahim Bello", image: "/teacher-3.jpg.png", last: "Thanks for the guidance on Law!", time: "2 days ago", unread: 0 },
  ];
  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">Messages</h2>
      <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
        {threads.map((t) => (
          <li key={t.name} className="flex items-center gap-3 py-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={t.image} alt={t.name} fill sizes="40px" className="object-cover" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ensena-ink">{t.name}</p>
              <p className="truncate text-xs text-ensena-muted">{t.last}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[10px] text-ensena-muted">{t.time}</span>
              {t.unread > 0 && <span className="flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-semibold text-white">{t.unread}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==================== CALENDAR ====================

function CalendarSection({
  calendarMonth,
  monthCells,
  setCalendarMonthISO,
  isBlocked,
  openBlockModalFor,
  appointments,
}: {
  calendarMonth: Date;
  monthCells: Date[];
  setCalendarMonthISO: (iso: string) => void;
  isBlocked: (dateISO: string) => boolean;
  openBlockModalFor: (dateISO: string) => void;
  appointments: Appointment[];
}) {
  function shiftMonth(amount: number) {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + amount);
    setCalendarMonthISO(toISO(d));
  }
  function sessionsOn(dateISO: string) {
    return appointments.filter((a) => a.dateISO === dateISO && a.status !== "Cancelled");
  }

  return (
    <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink"><CalendarIcon className="size-4.5 text-ensena-primary" /> {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} className="flex size-7 items-center justify-center rounded-full border border-ensena-border"><ChevronLeft className="size-3.5" /></button>
          <button type="button" onClick={() => setCalendarMonthISO(toISO(new Date()))} className="rounded-full border border-ensena-border px-2.5 py-1 text-[11px] font-medium hover:bg-ensena-bg-soft">Today</button>
          <button type="button" onClick={() => shiftMonth(1)} className="flex size-7 items-center justify-center rounded-full border border-ensena-border"><ChevronRight className="size-3.5" /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-[10px]">
        {WEEKDAY_SHORT.map((d) => <div key={d} className="text-center font-semibold text-ensena-muted">{d}</div>)}
        {monthCells.map((date) => {
          const dISO = toISO(date);
          const inMonth = date.getMonth() === calendarMonth.getMonth();
          const blocked = isBlocked(dISO);
          const sessions = sessionsOn(dISO);
          return (
            <button
              key={dISO}
              type="button"
              onClick={() => openBlockModalFor(dISO)}
              className={cn("min-h-16 rounded-lg border border-ensena-border p-1 text-left", !inMonth && "opacity-40", blocked && "bg-rose-50")}
            >
              <span className="font-semibold text-ensena-ink">{date.getDate()}</span>
              {blocked && <span className="mt-0.5 block truncate rounded bg-rose-100 px-1 py-0.5 text-[9px] font-medium text-rose-700">Blocked</span>}
              <div className="mt-0.5 flex flex-col gap-0.5">
                {sessions.slice(0, 2).map((s) => (
                  <span key={s.id} className="truncate rounded bg-blue-100 px-1 py-0.5 text-[9px] text-blue-700">{s.time} {s.student.split(" ")[0]}</span>
                ))}
                {sessions.length > 2 && <span className="text-ensena-muted">+{sessions.length - 2} more</span>}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-ensena-muted">Click any date to block it or view blocked status. Blocked days won&apos;t accept new bookings.</p>
    </div>
  );
}

// ==================== REPORTS ====================

function ReportsSection({ flash }: { flash: (m: string) => void }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Students Helped</p><p className="text-lg font-semibold text-ensena-ink">{counsellingReports.studentsHelped}</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Avg. Improvement</p><p className="text-lg font-semibold text-ensena-success">+{counsellingReports.averageImprovementPct}%</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">Avg. Duration</p><p className="text-lg font-semibold text-ensena-ink">{counsellingReports.averageDurationMins}m</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="text-xs text-ensena-muted">No-Show Rate</p><p className="text-lg font-semibold text-amber-600">{counsellingReports.noShowRatePct}%</p></div>
        </div>
        <button
          type="button"
          onClick={() => {
            downloadCsv(
              [
                ["Metric", "Value"],
                ["Students Helped", counsellingReports.studentsHelped],
                ["Avg. Improvement (%)", counsellingReports.averageImprovementPct],
                ["Avg. Duration (min)", counsellingReports.averageDurationMins],
                ["No-Show Rate (%)", counsellingReports.noShowRatePct],
                [],
                ["Most Requested Subjects", "Requests"],
                ...counsellingReports.mostRequestedSubjects.map((s) => [s.label, s.count]),
                [],
                ["Common Goals", "%"],
                ...counsellingReports.commonGoals.map((g) => [g.label, g.pct]),
                [],
                ["Common Struggles", "%"],
                ...counsellingReports.commonStruggles.map((s) => [s.label, s.pct]),
              ],
              "counselling-report.csv"
            );
            flash("Report exported.");
          }}
          className="mt-3 flex items-center gap-1.5 rounded-full border border-ensena-border px-3.5 py-2 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Download className="size-3.5" /> Export Report
        </button>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Most Requested Subjects</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {counsellingReports.mostRequestedSubjects.map((s) => (
            <li key={s.label} className="flex items-center justify-between text-xs">
              <span className="text-ensena-ink">{s.label}</span>
              <span className="text-ensena-muted">{s.count} requests</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Common Goals</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {counsellingReports.commonGoals.map((g) => (
            <li key={g.label}>
              <div className="flex justify-between text-xs"><span className="text-ensena-ink">{g.label}</span><span className="text-ensena-muted">{g.pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-primary" style={{ width: `${g.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Common Struggles</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {counsellingReports.commonStruggles.map((s) => (
            <li key={s.label}>
              <div className="flex justify-between text-xs"><span className="text-ensena-ink">{s.label}</span><span className="text-ensena-muted">{s.pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-amber-400" style={{ width: `${s.pct}%` }} /></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ==================== SETTINGS ====================

function SettingsSection({
  availability,
  setAvailability,
  blockedDates,
  setBlockedDates,
  flash,
}: {
  availability: AvailabilityDay[];
  setAvailability: (fn: (prev: AvailabilityDay[]) => AvailabilityDay[]) => void;
  blockedDates: BlockedDate[];
  setBlockedDates: (fn: (prev: BlockedDate[]) => BlockedDate[]) => void;
  flash: (m: string) => void;
}) {
  function toggleDay(day: string) {
    setAvailability((prev) => prev.map((d) => (d.day === day ? { ...d, enabled: !d.enabled } : d)));
  }
  function updateTime(day: string, field: "start" | "end", value: string) {
    setAvailability((prev) => prev.map((d) => (d.day === day ? { ...d, [field]: to12HourDisplay(value) } : d)));
  }
  function removeBlockedDate(date: string) {
    setBlockedDates((prev) => prev.filter((b) => b.date !== date));
    flash("Blocked date removed.");
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Weekly Availability</h2>
        <div className="mt-3 flex flex-col gap-2">
          {availability.map((d) => (
            <div key={d.day} className="flex flex-wrap items-center gap-2 rounded-xl border border-ensena-border p-2.5 text-xs">
              <label className="flex w-28 shrink-0 items-center gap-2 font-medium text-ensena-ink">
                <input type="checkbox" checked={d.enabled} onChange={() => toggleDay(d.day)} className="size-3.5 rounded border-ensena-border" />
                {d.day}
              </label>
              {d.enabled ? (
                <>
                  <input type="time" value={to24HourValue(d.start)} onChange={(e) => updateTime(d.day, "start", e.target.value)} className="h-8 rounded-lg border border-ensena-border px-2 text-xs" />
                  <span className="text-ensena-muted">to</span>
                  <input type="time" value={to24HourValue(d.end)} onChange={(e) => updateTime(d.day, "end", e.target.value)} className="h-8 rounded-lg border border-ensena-border px-2 text-xs" />
                </>
              ) : (
                <span className="text-ensena-muted">Unavailable</span>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => flash("Availability saved.")} className="mt-3 rounded-full bg-ensena-primary px-4 py-2 text-xs font-semibold text-white hover:bg-ensena-primary-hover">Save Availability</button>
      </div>

      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Blocked Dates</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {blockedDates.map((b) => (
            <li key={b.date} className="flex items-center justify-between rounded-xl border border-ensena-border p-2.5 text-xs">
              <div>
                <p className="font-medium text-ensena-ink">{b.date}</p>
                <p className="text-ensena-muted">{b.reason} · {b.allDay ? "All day" : `${b.startTime} – ${b.endTime}`}</p>
              </div>
              <button type="button" onClick={() => removeBlockedDate(b.date)} className="rounded-full p-1.5 text-ensena-muted hover:bg-ensena-bg-soft hover:text-rose-600"><X className="size-3.5" /></button>
            </li>
          ))}
          {blockedDates.length === 0 && <p className="text-xs text-ensena-muted">No blocked dates. Use the Calendar tab to block a date.</p>}
        </ul>

        <div className="mt-4 border-t border-ensena-border pt-3">
          <h3 className="text-sm font-semibold text-ensena-ink">Profile</h3>
          <div className="mt-2 flex items-center gap-2 text-xs text-ensena-muted">
            <UserCheck className="size-3.5" /> Cynthia Ejie · Counsellor · Admin
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-ensena-muted">
            <BellRing className="size-3.5" /> Email &amp; push notifications enabled
          </div>
        </div>
      </div>
    </div>
  );
}
