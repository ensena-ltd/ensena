// The one real "what state is this booking actually in right now" answer —
// Upcoming/Active/Completed/Cancelled is a DATA-STATE problem, not a display
// label, so it must always be derived from the booking's real start/end time
// plus its real cancellation state, never trusted as a stored string a
// component happens to have been given. A booking's raw `status` field
// (e.g. "Upcoming") only ever reflects what was true the moment it was
// written — nothing rewrites it as real time passes, so time-derived
// classification is the only thing that stays correct forever, matching
// this app's own established pattern (getClassEntryState/hasEnded in
// class-detail-client.tsx) generalized into one shared, reusable function.
export type ClassLifecycleStatus = "Cancelled" | "Completed" | "NotAttended" | "Live" | "Upcoming";

// Cancelled always wins, regardless of date — a cancelled booking scheduled
// for next month is still Cancelled, not Upcoming. After that, classify
// purely from real time: ended, in progress, or not yet started. `nowMs`
// must always be Africa/Lagos-equivalent real time (see platform-time.ts) —
// never the browser's/server's own local `Date.now()` interpretation of
// "now" relative to a differently-parsed start/end.
export function classifyClassStatus({
  isCancelled,
  startMs,
  endMs,
  nowMs,
  attended,
}: {
  isCancelled: boolean;
  startMs: number;
  endMs: number;
  nowMs: number;
  // Real attendance evidence for a session that has already ended — omit
  // entirely when no real attendance signal exists for this booking type
  // (never guessed; a missing value stays "Completed", the historical
  // default, rather than being assumed "NotAttended"). `false` means a real
  // record confirms the student did not attend — never inferred merely from
  // time having passed.
  attended?: boolean;
}): ClassLifecycleStatus {
  if (isCancelled) return "Cancelled";
  if (nowMs >= endMs) return attended === false ? "NotAttended" : "Completed";
  if (nowMs >= startMs) return "Live";
  return "Upcoming";
}
