// Real, persisted Active/Suspended/Banned account status for tutors and
// students — localStorage-backed, same idiom as escrow-store.ts /
// reviews-store.ts. Previously every consumer (tutor/student full-details
// pages, and separately the admin-tutors/admin-students list pages) held
// its own disconnected local useState copy of `status`, so suspending a
// tutor from the list page didn't show up on their detail page or
// vice-versa. This is the one place status is written; everyone reads it
// from here so a change is immediately visible everywhere.
import { logAdminAction } from "@/lib/admin-audit-log";
import { initialAdminStudents, initialAdminTutors, type AdminStudentStatus, type AdminTutorStatus } from "@/lib/admin-data";

export type AccountEntityType = "tutor" | "student";
// "Active" | "Warning" | "UnderReview" | "Restricted" | "Suspended" | "Banned"
export type AccountStatus = AdminTutorStatus | AdminStudentStatus;

// Statuses that carry a real expiration and auto-revert once it passes —
// see effectiveAccountStatus(). Warning/UnderReview/Banned don't expire on
// their own (UnderReview ends only when an admin makes a final decision;
// Banned is permanent).
const EXPIRABLE_STATUSES: AccountStatus[] = ["Restricted", "Suspended"];

export interface AccountStatusRecord {
  status: AccountStatus;
  reason?: string;
  updatedBy?: string;
  updatedAtLabel?: string;
  // ISO timestamp this status took effect — used for "Ends in Xh" style
  // displays and the admin enforcement history.
  startedAt?: string;
  // ISO timestamp a Restricted/Suspended status stops being in effect.
  // Required (by convention) for those two statuses; absent otherwise.
  expiresAt?: string;
  // True when this status was applied automatically by the moderation
  // engine (moderation-store.ts) while a case is pending review — distinct
  // from an admin's own final decision, which always sets this false (by
  // omitting it) and overwrites whatever interim status existed. See the
  // module comment for why one overwritable record — not a ledger of
  // concurrent enforcements — is the deliberate scope here.
  interim?: boolean;
  // Links back to the moderation case/report that caused this status, if
  // any — lets the dashboard/admin UI cite "why" without re-deriving it.
  caseReportId?: string;
}

const STATUS_KEY = "ensena_account_status";
export const ACCOUNT_STATUS_EVENT = "ensena:account-status-changed";

type StatusMap = Record<string, AccountStatusRecord>;

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

const readOverrides = makeCachedReader<StatusMap>(STATUS_KEY, {});

function writeOverrides(value: StatusMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATUS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(ACCOUNT_STATUS_EVENT));
}

function recordKey(type: AccountEntityType, id: string): string {
  return `${type}:${id}`;
}

// The seed value from admin-data.ts — used until an admin actually changes
// status here, so every entity has a real starting status without needing
// a migration step. Exported so hooks can use it, unconditionally, as the
// SSR-safe pre-hydration value (see use-account-status.ts).
export function getAccountStatusSeed(type: AccountEntityType, id: string): AccountStatusRecord {
  if (type === "tutor") {
    const t = initialAdminTutors.find((x) => x.id === id);
    return { status: t?.status ?? "Active", reason: t?.suspendReason ?? t?.banReason };
  }
  const s = initialAdminStudents.find((x) => x.id === id);
  return { status: s?.status ?? "Active" };
}

// The RAW stored record — includes a Restricted/Suspended status even
// after its expiresAt has passed. Admin history/audit views want this (so
// "was restricted, expired on its own" stays visible); every other
// consumer (dashboards, booking/discovery enforcement) should call
// getEffectiveAccountStatus() instead.
export function getAccountStatus(type: AccountEntityType, id: string): AccountStatusRecord {
  const overrides = readOverrides();
  return overrides[recordKey(type, id)] ?? getAccountStatusSeed(type, id);
}

export interface SetAccountStatusOptions {
  expiresAt?: string;
  interim?: boolean;
  caseReportId?: string;
}

export function setAccountStatus(
  type: AccountEntityType,
  id: string,
  status: AccountStatus,
  reason: string | undefined,
  actor: string,
  options: SetAccountStatusOptions = {}
): void {
  const overrides = readOverrides();
  const now = Date.now();
  const next: StatusMap = {
    ...overrides,
    [recordKey(type, id)]: {
      status,
      reason,
      updatedBy: actor,
      updatedAtLabel: new Date(now).toLocaleString(),
      startedAt: new Date(now).toISOString(),
      expiresAt: options.expiresAt,
      interim: options.interim,
      caseReportId: options.caseReportId,
    },
  };
  writeOverrides(next);
  const durationNote = options.expiresAt ? ` until ${new Date(options.expiresAt).toLocaleString()}` : "";
  logAdminAction(
    `${status === "Active" ? "Reinstated" : status} ${type}`,
    actor,
    `${type} ${id}${reason ? `: ${reason}` : ""}${durationNote}${options.interim ? " (automatic, pending review)" : ""}`
  );
}

// The status that actually governs permissions right now — a Restricted or
// Suspended record whose expiresAt has passed reverts to Active (unless a
// separate mechanism, e.g. Banned, otherwise applies) without anyone having
// to manually clear it. Mirrors the exact effectiveStatus()/expiresAt
// pattern offers-data.ts already uses for proposal expiration — same
// "compute live status from a stored timestamp, never mutate storage just
// to display it" idiom.
export function effectiveAccountStatus(record: AccountStatusRecord, now: Date = new Date()): AccountStatusRecord {
  if (EXPIRABLE_STATUSES.includes(record.status) && record.expiresAt && new Date(record.expiresAt) < now) {
    return { status: "Active" };
  }
  return record;
}

export function getEffectiveAccountStatus(type: AccountEntityType, id: string, now: Date = new Date()): AccountStatusRecord {
  return effectiveAccountStatus(getAccountStatus(type, id), now);
}

// Enseña's per-role identity objects (dashboardTutor/dashboardStudent) are
// name-keyed, not id-keyed — resolves a display name to the matching
// AdminTutor/AdminStudent record so the dashboard/enforcement layer can
// look up "my own" status/permissions without a second id scheme. Mirrors
// moderation-store.ts's own (now-delegating) resolveAccountId.
export function accountIdForName(type: AccountEntityType, name: string): string | undefined {
  if (type === "tutor") return initialAdminTutors.find((t) => t.name === name)?.id;
  return initialAdminStudents.find((s) => s.name === name)?.id;
}

// Same name-keyed lookup as accountIdForName, but for email — used to
// resolve whether a mock catalog entry corresponds to a real Supabase auth
// account (see moderation-store.ts's backend-aware restriction functions),
// without every caller needing to thread an email through by hand.
export function emailForName(type: AccountEntityType, name: string): string | undefined {
  if (type === "tutor") return initialAdminTutors.find((t) => t.name === name)?.email;
  return initialAdminStudents.find((s) => s.name === name)?.email;
}

export function subscribeAccountStatus(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ACCOUNT_STATUS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ACCOUNT_STATUS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
