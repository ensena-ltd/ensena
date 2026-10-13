// No real backend exists in this app (see demo-auth.ts), so escrow/lesson
// confirmation state — which genuinely needs to be visible to the tutor,
// the student AND admin at once (tutor ends a lesson, student confirms it,
// admin resolves a dispute) — is kept in localStorage rather than per-page
// React state. Same idiom as discovery-store.ts: a CustomEvent fires on every
// mutation so every mounted consumer (via useSyncExternalStore) re-renders
// with the shared truth, and a cached-parse reader keeps getSnapshot() cheap
// and referentially stable in between real changes.
import {
  formatDisputeDisplayId,
  initialLessonConfirmations,
  priorityForReason,
  releaseSimNowAnchor,
  releaseSimNowAnchorRealTime,
  type AuditLogEntry,
  type DisputeOutcome,
  type LessonConfirmation,
} from "@/lib/escrow-release";
import { splitEarnings } from "@/lib/commission";
import { formatNaira } from "@/lib/format";
import { pushStudentNotification } from "@/lib/notifications-store";
import { issueOrGetReferenceCode } from "@/lib/reference-code-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";

const LESSONS_KEY = "ensena_lesson_confirmations";
const AUDIT_KEY = "ensena_escrow_audit_log";

export const ESCROW_EVENT = "ensena:escrow-changed";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(ESCROW_EVENT));
}

// getSnapshot() for useSyncExternalStore must return the *same* reference
// until something actually changes, or React's infinite-loop guard trips —
// so every reader caches its last-parsed array and only re-parses when the
// underlying localStorage string changes.
function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readLessonsRaw = makeCachedReader<LessonConfirmation[]>(LESSONS_KEY, initialLessonConfirmations);
const readAuditRaw = makeCachedReader<AuditLogEntry[]>(AUDIT_KEY, []);

export function getSimulatedNow(): number {
  return releaseSimNowAnchor + (Date.now() - releaseSimNowAnchorRealTime);
}

function logEntry(lessonId: string, action: AuditLogEntry["action"], actor: string, reason?: string): AuditLogEntry {
  const now = Date.now();
  return {
    id: `audit-${now}-${Math.random().toString(36).slice(2, 7)}`,
    lessonId,
    atMs: now,
    action,
    actor,
    reason,
    time: new Date(now).toLocaleString(),
  };
}

function appendAudit(entry: AuditLogEntry): void {
  writeJson(AUDIT_KEY, [entry, ...readAuditRaw()]);
}

// getSnapshot() for useSyncExternalStore must stay pure (no writes) — the
// actual auto-release mutation happens in runAutoReleaseCheck() below,
// called from a ticking effect, never from a render-time read.
export function getLessonConfirmations(): LessonConfirmation[] {
  return readLessonsRaw();
}

// The "background job" that would normally run server-side: any lesson (or,
// for a Group class, any individual student's session allocation) still
// Pending/Held past its autoReleaseAt gets auto-confirmed — same 24h rule for
// both Private and Group, per "if the student does nothing for 24 hours,
// their allocated session earnings become Available." A student's own
// dispute/complaint moves their record to Disputed/Frozen first, which
// excludes it from this sweep without touching any other student's record.
// tutorAbsent records are held indefinitely pending Admin review — a class
// that never happened must never auto-pay out. There is no server to run a
// real cron on, so a ticking client effect calls this every second instead —
// it self-heals no matter which page happens to look first, since it
// reads/writes the same shared store every consumer reads.
export function runAutoReleaseCheck(): void {
  const lessons = readLessonsRaw();
  const tick = getSimulatedNow();
  let changed = false;
  const next = lessons.map((l) => {
    if (!l.tutorAbsent && l.confirmationStatus === "Pending" && l.escrowStatus === "Held" && tick >= l.autoReleaseAt) {
      changed = true;
      appendAudit(logEntry(l.id, "Auto Released", "System"));
      return { ...l, confirmationStatus: "Confirmed" as const, escrowStatus: "Released" as const, releasedAt: tick };
    }
    return l;
  });
  if (changed) writeJson(LESSONS_KEY, next);
}

export function getAuditLog(): AuditLogEntry[] {
  return readAuditRaw();
}

function updateLesson(id: string, patch: Partial<LessonConfirmation>): void {
  const lessons = getLessonConfirmations();
  writeJson(LESSONS_KEY, lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)));
}

export function confirmLesson(id: string, actor: string): void {
  updateLesson(id, { confirmationStatus: "Confirmed", escrowStatus: "Released", releasedAt: getSimulatedNow() });
  appendAudit(logEntry(id, "Student Confirmed", actor));
}

export function openDispute(id: string, actor: string, reason: string, details: string): void {
  updateLesson(id, {
    confirmationStatus: "Disputed",
    escrowStatus: "Frozen",
    disputeReason: reason,
    disputeDetails: details,
    disputeStatus: "New",
    disputePriority: priorityForReason(reason),
    disputeSubmittedLabel: new Date(getSimulatedNow()).toLocaleString(),
    disputeReferenceCode: issueOrGetReferenceCode("dispute", id),
  });
  appendAudit(logEntry(id, "Dispute Opened", actor, reason));
}

// Admin asks the tutor to explain their side — moves the case to "Awaiting
// Response" and (in a real system) would notify the tutor via Ensena's
// existing notification system.
export function requestTutorResponse(id: string, actor: string): void {
  updateLesson(id, { disputeStatus: "Awaiting Response" });
  appendAudit(logEntry(id, "Tutor Response Requested", actor));
}

export function submitTutorResponse(id: string, actor: string, text: string): void {
  updateLesson(id, {
    tutorResponse: text,
    tutorResponseAtLabel: new Date(getSimulatedNow()).toLocaleString(),
    disputeStatus: "Under Review",
  });
  appendAudit(logEntry(id, "Tutor Responded", actor));
}

// The single place a dispute's money outcome is decided. Admin only ever
// chooses an outcome (and, for Partial, how much goes to the student) — the
// tutor amount is always derived from gross minus commission minus the
// student refund, never a field Admin can edit directly, so the platform's
// commission can't be silently overridden by a dispute resolution.
export function resolveDispute(id: string, actor: string, outcome: DisputeOutcome, note: string, studentRefundInput?: number): void {
  const lessons = getLessonConfirmations();
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) return;
  const split = splitEarnings(lesson.amountGross);

  let tutorReceived = 0;
  let studentRefund = 0;
  let confirmationStatus: LessonConfirmation["confirmationStatus"] = lesson.confirmationStatus;
  let escrowStatus: LessonConfirmation["escrowStatus"] = lesson.escrowStatus;

  if (outcome === "Release") {
    tutorReceived = split.net;
    confirmationStatus = "Confirmed";
    escrowStatus = "Released";
  } else if (outcome === "Refund") {
    studentRefund = lesson.amountGross;
    escrowStatus = "Released"; // funds moved (back to the student), no longer sitting in escrow
  } else if (outcome === "Partial") {
    const maxRefund = Math.max(0, lesson.amountGross - split.commission);
    studentRefund = Math.min(Math.max(0, studentRefundInput ?? 0), maxRefund);
    tutorReceived = maxRefund - studentRefund;
    escrowStatus = "Released";
  }
  // "Dismiss" moves neither — funds stay exactly as they were.

  updateLesson(id, {
    confirmationStatus,
    escrowStatus,
    releasedAt: outcome === "Release" || outcome === "Partial" ? getSimulatedNow() : lesson.releasedAt,
    disputeStatus: outcome === "Dismiss" ? "Dismissed" : "Resolved",
    resolution: {
      outcome,
      note,
      tutorReceived,
      studentRefund,
      resolvedBy: actor,
      resolvedAtLabel: new Date(getSimulatedNow()).toLocaleString(),
    },
  });
  appendAudit(logEntry(id, outcome === "Dismiss" ? "Dispute Dismissed" : "Dispute Resolved", actor, note));

  if (lesson.student === dashboardStudent.name) {
    const disputeCode = formatDisputeDisplayId(lesson.id, lesson.disputeReferenceCode);
    pushStudentNotification({
      category: "Payment",
      text:
        outcome === "Refund" || outcome === "Partial"
          ? `Your dispute ${disputeCode} has been resolved. A refund of ${formatNaira(studentRefund)} has been issued.`
          : `Your dispute ${disputeCode} has been reviewed and resolved. No refund was issued for this session.`,
    });
  }
}

export function adminRelease(id: string, actor: string): void {
  updateLesson(id, { confirmationStatus: "Confirmed", escrowStatus: "Released", releasedAt: getSimulatedNow() });
  appendAudit(logEntry(id, "Admin Release", actor));
}

export function adminFreeze(id: string, actor: string): void {
  updateLesson(id, { escrowStatus: "Frozen" });
  appendAudit(logEntry(id, "Admin Froze Escrow", actor));
}

export function adminRefund(id: string, actor: string): void {
  updateLesson(id, { confirmationStatus: "Disputed", escrowStatus: "Frozen" });
  appendAudit(logEntry(id, "Admin Refund", actor));
}

export function adminPartialRefund(id: string, actor: string, note?: string): void {
  updateLesson(id, { escrowStatus: "Frozen" });
  appendAudit(logEntry(id, "Admin Partial Refund", actor, note));
}

export function warnTutor(id: string, actor: string, note?: string): void {
  appendAudit(logEntry(id, "Tutor Warned", actor, note));
}

export function simulateElapsed(id: string): void {
  updateLesson(id, { autoReleaseAt: getSimulatedNow() - 1000 });
}

// A student reporting a problem on their Group class session — this holds
// that ONE student's allocated amount only; every other student's session
// allocation for the same group session is a separate LessonConfirmation and
// is unaffected, so one complaint never blocks the rest of the class's
// undisputed earnings.
export function fileComplaint(id: string, actor: string, reason: string, details: string): void {
  const disputeReferenceCode = issueOrGetReferenceCode("dispute", id);
  updateLesson(id, {
    confirmationStatus: "Disputed",
    escrowStatus: "Frozen",
    complaintFiled: true,
    complaintReason: reason,
    complaintDetails: details,
    disputeStatus: "New",
    disputePriority: priorityForReason(reason),
    disputeSubmittedLabel: new Date(getSimulatedNow()).toLocaleString(),
    disputeReferenceCode,
  });
  appendAudit(logEntry(id, "Complaint Filed", actor, reason));
  if (actor === dashboardStudent.name) {
    pushStudentNotification({ category: "Payment", text: `Your report (${disputeReferenceCode}) has been submitted and is being reviewed.` });
  }
}

// Called when a tutor ends a Group class in the Virtual Classroom. Creates
// one independent LessonConfirmation per enrolled student (present or
// absent) for this specific session — never one flat record for the whole
// class — so a later complaint from one student only ever freezes their own
// allocation. Re-ending the same session (e.g. after rejoining) updates the
// same set of records rather than duplicating them.
export function startGroupSessionConfirmations(input: {
  groupClassId: string;
  sessionId: string;
  subject: string;
  tutor: string;
  scheduledLabel: string;
  scheduledDurationMinutes: number;
  recordedDurationMinutes: number;
  tutorJoinedLabel?: string;
  tutorAbsent: boolean;
  tutorReportedIssue?: string;
  amountGrossPerStudent: number;
  students: { id: string; name: string; attendedMinutes: number }[];
}): void {
  const lessons = getLessonConfirmations();
  const completedAt = getSimulatedNow();
  const sessionDurationIssue = !input.tutorAbsent && input.recordedDurationMinutes < input.scheduledDurationMinutes * 0.6;
  const heldForReview = input.tutorAbsent || Boolean(input.tutorReportedIssue);
  // Issued once per real sessionId, the moment this session is actually
  // created — a genuine crypto-random code, persisted forever, the same for
  // every student enrolled in this one session (re-ending the same session
  // returns the code already issued the first time, never a new one).
  const sessionReferenceCode = issueOrGetReferenceCode("session", input.sessionId);

  const records: LessonConfirmation[] = input.students.map((s) => {
    const recordId = `lc-grp-${input.sessionId}-${s.id}`;
    const attendance = {
      classDurationMinutes: input.scheduledDurationMinutes,
      attendedMinutes: s.attendedMinutes,
      attendancePct: Math.round((s.attendedMinutes / input.scheduledDurationMinutes) * 100),
      tutorStartedOnTime: true,
      tutorStayedConnected: !sessionDurationIssue,
      recordingSaved: true,
      whiteboardUsed: true,
      present: s.attendedMinutes / input.scheduledDurationMinutes >= 0.75,
      healthScore: 0,
    };
    attendance.healthScore = Math.round(
      ([attendance.tutorStartedOnTime, attendance.tutorStayedConnected, attendance.recordingSaved, attendance.whiteboardUsed, attendance.present].filter(Boolean).length / 5) * 60 +
        Math.min(attendance.attendancePct, 100) * 0.4
    );
    return {
      id: recordId,
      student: s.name,
      tutor: input.tutor,
      subject: input.subject,
      type: "Group",
      groupClassId: input.groupClassId,
      sessionId: input.sessionId,
      sessionReferenceCode,
      referenceCode: issueOrGetReferenceCode("group", recordId),
      amountGross: input.amountGrossPerStudent,
      completedAt,
      autoReleaseAt: completedAt + 24 * 60 * 60 * 1000,
      confirmationStatus: heldForReview ? "Disputed" : "Pending",
      escrowStatus: heldForReview ? "Frozen" : "Held",
      attendance,
      tutorAbsent: input.tutorAbsent,
      sessionDurationIssue,
      tutorReportedIssue: input.tutorReportedIssue,
      disputeStatus: input.tutorReportedIssue ? "New" : undefined,
      disputePriority: input.tutorReportedIssue ? priorityForReason(input.tutorReportedIssue) : undefined,
      disputeSubmittedLabel: input.tutorReportedIssue ? new Date(completedAt).toLocaleString() : undefined,
      disputeReferenceCode: heldForReview ? issueOrGetReferenceCode("dispute", recordId) : undefined,
      scheduledLabel: input.scheduledLabel,
      scheduledDurationMinutes: input.scheduledDurationMinutes,
      recordedDurationMinutes: input.recordedDurationMinutes,
      tutorJoinedLabel: input.tutorJoinedLabel,
      completedAtLabel: new Date(completedAt).toLocaleString(),
    };
  });

  const byId = new Map(records.map((r) => [r.id, r]));
  const next = lessons.map((l) => byId.get(l.id) ?? l);
  const newOnes = records.filter((r) => !lessons.some((l) => l.id === r.id));
  writeJson(LESSONS_KEY, [...newOnes, ...next]);
  appendAudit(
    logEntry(
      input.sessionId,
      "Group Session Completed",
      input.tutor,
      input.tutorReportedIssue ? `${input.subject} · tutor reported: ${input.tutorReportedIssue}` : `${input.subject} · ${records.length} students`
    )
  );

  // This demo has exactly one real signed-in student persona — only notify
  // them (not every fictional roster name) when they're actually enrolled.
  const myRecord = records.find((r) => r.student === dashboardStudent.name);
  if (myRecord) {
    pushStudentNotification({
      category: "Booking",
      text: heldForReview
        ? `Your ${input.subject} group class session (${myRecord.referenceCode}) had an issue and is being reviewed by Ensena. Your payment remains protected.`
        : `Your ${input.subject} group class (${myRecord.referenceCode}) has ended. You can report a problem within 24 hours.`,
    });
  }
}

// Admin-only: the system has no real presence-tracking backend, so "the
// tutor never joined" is confirmed by Admin after review rather than
// detected automatically — this freezes every student's allocation for the
// session and excludes it from the 24h auto-release sweep.
export function markSessionTutorAbsent(sessionId: string, actor: string): void {
  const lessons = getLessonConfirmations();
  const updated = lessons.map((l) =>
    l.sessionId === sessionId && l.type === "Group"
      ? { ...l, tutorAbsent: true, escrowStatus: "Frozen" as const, disputeReferenceCode: l.disputeReferenceCode ?? issueOrGetReferenceCode("dispute", l.id) }
      : l
  );
  writeJson(LESSONS_KEY, updated);
  appendAudit(logEntry(sessionId, "Marked Tutor Absent", actor));

  // Only the app's one real signed-in student persona has anywhere to
  // actually see this — same guard adminResolveDispute already uses above —
  // but every affected student's allocation is genuinely frozen, so this is
  // the one place that was previously silent about it.
  const myAffectedRecord = updated.find((l) => l.sessionId === sessionId && l.type === "Group" && l.student === dashboardStudent.name);
  if (myAffectedRecord) {
    pushStudentNotification({
      category: "Payment",
      text: `Your teacher did not join your ${myAffectedRecord.subject} class. We've frozen this session's payment while we look into it.`,
    });
  }
}

// Called when a tutor ends a Private lesson in the Virtual Classroom. Creates
// a fresh "Awaiting Student Confirmation" record the first time a given
// lesson is ended, keyed off the classroom session's own id — re-ending the
// same lesson (e.g. after rejoining) updates that same record rather than
// duplicating it. completedAt is the real moment this is called (not the
// scheduled end time), per the rule that the 24h window starts when the
// lesson is actually marked complete.
export function startLessonConfirmation(input: {
  id: string;
  student: string;
  tutor: string;
  subject: string;
  amountGross: number;
  scheduledLabel: string;
}): void {
  const lessons = getLessonConfirmations();
  // completedAt must live on the same simulated clock as autoReleaseAt/nowMs
  // everywhere else in this store (real Date.now() would be a different
  // epoch entirely from the demo's fixed anchor and produce a nonsensical
  // countdown).
  const completedAt = getSimulatedNow();
  const existing = lessons.find((l) => l.id === input.id);
  const record: LessonConfirmation = {
    id: input.id,
    student: input.student,
    tutor: input.tutor,
    subject: input.subject,
    type: "Private",
    referenceCode: issueOrGetReferenceCode("private", input.id),
    amountGross: input.amountGross,
    completedAt,
    autoReleaseAt: completedAt + 24 * 60 * 60 * 1000,
    confirmationStatus: "Pending",
    escrowStatus: "Held",
    scheduledLabel: input.scheduledLabel,
    completedAtLabel: new Date(completedAt).toLocaleString(),
  };
  writeJson(LESSONS_KEY, existing ? lessons.map((l) => (l.id === input.id ? record : l)) : [record, ...lessons]);
  appendAudit(logEntry(input.id, "Lesson Marked Completed", input.tutor));
}

export function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ESCROW_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ESCROW_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
