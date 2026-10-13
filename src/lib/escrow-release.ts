import { splitEarnings } from "@/lib/commission";
import { buildBookingReference } from "@/lib/booking-reference";

export type ConfirmationStatus = "Pending" | "Confirmed" | "Disputed";
export type EscrowReleaseStatus = "Held" | "Released" | "Frozen";

// The admin-facing dispute workflow status — only meaningful once
// confirmationStatus === "Disputed" (or complaintFiled for a Group class).
// Kept separate from ConfirmationStatus/EscrowReleaseStatus (which drive the
// money) so a dispute can move through New → Under Review → Resolved without
// touching where the funds actually sit.
export type DisputeStatus = "New" | "Under Review" | "Awaiting Response" | "Resolved" | "Dismissed";
export type DisputePriority = "High" | "Medium" | "Low";
export type DisputeOutcome = "Release" | "Refund" | "Partial" | "Dismiss";

export interface DisputeResolution {
  outcome: DisputeOutcome;
  note: string;
  tutorReceived: number;
  studentRefund: number;
  resolvedBy: string;
  resolvedAtLabel: string;
}

// AI-verified attendance record for a Group Class session. Private lessons
// don't use this — they're confirmed by the student or auto-released after 24h.
export interface GroupAttendance {
  classDurationMinutes: number;
  attendedMinutes: number;
  attendancePct: number;
  tutorStartedOnTime: boolean;
  tutorStayedConnected: boolean;
  recordingSaved: boolean;
  whiteboardUsed: boolean;
  healthScore: number; // 0-100
  present: boolean; // attendancePct >= ATTENDANCE_PRESENT_THRESHOLD
}

export interface LessonConfirmation {
  id: string;
  student: string;
  tutor: string;
  subject: string;
  type: "Private" | "Group";
  groupClassId?: string;
  // Identifies one specific recurring-class meeting date so every enrolled
  // student's independent LessonConfirmation for that same session can be
  // grouped/aggregated (e.g. "9/10 attended") without relying on timestamp
  // proximity. Reuses tutor-dashboard-data.ts's GroupClassSessionInstance.id
  // scheme ("{groupClassId}-session-{index}") rather than inventing a new one.
  sessionId?: string;
  // Real, secure-randomly-generated, permanently-persisted reference code
  // (SES + 7) for this session — only set for a session actually created at
  // runtime via startGroupSessionConfirmations (never a pre-seeded one,
  // which has no backend to have issued a real code from). Every student's
  // record for the same session shares the same code, since it identifies
  // the session, not the individual student's allocation.
  sessionReferenceCode?: string;
  // This one student's own real reference code — GRP for a Group
  // enrollment/allocation, PRV for a Private lesson — distinct from the
  // shared sessionReferenceCode above (one session, many students, one
  // GRP/PRV code each). Only set for records created at runtime.
  referenceCode?: string;
  // The dispute's OWN real DSP code, issued only once a dispute is actually
  // opened on this record — separate from referenceCode (the booking code)
  // per "the Dispute Code does NOT replace the related Booking Code; both
  // remain linked." Only set for a dispute opened at runtime.
  disputeReferenceCode?: string;
  amountGross: number;
  completedAt: number; // epoch ms
  autoReleaseAt: number; // epoch ms — completedAt + 24h
  confirmationStatus: ConfirmationStatus;
  escrowStatus: EscrowReleaseStatus;
  disputeReason?: string;
  disputeDetails?: string;
  releasedAt?: number;
  attendance?: GroupAttendance;
  complaintFiled?: boolean;
  complaintReason?: string;
  complaintDetails?: string;
  // The tutor never joined this Group session at all — held indefinitely
  // (excluded from the 24h auto-release sweep) pending Admin review, per
  // "a class that never happened must never auto-pay out."
  tutorAbsent?: boolean;
  // Actual recorded duration fell well short of what was scheduled — purely
  // informational evidence for a dispute, never auto-determines fault.
  sessionDurationIssue?: boolean;
  // The TUTOR (not a student) flagged a problem with this Group session
  // while ending it — every enrolled student's allocation is held for
  // review rather than starting the normal 24h window, since the tutor
  // themselves is saying the class didn't go as planned.
  tutorReportedIssue?: string;
  // Set when this record was created from a real "End Class" click in the
  // Virtual Classroom (rather than seeded) — a genuine, non-fabricated data
  // point admins can use as dispute evidence.
  scheduledLabel?: string;
  completedAtLabel?: string;

  // Real admin-bookings-data.ts BookingRow id — only set where a genuine
  // match exists (never fabricated), so "View Booking Details" always opens
  // a real, consistent record rather than a coincidence-of-names guess.
  bookingId?: string;

  // ---- Admin dispute workflow (only set once a dispute is opened) ----
  disputeStatus?: DisputeStatus;
  disputePriority?: DisputePriority;
  disputeSubmittedLabel?: string;
  disputeAdditionalNotes?: string;
  tutorResponse?: string;
  tutorResponseAtLabel?: string;
  resolution?: DisputeResolution;

  // ---- Session Record — objective evidence for a dispute, populated only
  // when the Virtual Classroom actually tracked it (real join/end times).
  // Left undefined for older/seeded records that predate this tracking. ----
  scheduledDurationMinutes?: number;
  tutorJoinedLabel?: string;
  studentJoinedLabel?: string;
  sessionEndedLabel?: string;
  recordedDurationMinutes?: number;
}

export const disputeStatusStyles: Record<DisputeStatus, string> = {
  New: "bg-rose-100 text-rose-700",
  "Under Review": "bg-amber-100 text-amber-700",
  "Awaiting Response": "bg-blue-100 text-blue-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Dismissed: "bg-ensena-bg-soft text-ensena-muted",
};

export const disputePriorityStyles: Record<DisputePriority, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-ensena-bg-soft text-ensena-muted",
};

export function priorityForReason(reason: string): DisputePriority {
  if (["Tutor did not attend", "Tutor absent", "Class cancelled", "Tutor joined late", "Lesson did not take place", "Policy violation"].includes(reason)) return "High";
  if (["Technical issues", "Technical issue", "Poor lesson quality", "Lesson ended early", "Lesson was not as described"].includes(reason)) return "Medium";
  return "Low";
}

// A dispute is unambiguously a dispute — same reference-code system as
// bookings/payouts, just its own DSP prefix, and no type-lookup needed.
// Prefers a record's own real, secure-randomly-issued referenceCode
// (records created at runtime — see reference-code-store.ts) over the
// deterministic seed-data derivation, without needing two different
// functions at every call site.
export function formatDisputeDisplayId(id: string, referenceCode?: string): string {
  return referenceCode ?? buildBookingReference("dispute", id);
}

export const disputeReasons = [
  "Tutor did not attend",
  "Tutor joined late",
  "Lesson ended early",
  "Poor lesson quality",
  "Technical issues",
  "Wrong tutor",
  "Lesson did not take place",
  "Lesson was not as described",
  "Other",
];

// Options the TUTOR sees when reporting a problem while ending a Group
// class — distinct from disputeReasons/complaintReasons, which are what a
// STUDENT sees.
export const tutorProblemReasons = ["Technical issue", "Class could not take place", "Class ended early", "Other"];

export const complaintReasons = [
  "Poor audio/video quality",
  "Wrong teacher",
  "Tutor absent",
  "Class cancelled",
  "Inappropriate behaviour",
  "Technical issue",
  "Other",
];

// A fixed simulated "now" (not Date.now() — must be deterministic across
// server render and client hydration) so the 24-hour countdown window can be
// demonstrated without literally waiting a day; ticks forward in real time
// from this anchor once mounted on the client.
export const releaseSimNowAnchor = new Date(2026, 6, 9, 8, 0, 0).getTime();
export const releaseSimNowAnchorRealTime = Date.now();
const HOUR = 60 * 60 * 1000;

export const ATTENDANCE_PRESENT_THRESHOLD = 75; // % of class duration
export const HEALTH_SCORE_RELEASE_THRESHOLD = 70; // out of 100

export function makeAttendance(partial: {
  classDurationMinutes: number;
  attendedMinutes: number;
  tutorStartedOnTime?: boolean;
  tutorStayedConnected?: boolean;
  recordingSaved?: boolean;
  whiteboardUsed?: boolean;
}): GroupAttendance {
  const attendancePct = Math.round((partial.attendedMinutes / partial.classDurationMinutes) * 100);
  const present = attendancePct >= ATTENDANCE_PRESENT_THRESHOLD;
  const tutorStartedOnTime = partial.tutorStartedOnTime ?? true;
  const tutorStayedConnected = partial.tutorStayedConnected ?? true;
  const recordingSaved = partial.recordingSaved ?? true;
  const whiteboardUsed = partial.whiteboardUsed ?? true;
  const checks = [tutorStartedOnTime, tutorStayedConnected, recordingSaved, whiteboardUsed, present];
  const passedChecks = checks.filter(Boolean).length;
  const healthScore = Math.round((passedChecks / checks.length) * 60 + Math.min(attendancePct, 100) * 0.4);
  return {
    classDurationMinutes: partial.classDurationMinutes,
    attendedMinutes: partial.attendedMinutes,
    attendancePct,
    tutorStartedOnTime,
    tutorStayedConnected,
    recordingSaved,
    whiteboardUsed,
    healthScore,
    present,
  };
}

function makeConfirmation(partial: {
  id: string;
  student: string;
  tutor: string;
  subject: string;
  type?: "Private" | "Group";
  groupClassId?: string;
  sessionId?: string;
  amountGross: number;
  hoursAgoCompleted: number;
  confirmationStatus?: ConfirmationStatus;
  escrowStatus?: EscrowReleaseStatus;
  attendance?: GroupAttendance;
  complaintFiled?: boolean;
  complaintReason?: string;
  complaintDetails?: string;
  tutorAbsent?: boolean;
  sessionDurationIssue?: boolean;
  bookingId?: string;
  completedAtLabel?: string;
  disputeReason?: string;
  disputeDetails?: string;
  disputeStatus?: DisputeStatus;
  disputePriority?: DisputePriority;
  disputeSubmittedLabel?: string;
  disputeAdditionalNotes?: string;
  tutorResponse?: string;
  tutorResponseAtLabel?: string;
  resolution?: DisputeResolution;
  scheduledLabel?: string;
  scheduledDurationMinutes?: number;
  tutorJoinedLabel?: string;
  studentJoinedLabel?: string;
  sessionEndedLabel?: string;
  recordedDurationMinutes?: number;
}): LessonConfirmation {
  const completedAt = releaseSimNowAnchor - partial.hoursAgoCompleted * HOUR;
  return {
    id: partial.id,
    student: partial.student,
    tutor: partial.tutor,
    subject: partial.subject,
    type: partial.type ?? "Private",
    groupClassId: partial.groupClassId,
    sessionId: partial.sessionId,
    amountGross: partial.amountGross,
    completedAt,
    autoReleaseAt: completedAt + 24 * HOUR,
    confirmationStatus: partial.confirmationStatus ?? "Pending",
    escrowStatus: partial.escrowStatus ?? "Held",
    attendance: partial.attendance,
    complaintFiled: partial.complaintFiled,
    complaintReason: partial.complaintReason,
    complaintDetails: partial.complaintDetails,
    bookingId: partial.bookingId,
    completedAtLabel: partial.completedAtLabel,
    disputeReason: partial.disputeReason,
    disputeDetails: partial.disputeDetails,
    disputeStatus: partial.disputeStatus,
    disputePriority: partial.disputePriority,
    disputeSubmittedLabel: partial.disputeSubmittedLabel,
    disputeAdditionalNotes: partial.disputeAdditionalNotes,
    tutorResponse: partial.tutorResponse,
    tutorResponseAtLabel: partial.tutorResponseAtLabel,
    resolution: partial.resolution,
    scheduledLabel: partial.scheduledLabel,
    scheduledDurationMinutes: partial.scheduledDurationMinutes,
    tutorJoinedLabel: partial.tutorJoinedLabel,
    studentJoinedLabel: partial.studentJoinedLabel,
    sessionEndedLabel: partial.sessionEndedLabel,
    recordedDurationMinutes: partial.recordedDurationMinutes,
    tutorAbsent: partial.tutorAbsent,
    sessionDurationIssue: partial.sessionDurationIssue,
    releasedAt: partial.escrowStatus === "Released" ? completedAt + 5 * 60 * 1000 : undefined,
  };
}

export const initialLessonConfirmations: LessonConfirmation[] = [
  // Private lessons — student-confirms-or-24h-auto-release model.
  makeConfirmation({ id: "lc-1", student: "Sarah A.", tutor: "Adaeze Okonkwo", subject: "Mathematics", amountGross: 3000, hoursAgoCompleted: 5.6 }),
  makeConfirmation({ id: "lc-2", student: "David O.", tutor: "Adaeze Okonkwo", subject: "Physics", amountGross: 7500, hoursAgoCompleted: 23 }),
  makeConfirmation({ id: "lc-3", student: "Mary U.", tutor: "Adaeze Okonkwo", subject: "Chemistry", amountGross: 4500, hoursAgoCompleted: 26, confirmationStatus: "Confirmed", escrowStatus: "Released" }),
  makeConfirmation({
    id: "lc-4",
    student: "Tunde F.",
    tutor: "Adaeze Okonkwo",
    subject: "Mathematics",
    amountGross: 2250,
    hoursAgoCompleted: 30,
    confirmationStatus: "Disputed",
    escrowStatus: "Frozen",
    disputeReason: "Lesson ended early",
    disputeDetails: "The lesson stopped after about 20 minutes with no explanation from the tutor.",
    disputeStatus: "Awaiting Response",
    disputePriority: "Medium",
    disputeSubmittedLabel: "Aug 27, 2026 · 2:34 PM",
    scheduledLabel: "Aug 27, 2026 · 5:00 PM",
    scheduledDurationMinutes: 45,
  }),
  makeConfirmation({ id: "lc-5", student: "Cynthia Ejie", tutor: "Adaeze Okonkwo", subject: "Mathematics", type: "Private", amountGross: 4000, hoursAgoCompleted: 1.2 }),
  // The dispute reachable end-to-end from the Virtual Classroom: tutor ended
  // the lesson, student reported a problem, tutor has already responded —
  // fully populated so the dispute review page can show every section
  // (Session Record, Attendance, Tutor Response) with real, non-mock data.
  makeConfirmation({
    id: "lc-9",
    student: "Cynthia Ejie",
    tutor: "Tunde Adebayo",
    subject: "Mathematics",
    type: "Private",
    amountGross: 5000,
    bookingId: "BK-10294",
    hoursAgoCompleted: 2,
    confirmationStatus: "Disputed",
    escrowStatus: "Frozen",
    disputeReason: "Tutor joined late",
    disputeDetails: "The tutor joined about 20 minutes late and the lesson ended early. We were supposed to have a full 1 hour session but it lasted less than 40 minutes.",
    disputeAdditionalNotes: "I waited in the classroom on time.",
    disputeStatus: "Under Review",
    disputePriority: "High",
    disputeSubmittedLabel: "Aug 28, 2026 · 5:12 PM",
    completedAtLabel: "Aug 28, 2026 · 5:01 PM",
    tutorResponse: "I had a network issue that caused me to join late. I extended the session after it got stable.",
    tutorResponseAtLabel: "Aug 28, 2026 · 6:04 PM",
    scheduledLabel: "Aug 28, 2026 · 4:00 PM",
    scheduledDurationMinutes: 60,
    tutorJoinedLabel: "4:18 PM",
    studentJoinedLabel: "4:02 PM",
    sessionEndedLabel: "4:48 PM",
    recordedDurationMinutes: 30,
  }),
  // A resolved example (Release outcome).
  makeConfirmation({
    id: "lc-10",
    student: "Blessing K.",
    tutor: "Michael Adewale",
    subject: "Biology",
    amountGross: 3800,
    hoursAgoCompleted: 100,
    confirmationStatus: "Confirmed",
    escrowStatus: "Released",
    disputeReason: "Poor lesson quality",
    disputeDetails: "Felt the tutor rushed through the topic without checking understanding.",
    disputeStatus: "Resolved",
    disputePriority: "Medium",
    disputeSubmittedLabel: "Aug 24, 2026 · 10:00 AM",
    scheduledLabel: "Aug 24, 2026 · 3:00 PM",
    scheduledDurationMinutes: 60,
    resolution: {
      outcome: "Release",
      note: "Lesson was completed sufficiently. Tutor payment released.",
      tutorReceived: escrowNet(3800),
      studentRefund: 0,
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 25, 2026 · 3:10 PM",
    },
  }),
  // A dismissed example (no money movement).
  makeConfirmation({
    id: "lc-11",
    student: "Kunle A.",
    tutor: "Faruk Musa",
    subject: "Physics",
    amountGross: 3500,
    hoursAgoCompleted: 120,
    confirmationStatus: "Disputed",
    escrowStatus: "Frozen",
    disputeReason: "Wrong tutor",
    disputeDetails: "Thought a different tutor was assigned to this booking.",
    disputeStatus: "Dismissed",
    disputePriority: "Low",
    disputeSubmittedLabel: "Aug 22, 2026 · 9:00 AM",
    scheduledLabel: "Aug 22, 2026 · 6:00 PM",
    scheduledDurationMinutes: 60,
    resolution: {
      outcome: "Dismiss",
      note: "Student confirmed the correct tutor after reviewing the booking. No action needed.",
      tutorReceived: 0,
      studentRefund: 0,
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 23, 2026 · 2:10 PM",
    },
  }),

  // Group classes — 10-student "WAEC Revision Bootcamp" session (tutor
  // Adaeze Okonkwo's real MyGroupClass "gc-2"). One session, one
  // sessionId shared by every enrolled student's independent record — this
  // is the exact "one student's complaint must not freeze the other nine"
  // scenario: most students clear automatically after 24h, one is disputed,
  // and the disputed amount is the only one held.
  // No complaint — will auto-release 24h after completedAt.
  makeConfirmation({
    id: "lc-6",
    student: "Cynthia Ejie",
    tutor: "Adaeze Okonkwo",
    subject: "WAEC Revision Bootcamp",
    type: "Group",
    groupClassId: "gc-2",
    sessionId: "gc-2-session-11",
    amountGross: 2000,
    hoursAgoCompleted: 3.4,
    confirmationStatus: "Pending",
    escrowStatus: "Held",
    attendance: makeAttendance({ classDurationMinutes: 90, attendedMinutes: 84 }),
  }),
  // Absent for this session — student absence alone doesn't dispute the
  // tutor's payment (the tutor still taught), so this still clears normally.
  makeConfirmation({
    id: "lc-7",
    student: "Ifeoma N.",
    tutor: "Adaeze Okonkwo",
    subject: "WAEC Revision Bootcamp",
    type: "Group",
    groupClassId: "gc-2",
    sessionId: "gc-2-session-11",
    amountGross: 2000,
    hoursAgoCompleted: 3.4,
    confirmationStatus: "Pending",
    escrowStatus: "Held",
    attendance: makeAttendance({ classDurationMinutes: 90, attendedMinutes: 0 }),
  }),
  // Already resolved — this student filed a complaint about audio quality,
  // Admin reviewed the recording and released the tutor's payment anyway.
  makeConfirmation({
    id: "lc-8",
    student: "Bola A.",
    tutor: "Adaeze Okonkwo",
    subject: "WAEC Revision Bootcamp",
    type: "Group",
    groupClassId: "gc-2",
    sessionId: "gc-2-session-10",
    amountGross: 2000,
    hoursAgoCompleted: 27,
    confirmationStatus: "Confirmed",
    escrowStatus: "Released",
    attendance: makeAttendance({ classDurationMinutes: 90, attendedMinutes: 79 }),
    complaintFiled: true,
    complaintReason: "Poor audio/video quality",
    complaintDetails: "Tutor's mic kept cutting out for the last 15 minutes.",
    disputeStatus: "Resolved",
    disputePriority: "Medium",
    disputeSubmittedLabel: "Aug 25, 2026 · 6:42 PM",
    resolution: {
      outcome: "Release",
      note: "Reviewed the session recording. Audio dropped briefly but the lesson content was fully delivered. Releasing tutor's payment.",
      tutorReceived: escrowNet(2000),
      studentRefund: 0,
      resolvedBy: "Admin",
      resolvedAtLabel: "Aug 26, 2026 · 9:15 AM",
    },
  }),
  // Tutor never joined this session at all — held indefinitely, excluded
  // from the 24h auto-release sweep, awaiting Admin review (see section 17
  // of the group-class spec: a class that never happened must never auto-pay).
  makeConfirmation({
    id: "lc-12",
    student: "Grace Emmanuel",
    tutor: "Faruk Musa",
    subject: "JAMB Physics Intensive",
    type: "Group",
    groupClassId: "gc-3",
    sessionId: "gc-3-session-4",
    amountGross: 1800,
    hoursAgoCompleted: 6,
    confirmationStatus: "Pending",
    escrowStatus: "Held",
    tutorAbsent: true,
    scheduledLabel: "Aug 28, 2026 · 6:00 PM",
    scheduledDurationMinutes: 90,
  }),
  // Tutor joined and the class happened, but ended well short of the
  // scheduled duration — flagged as evidence, not an automatic dispute.
  makeConfirmation({
    id: "lc-13",
    student: "Kelechi Obi",
    tutor: "Michael Adewale",
    subject: "JAMB Physics Intensive",
    type: "Group",
    groupClassId: "gc-3",
    sessionId: "gc-3-session-5",
    amountGross: 1800,
    hoursAgoCompleted: 8,
    confirmationStatus: "Pending",
    escrowStatus: "Held",
    sessionDurationIssue: true,
    scheduledLabel: "Aug 28, 2026 · 4:00 PM",
    scheduledDurationMinutes: 90,
    recordedDurationMinutes: 25,
    attendance: makeAttendance({ classDurationMinutes: 90, attendedMinutes: 25 }),
  }),
];

export function relativeTimeFromNow(atMs: number): string {
  const diff = Date.now() - atMs;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "0h 0m";
  const totalMinutes = Math.floor(msRemaining / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((msRemaining % 60000) / 1000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function reminderStageFor(hoursElapsed: number): { title: string; text: string } | null {
  if (hoursElapsed >= 23) {
    return { title: "Final Reminder", text: "Payment will automatically be released in one hour unless an issue is reported." };
  }
  if (hoursElapsed >= 12) {
    return { title: "Reminder", text: "Your tutor is waiting for lesson confirmation." };
  }
  if (hoursElapsed >= 0) {
    return { title: "Notification", text: "Please confirm today's lesson." };
  }
  return null;
}

export interface AuditLogEntry {
  id: string;
  lessonId: string;
  atMs: number;
  action:
    | "Lesson Marked Completed"
    | "Student Confirmed"
    | "Auto Released"
    | "Dispute Opened"
    | "Refund"
    | "Admin Release"
    | "Admin Refund"
    | "Admin Partial Refund"
    | "Admin Froze Escrow"
    | "Tutor Warned"
    | "Complaint Filed"
    | "Auto-Verified & Released"
    | "Tutor Response Requested"
    | "Tutor Responded"
    | "Dispute Resolved"
    | "Dispute Dismissed"
    | "Group Session Completed"
    | "Marked Tutor Absent";
  actor: string;
  reason?: string;
  time: string;
}

export function escrowNet(gross: number) {
  return splitEarnings(gross).net;
}

// disputeStatus is the authoritative "this is/was a dispute" signal — a
// resolved dispute's confirmationStatus moves on to Confirmed once payment
// is released, so checking confirmationStatus alone would make it vanish
// from history the moment it's resolved. tutorAbsent also counts: it holds
// indefinitely and is never auto-released, so it must surface in the same
// review queue Admin already checks, or nobody would ever see it again.
export function isDispute(l: LessonConfirmation): boolean {
  return Boolean(l.disputeStatus) || l.confirmationStatus === "Disputed" || Boolean(l.complaintFiled) || Boolean(l.tutorAbsent) || Boolean(l.tutorReportedIssue);
}

export interface GroupSessionSummary {
  sessionId: string;
  groupClassId?: string;
  subject: string;
  tutor: string;
  scheduledLabel?: string;
  scheduledDurationMinutes?: number;
  recordedDurationMinutes?: number;
  tutorJoinedLabel?: string;
  tutorAbsent: boolean;
  sessionDurationIssue: boolean;
  completedAt: number;
  totalStudents: number;
  presentCount: number;
  disputedCount: number;
  totalGross: number;
  releasedNet: number;
  heldGross: number;
  records: LessonConfirmation[];
}

// Aggregates every enrolled student's independent LessonConfirmation for one
// specific group-class meeting into a single session-level view — the
// "9/10 attended" / "₦18,000 available, ₦2,000 held" figures Admin and the
// tutor need, computed live from the real per-student records rather than a
// separately-maintained total (the payment system stays the source of truth).
export function groupSessionSummary(lessons: LessonConfirmation[], sessionId: string): GroupSessionSummary | null {
  const records = lessons.filter((l) => l.type === "Group" && l.sessionId === sessionId);
  if (records.length === 0) return null;
  const first = records[0];
  return {
    sessionId,
    groupClassId: first.groupClassId,
    subject: first.subject,
    tutor: first.tutor,
    scheduledLabel: first.scheduledLabel,
    scheduledDurationMinutes: first.scheduledDurationMinutes,
    recordedDurationMinutes: first.recordedDurationMinutes,
    tutorJoinedLabel: first.tutorJoinedLabel,
    tutorAbsent: records.some((r) => r.tutorAbsent),
    sessionDurationIssue: records.some((r) => r.sessionDurationIssue),
    completedAt: first.completedAt,
    totalStudents: records.length,
    presentCount: records.filter((r) => r.attendance?.present).length,
    disputedCount: records.filter(isDispute).length,
    totalGross: records.reduce((sum, r) => sum + r.amountGross, 0),
    releasedNet: records.filter((r) => r.escrowStatus === "Released").reduce((sum, r) => sum + (r.resolution ? r.resolution.tutorReceived : escrowNet(r.amountGross)), 0),
    heldGross: records.filter((r) => r.escrowStatus === "Held" || r.escrowStatus === "Frozen").reduce((sum, r) => sum + r.amountGross, 0),
    records,
  };
}

// Every distinct sessionId across a tutor/class's Group records, newest first.
export function groupSessionSummaries(lessons: LessonConfirmation[], filter?: { tutor?: string; groupClassId?: string }): GroupSessionSummary[] {
  const ids = new Set<string>();
  for (const l of lessons) {
    if (l.type !== "Group" || !l.sessionId) continue;
    if (filter?.tutor && l.tutor !== filter.tutor) continue;
    if (filter?.groupClassId && l.groupClassId !== filter.groupClassId) continue;
    ids.add(l.sessionId);
  }
  return Array.from(ids)
    .map((id) => groupSessionSummary(lessons, id))
    .filter((s): s is GroupSessionSummary => s !== null)
    .sort((a, b) => b.completedAt - a.completedAt);
}
