// The single place that assembles "everything Enseña actually knows about
// this specific lesson" for the admin evidence view — attendance, a derived
// timeline, whiteboard activity, chat, and recording status. Homework is
// deliberately still reported as unavailable rather than fuzzy-matched:
// homework (tutor-dashboard-data.ts/student-dashboard-data.ts) is only ever
// linked by student/subject name strings, never a lesson id — guessing a
// match would risk showing an admin the WRONG session's homework as if it
// were this one's, which is worse than honestly saying it isn't linked.
import { getAttendance, type AttendanceRecord } from "@/lib/class-attendance-store";
import { getWhiteboardLastUpdatedISO, getWhiteboardUsedBoardCount } from "@/lib/classroom-whiteboard-store";
import { releaseSimNowAnchor, releaseSimNowAnchorRealTime } from "@/lib/escrow-release";
import { getRecordingForClassroom, type LessonRecording } from "@/lib/lesson-recording-store";
import type { BookingRow } from "@/lib/admin-bookings-data";

// A Group LessonConfirmation's completedAt is stamped with escrow-store.ts's
// simulated clock (getSimulatedNow()), while real attendance join/leave
// timestamps (class-attendance-store.ts) are stamped with the real
// Date.now() at the moment someone's browser actually opened the classroom.
// Comparing them directly would near-never match, since the simulated clock
// is deliberately offset from real time. This converts a stored simulated
// timestamp back to the real-time instant it represented AT THE MOMENT IT
// WAS WRITTEN — exact within the same browser session (the common case:
// reviewing evidence for a class that was just ended), but the simulated
// anchor itself re-seeds to a new real instant on every fresh page load
// (see releaseSimNowAnchorRealTime's own definition), so a review done in a
// distinctly later session can drift by however long passed between the two
// — the same accepted imprecision this app's simulated-clock convention
// already carries everywhere else it's used for demo purposes.
function realMsFromSimulated(simulatedMs: number): number {
  return simulatedMs - releaseSimNowAnchor + releaseSimNowAnchorRealTime;
}

// Private lessons map 1:1 onto a real classroomId (`private:${lessonId}`,
// the same scheme class-detail-client.tsx already uses). Group classes are
// tracked per WHOLE recurring class in the current classroom architecture
// (`group:${groupClassId}`), not per individual session occurrence — every
// session of the same recurring class shares one classroom's attendance
// history. A row built from a real LessonConfirmation (see
// lesson-confirmation-to-booking-row.ts) does carry the real groupClassId,
// so the classroom CAN be resolved for Group rows now; isolating just THIS
// session's slice of that shared history is what sessionWindowFor below is
// for. A row with no groupClassId (e.g. a legacy seed row predating this)
// still honestly reports no link rather than a guessed one.
export function classroomIdForLesson(lesson: BookingRow): string | null {
  if (lesson.type === "Private Lesson") return `private:${lesson.id}`;
  if (lesson.groupClassId) return `group:${lesson.groupClassId}`;
  return null;
}

// A Group classroom's attendance history mixes together every session of
// the whole recurring class (see classroomIdForLesson above) — there's no
// per-session classroomId to naturally separate them. What DOES uniquely
// identify this one session is its own real completedAtMs (when the tutor
// actually ended it) and its real scheduled duration, so a real join/leave
// timestamp is "this session's" if it falls within a generous window
// around that scheduled slot — wide enough to cover an early join or a
// session that ran over, never so wide it could plausibly catch a
// different session of a class meeting more than once a week.
const SESSION_WINDOW_BUFFER_MS = 30 * 60_000;

function sessionWindowFor(lesson: BookingRow): { startMs: number; endMs: number } | null {
  if (lesson.type !== "Group Class" || !lesson.completedAtMs) return null;
  const durationMs = (lesson.scheduledDurationMinutes ?? 60) * 60_000;
  const endMs = realMsFromSimulated(lesson.completedAtMs);
  return { startMs: endMs - durationMs - SESSION_WINDOW_BUFFER_MS, endMs: endMs + SESSION_WINDOW_BUFFER_MS };
}

function attendanceForLesson(lesson: BookingRow, classroomId: string): AttendanceRecord[] {
  const all = getAttendance(classroomId);
  const window = sessionWindowFor(lesson);
  if (!window) return all;
  return all.filter((r) => {
    const joinedMs = new Date(r.joinedAtISO).getTime();
    return joinedMs >= window.startMs && joinedMs <= window.endMs;
  });
}

export interface TimelineEvent {
  atISO: string;
  label: string;
}

function participantLabel(r: AttendanceRecord): string {
  return r.participantRole === "tutor" ? `Tutor (${r.participantName})` : `Student (${r.participantName})`;
}

export function buildTimeline(attendance: AttendanceRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const r of attendance) {
    events.push({ atISO: r.joinedAtISO, label: `${participantLabel(r)} joined` });
    if (r.leftAtISO) events.push({ atISO: r.leftAtISO, label: `${participantLabel(r)} left` });
  }
  return events.sort((a, b) => a.atISO.localeCompare(b.atISO));
}

// Real participation time — only counts a join that has a matching leave
// (an open/unclosed record contributes 0 rather than an inflated guess).
export function participationMinutes(records: AttendanceRecord[], role: "tutor" | "student"): number {
  const totalMs = records
    .filter((r) => r.participantRole === role && r.leftAtISO)
    .reduce((sum, r) => sum + (new Date(r.leftAtISO as string).getTime() - new Date(r.joinedAtISO).getTime()), 0);
  return Math.round(totalMs / 60000);
}

export interface LessonEvidence {
  classroomId: string | null;
  attendance: AttendanceRecord[];
  timeline: TimelineEvent[];
  tutorMinutes: number;
  studentMinutes: number;
  whiteboardBoardCount: number;
  whiteboardLastUpdatedISO: string | null;
  recording: LessonRecording | null;
  // True for a Group Class row: attendance/timeline/minutes above are
  // real-timestamp-filtered to just this session (see sessionWindowFor),
  // but whiteboard/recording have no per-session equivalent to filter by —
  // they reflect the WHOLE recurring class's classroom, not only this
  // meeting. Always false for Private (already 1:1 with its classroom).
  whiteboardAndRecordingAreWholeClass: boolean;
}

export function getLessonEvidence(lesson: BookingRow): LessonEvidence {
  const classroomId = classroomIdForLesson(lesson);
  if (!classroomId) {
    return {
      classroomId: null,
      attendance: [],
      timeline: [],
      tutorMinutes: 0,
      studentMinutes: 0,
      whiteboardBoardCount: 0,
      whiteboardLastUpdatedISO: null,
      recording: null,
      whiteboardAndRecordingAreWholeClass: false,
    };
  }
  const attendance = attendanceForLesson(lesson, classroomId);
  return {
    classroomId,
    attendance,
    timeline: buildTimeline(attendance),
    tutorMinutes: participationMinutes(attendance, "tutor"),
    studentMinutes: participationMinutes(attendance, "student"),
    whiteboardBoardCount: getWhiteboardUsedBoardCount(classroomId),
    whiteboardLastUpdatedISO: getWhiteboardLastUpdatedISO(classroomId),
    recording: getRecordingForClassroom(classroomId),
    whiteboardAndRecordingAreWholeClass: lesson.type === "Group Class",
  };
}
