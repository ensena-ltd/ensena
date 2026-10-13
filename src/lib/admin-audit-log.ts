// A general cross-page admin activity log — same localStorage +
// useSyncExternalStore idiom as escrow-store.ts, so an action logged from
// the Payout Review page is visible from Settings -> Audit Log without a
// page reload, and survives a hard navigation between them. Dispute
// resolutions already have their own real audit trail in escrow-store.ts;
// the Audit Log page merges both rather than duplicating dispute entries
// here.
const LOG_KEY = "ensena_admin_audit_log";
export const AUDIT_EVENT = "ensena:admin-audit-changed";

export interface AdminAuditEntry {
  id: string;
  atMs: number;
  action: string;
  actor: string;
  detail: string;
}

export const seedEntries: AdminAuditEntry[] = [
  { id: "seed-1", atMs: new Date(2026, 7, 28, 10, 32).getTime(), action: "Approved tutor", actor: "Benny (Admin)", detail: "Tunde Adebayo" },
  { id: "seed-2", atMs: new Date(2026, 7, 28, 10, 45).getTime(), action: "Approved group class", actor: "Benny (Admin)", detail: "WAEC Mathematics Prep" },
  { id: "seed-3", atMs: new Date(2026, 7, 28, 11, 2).getTime(), action: "Restricted account", actor: "Benny (Admin)", detail: "Grace Emmanuel (Student)" },
  { id: "seed-4", atMs: new Date(2026, 7, 28, 11, 15).getTime(), action: "Approved payout", actor: "Benny (Admin)", detail: "₦18,000 · Michael Adewale" },
  { id: "seed-5", atMs: new Date(2026, 7, 20, 14, 0).getTime(), action: "Suspended tutor", actor: "Benny (Admin)", detail: "Ibrahim Suleiman: missed scheduled lessons" },
];

function readRaw(): AdminAuditEntry[] {
  if (typeof window === "undefined") return seedEntries;
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as AdminAuditEntry[]) : seedEntries;
  } catch {
    return seedEntries;
  }
}

let cachedRaw: string | null = null;
let cachedParsed: AdminAuditEntry[] = seedEntries;
export function getAdminAuditLog(): AdminAuditEntry[] {
  if (typeof window === "undefined") return seedEntries;
  const raw = window.localStorage.getItem(LOG_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedParsed = raw ? (JSON.parse(raw) as AdminAuditEntry[]) : seedEntries;
  }
  return cachedParsed;
}

export function logAdminAction(action: string, actor: string, detail: string): void {
  if (typeof window === "undefined") return;
  const entry: AdminAuditEntry = { id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, atMs: Date.now(), action, actor, detail };
  const next = [entry, ...readRaw()];
  window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(AUDIT_EVENT));
}

export function subscribeAuditLog(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUDIT_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUDIT_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
