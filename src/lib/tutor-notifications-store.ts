// Real, working tutor-facing notifications — an exact mirror of
// notifications-store.ts's (student-facing) idiom, localStorage-backed with
// its own key. No tutor-facing notification channel existed before this;
// the tutor top bar's bell previously only ever showed lesson-confirmation/
// dispute events (see tutor-top-bar.tsx), never a new message or an offer
// being accepted/declined/countered by a student.
export interface TutorNotification {
  id: string;
  category: "Message" | "Booking" | "Payment" | "Review" | "Announcement";
  text: string;
  time: string;
  unread: boolean;
  bookingId?: string;
  actionUrl?: string;
  dismissed?: boolean;
}

const TUTOR_KEY = "ensena_tutor_notifications";
export const TUTOR_NOTIFICATIONS_EVENT = "ensena:tutor-notifications-changed";

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

const readTutorRaw = makeCachedReader<TutorNotification[]>(TUTOR_KEY, []);

function writeTutor(value: TutorNotification[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TUTOR_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(TUTOR_NOTIFICATIONS_EVENT));
}

export function getTutorNotifications(): TutorNotification[] {
  return readTutorRaw();
}

export function pushTutorNotification(input: {
  category: TutorNotification["category"];
  text: string;
  bookingId?: string;
  actionUrl?: string;
}): TutorNotification {
  const notification: TutorNotification = {
    id: `tn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category,
    text: input.text,
    time: "Just now",
    unread: true,
    bookingId: input.bookingId,
    actionUrl: input.actionUrl,
  };
  writeTutor([notification, ...readTutorRaw()]);
  return notification;
}

export function markTutorNotificationRead(id: string): void {
  writeTutor(readTutorRaw().map((n) => (n.id === id ? { ...n, unread: false } : n)));
}

export function dismissTutorNotification(id: string): void {
  writeTutor(readTutorRaw().map((n) => (n.id === id ? { ...n, dismissed: true } : n)));
}

export function markAllTutorNotificationsRead(): void {
  writeTutor(readTutorRaw().map((n) => ({ ...n, unread: false })));
}

export function subscribeTutorNotifications(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TUTOR_NOTIFICATIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(TUTOR_NOTIFICATIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
