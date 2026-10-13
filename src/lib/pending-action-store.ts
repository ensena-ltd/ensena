// Preserves the in-progress data from a booking/action a guest was in the
// middle of when they hit an auth wall, so signing in can resume it instead
// of making them start over (see requireAuthOrSaveDraft in
// require-auth.ts). sessionStorage, not localStorage: this is a short-lived
// draft for the current browser tab's redirect round trip, not something
// that should persist indefinitely once the tab/flow is gone.
const DRAFT_KEY_PREFIX = "ensena_pending_action_";

export interface PendingAction<T = unknown> {
  id: string;
  kind: string;
  createdAtMs: number;
  data: T;
}

export function savePendingAction<T>(kind: string, data: T): string {
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (typeof window === "undefined") return id;
  const action: PendingAction<T> = { id, kind, createdAtMs: Date.now(), data };
  window.sessionStorage.setItem(DRAFT_KEY_PREFIX + id, JSON.stringify(action));
  return id;
}

export function getPendingAction<T>(id: string): PendingAction<T> | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(DRAFT_KEY_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAction<T>;
  } catch {
    return null;
  }
}

export function clearPendingAction(id: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DRAFT_KEY_PREFIX + id);
}
