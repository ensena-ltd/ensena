"use client";

// Real, persisted classroom chat — localStorage-backed, same idiom as
// classroom-whiteboard-store.ts, keyed by classroomId so the SAME lesson's
// conversation is found again after a refresh or reopening the lesson later
// (e.g. from Previous Lessons / an admin dispute review), instead of
// resetting to the decorative chatSeed every time the classroom is opened.
//
// Live delivery while both participants are actually in the room happens
// separately, over classroom-sync.ts's real-time transport
// (sendChatEvent/onChatEvent) — this store is what makes the conversation
// survive a refresh/reconnect and what a later admin review can read back,
// not the live-delivery mechanism itself.
import type { ClassroomChatMessage } from "@/lib/classroom-data";

function keyFor(classroomId: string): string {
  return `ensena_classroom_chat:${classroomId}`;
}

function readMessages(classroomId: string): ClassroomChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(classroomId));
    return raw ? (JSON.parse(raw) as ClassroomChatMessage[]) : [];
  } catch {
    return [];
  }
}

function writeMessages(classroomId: string, messages: ClassroomChatMessage[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyFor(classroomId), JSON.stringify(messages));
}

// Called once, as the chat state's lazy initializer — a classroom with no
// stored history yet falls back to (and persists) the existing decorative
// seed, so a lesson that already "had" demo messages doesn't appear to have
// silently lost them, while every classroom persists for real from here on.
export function getChatMessages(classroomId: string, seed: ClassroomChatMessage[]): ClassroomChatMessage[] {
  const stored = readMessages(classroomId);
  if (stored.length > 0) return stored;
  if (seed.length > 0) writeMessages(classroomId, seed);
  return seed;
}

// Idempotent by message id — a real-time transport (Supabase Realtime, or a
// dev-mode double-effect-mount momentarily leaving two live listeners) can
// legitimately redeliver the same broadcast more than once, the same
// "duplicate delivery must be safe" requirement chargeSubscription's
// deterministic period-ids and cancelBooking's idempotent guard already
// exist for elsewhere in this app. Appending the identical id twice would
// otherwise show a message twice in one participant's chat while the
// sender only ever sees it once.
export function appendChatMessage(classroomId: string, message: ClassroomChatMessage): ClassroomChatMessage[] {
  const current = readMessages(classroomId);
  if (current.some((m) => m.id === message.id)) return current;
  const next = [...current, message];
  writeMessages(classroomId, next);
  return next;
}
