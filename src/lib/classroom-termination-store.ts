"use client";

// A session ended by terminateForViolation (see classroom-shell.tsx) must stay
// ended — refreshing the tab, or the other participant's tab that never saw
// the live broadcast event, must not be able to rejoin the live classroom.
// Same tiny localStorage-keyed-by-classroomId idiom as
// classroom-session-label-store.ts, but written to from BOTH the side that
// detected the violation and the side that merely received the real-time
// termination event, so either participant's next mount (including a plain
// refresh) sees it regardless of which tab actually caught the violation.
function keyFor(classroomId: string): string {
  return `ensena_classroom_terminated:${classroomId}`;
}

export interface ClassroomTermination {
  message: string;
  atISO: string;
}

export function getClassroomTermination(classroomId: string): ClassroomTermination | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(classroomId));
    return raw ? (JSON.parse(raw) as ClassroomTermination) : null;
  } catch {
    return null;
  }
}

export function setClassroomTermination(classroomId: string, message: string): void {
  if (typeof window === "undefined") return;
  // Idempotent — the detecting side and the side merely receiving the
  // broadcast event both call this; the first write wins.
  if (getClassroomTermination(classroomId)) return;
  const record: ClassroomTermination = { message, atISO: new Date().toISOString() };
  window.localStorage.setItem(keyFor(classroomId), JSON.stringify(record));
}
