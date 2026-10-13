"use client";

// A tutor can rename what the Classroom header shows for this lesson (the
// pencil next to the lesson line) — same tiny localStorage-keyed-by-
// classroomId idiom as every other piece of classroom state in this app,
// so the custom label is there again for both participants after a
// refresh/reconnect. Real, persisted state — not a decorative input that
// resets itself.
function keyFor(classroomId: string): string {
  return `ensena_classroom_label:${classroomId}`;
}

export function getSessionLabelOverride(classroomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(keyFor(classroomId));
  } catch {
    return null;
  }
}

export function setSessionLabelOverride(classroomId: string, label: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(classroomId), label);
}
