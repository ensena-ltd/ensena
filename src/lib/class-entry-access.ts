import { parsePlatformDateTime } from "@/lib/platform-time";

// One real, timestamp-based "is entry allowed right now" calculation —
// replaces fragile string checks like `date !== "Today"` (which silently
// disables a class forever the moment its date is a real calendar date
// instead of the literal word "Today", exactly the bug that made a genuine
// Discovery Session's "Enter Classroom" button permanently disabled). Every
// class type (Private, Group, Discovery, Counselling) should compute its
// start/end as real epoch-ms and run it through this one function rather
// than each screen inventing its own ad-hoc rule.
export type ClassEntryState = "too-early" | "entry-available" | "live" | "ended";

// How early each role may enter and wait in the classroom before the
// scheduled start. A tutor gets a much wider window (to prepare/set up)
// than a student — both are real, enforced windows now, not "student is
// restricted, tutor is unlimited".
export const STUDENT_ENTRY_WINDOW_MS = 30 * 60 * 1000;
export const TUTOR_ENTRY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getClassEntryState({
  startMs,
  endMs,
  role,
  nowMs = Date.now(),
}: {
  startMs: number;
  endMs: number;
  role: "student" | "tutor";
  nowMs?: number;
}): ClassEntryState {
  if (nowMs >= endMs) return "ended";
  if (nowMs >= startMs) return "live";
  const entryWindowMs = role === "tutor" ? TUTOR_ENTRY_WINDOW_MS : STUDENT_ENTRY_WINDOW_MS;
  return nowMs >= startMs - entryWindowMs ? "entry-available" : "too-early";
}

export function canEnterClassroom(state: ClassEntryState): boolean {
  return state === "entry-available" || state === "live";
}

// Shared date/time parsing for the several legacy seed data shapes still in
// play across this app ("Today"/"Tomorrow"/a real date string, paired with a
// "4:00 PM"-style time). Delegates to the one platform-wide, Africa/Lagos-
// aware parser (platform-time.ts) — this used to build
// `new Date(year, month, day, hour, minute)` directly, which is silently
// interpreted in whatever timezone the code happens to run in, never
// Enseña's fixed Africa/Lagos platform clock.
export function parseLegacyDateTime(dateStr: string, timeStr: string): number {
  return parsePlatformDateTime(dateStr, timeStr);
}

// A "60 mins"/"90 min" display-string duration → minutes. Two other files
// (classroom-data.ts, tutor-availability.ts) already have their own
// unexported copy of this exact regex for their own unrelated purposes —
// left alone rather than risk touching code that isn't part of this pass —
// but any NEW caller building a real start/end pair from a duration label
// (private lessons, group classes) should use this one shared version.
export function parseDurationLabelMinutes(text: string): number {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 60;
}
