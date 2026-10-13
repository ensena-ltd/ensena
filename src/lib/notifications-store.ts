// Real, working notifications — localStorage-backed, same idiom as
// escrow-store.ts/admin-audit-log.ts, so a notification pushed from one page
// (e.g. the Virtual Classroom ending a group session) is immediately visible
// wherever a student's notification bell/list is mounted, not just a
// decorative seed list that nothing ever appends to.
import { getGroupClassEnrollments } from "@/lib/group-class-enrollment-store";
import { getPrivateLessons } from "@/lib/private-lessons-store";
import { studentNotifications, type StudentNotification } from "@/lib/student-dashboard-data";

const STUDENT_KEY = "ensena_student_notifications";
export const STUDENT_NOTIFICATIONS_EVENT = "ensena:student-notifications-changed";

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

const readStudentRaw = makeCachedReader<StudentNotification[]>(STUDENT_KEY, studentNotifications);

function writeStudent(value: StudentNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(STUDENT_NOTIFICATIONS_EVENT));
}

// Self-heals a real bug that shipped earlier: a tutor-initiated reschedule/
// cancel used to write the TUTOR's own dashboard URL onto the notification
// meant for the STUDENT (fixed at the source in booking-lifecycle-store.ts),
// but any notification already persisted to a browser's localStorage before
// that fix keeps the bad URL forever otherwise — nothing re-derives it on
// its own. Rewriting it here, once, at the single real read path every
// student notification list/banner goes through, means an affected browser
// self-corrects the next time it loads rather than requiring every visitor
// to clear their storage by hand.
function studentBookingUrl(bookingId: string): string {
  if (getPrivateLessons().some((l) => l.id === bookingId)) return `/student-dashboard/lessons/class/${bookingId}`;
  if (getGroupClassEnrollments().some((e) => e.id === bookingId)) return `/student-dashboard/group-classes/${bookingId}`;
  return "/student-dashboard/lessons";
}

function sanitizeActionUrl(n: StudentNotification): StudentNotification {
  if (n.actionUrl?.startsWith("/tutor-dashboard/") && n.bookingId) {
    return { ...n, actionUrl: studentBookingUrl(n.bookingId) };
  }
  return n;
}

// Cached on the raw array's own identity (which only changes when the
// underlying localStorage value actually changes) — required so this keeps
// returning the exact same array/notification references across repeated
// calls with nothing new written, the same stability useSyncExternalStore
// needs from every real store's snapshot getter in this app.
let sanitizedCache: { source: StudentNotification[]; result: StudentNotification[] } | null = null;

export function getStudentNotifications(): StudentNotification[] {
  const raw = readStudentRaw();
  if (sanitizedCache && sanitizedCache.source === raw) return sanitizedCache.result;
  const result = raw.map(sanitizeActionUrl);
  sanitizedCache = { source: raw, result };
  return result;
}

export function pushStudentNotification(input: {
  category: StudentNotification["category"];
  text: string;
  bookingId?: string;
  actionUrl?: string;
}): StudentNotification {
  const notification: StudentNotification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category,
    text: input.text,
    time: "Just now",
    unread: true,
    bookingId: input.bookingId,
    actionUrl: input.actionUrl,
  };
  writeStudent([notification, ...readStudentRaw()]);
  return notification;
}

export function markStudentNotificationRead(id: string): void {
  writeStudent(readStudentRaw().map((n) => (n.id === id ? { ...n, unread: false } : n)));
}

// Dismissing hides a notification from the dashboard's "Important updates"
// banner only — it never touches read state or the notification center list,
// and it must never be confused with cancelling the underlying booking (the
// two are deliberately separate actions with separate functions).
export function dismissStudentNotification(id: string): void {
  writeStudent(readStudentRaw().map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
}

export function markAllStudentNotificationsRead(): void {
  writeStudent(readStudentRaw().map((n) => ({ ...n, unread: false })));
}

export function subscribeStudentNotifications(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(STUDENT_NOTIFICATIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(STUDENT_NOTIFICATIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
