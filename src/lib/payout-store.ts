// Real, persisted tutor payouts — localStorage-backed, same idiom as the
// other *-store.ts files built this session. Tutor's "Withdraw Funds" and
// admin's payout review were previously two disconnected records
// (WithdrawalRecord vs PayoutRequest, different status enums, no shared
// key) — this store makes PayoutRequest the one real, shared record.
//
// The tutor's balance itself used to be a separately-stored number that
// requestPayout/rejectPayout nudged up and down by hand (`balance =
// balance +- amount`) — exactly the "simplistic balance" anti-pattern a real
// ledger should never use, and one that never actually reflected real
// session earnings at all (a tutor could complete ten lessons and this
// number would never move). getTutorBalance now COMPUTES available/pending/
// escrow fresh every call, straight from the real per-lesson escrow ledger
// (escrow-store.ts's LessonConfirmation records — the actual source of
// truth for "did this session's payment get released") and the real payout
// records here — so a lesson being confirmed, a dispute being resolved, or
// a payout being requested/rejected all show up immediately with no
// separate balance value that could drift out of sync with either.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import {
  initialPayoutRequests,
  type PayoutAuditEntry,
  type PayoutRequest,
  type PayoutStatus,
} from "@/lib/admin-tutor-payouts-data";
import { splitEarnings } from "@/lib/commission";
import { ESCROW_EVENT, getLessonConfirmations } from "@/lib/escrow-store";
import { dashboardTutor, type WithdrawalStatus } from "@/lib/tutor-dashboard-data";

export interface TutorBalance {
  escrow: number;
  available: number;
  pending: number;
}

const PAYOUTS_KEY = "ensena_payout_requests";
export const PAYOUTS_EVENT = "ensena:payouts-changed";

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

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(PAYOUTS_EVENT));
}

const readPayoutsRaw = makeCachedReader<PayoutRequest[]>(PAYOUTS_KEY, initialPayoutRequests);

// Every payout status except Rejected/Failed has actually removed money from
// what's available — Pending Review and Processing are funds already
// committed to a payout in flight, Paid is money that's left for good.
function isCommittedPayout(status: PayoutStatus): boolean {
  return status !== "Rejected" && status !== "Failed";
}

// useSyncExternalStore requires getSnapshot to return the SAME reference
// when nothing has actually changed, or a component re-rendering for an
// unrelated reason (this app has several ticking clocks) can spiral into
// extra render passes. getLessonConfirmations()/getPayoutRequests() already
// give us that stability (each is backed by its own makeCachedReader), so
// caching on THEIR references — rather than re-reading localStorage here
// too — gets the same guarantee for free instead of duplicating it.
let cachedConfirmationsRef: ReturnType<typeof getLessonConfirmations> | null = null;
let cachedPayoutsRef: PayoutRequest[] | null = null;
let cachedBalanceTutorName: string | null = null;
let cachedBalance: TutorBalance = { escrow: 0, pending: 0, available: 0 };

export function getTutorBalance(tutorName: string = dashboardTutor.name): TutorBalance {
  const confirmations = getLessonConfirmations();
  const payouts = readPayoutsRaw();
  if (confirmations === cachedConfirmationsRef && payouts === cachedPayoutsRef && tutorName === cachedBalanceTutorName) {
    return cachedBalance;
  }

  let available = 0;
  let pending = 0;
  let escrow = 0;
  for (const l of confirmations) {
    if (l.tutor !== tutorName) continue;
    // A resolved dispute's tutorReceived is the real, possibly-reduced
    // amount the tutor is entitled to — never re-derive it from the
    // original gross amount once a resolution exists.
    const net = l.resolution ? l.resolution.tutorReceived : splitEarnings(l.amountGross).net;
    if (l.escrowStatus === "Released") available += net;
    else if (l.escrowStatus === "Held") pending += net;
    else if (l.escrowStatus === "Frozen") escrow += net;
  }

  const committedPayouts = payouts
    .filter((p) => p.tutor === tutorName && isCommittedPayout(p.status))
    .reduce((sum, p) => sum + p.amount, 0);

  cachedConfirmationsRef = confirmations;
  cachedPayoutsRef = payouts;
  cachedBalanceTutorName = tutorName;
  cachedBalance = { escrow, pending, available: Math.max(0, available - committedPayouts) };
  return cachedBalance;
}

export function getPayoutRequests(): PayoutRequest[] {
  return readPayoutsRaw();
}

function updatePayout(id: string, patch: Partial<PayoutRequest>): void {
  writeJson(PAYOUTS_KEY, readPayoutsRaw().map((p) => (p.id === id ? { ...p, ...patch } : p)));
}

// Real request creation — called once, when the tutor actually submits the
// Withdraw Funds form. Creating this "Pending Review" record is itself what
// reduces the computed available balance (see isCommittedPayout above) — no
// separate balance write needed, so there's nothing here that could drift
// out of sync with the payout record itself. Mints a real PYT… reference via
// generateUniqueReferenceCode (buildBookingReference stays seed-only per its
// own doc comment) and appends a real audit-trail entry.
export async function requestPayout(input: {
  tutorName: string;
  tutorImage: string;
  tutorSubject: string;
  amount: number;
  bankName: string;
  accountLast4: string;
  accountName: string;
}): Promise<PayoutRequest> {
  const balance = getTutorBalance(input.tutorName);
  if (input.amount <= 0 || input.amount > balance.available) {
    throw new Error("Withdrawal amount exceeds your available balance.");
  }
  const exists = (candidate: string) => readPayoutsRaw().some((p) => p.id === candidate);
  const reference = await generateUniqueReferenceCode("payout", exists);
  const auditEntry: PayoutAuditEntry = { action: "Withdrawal requested", actor: input.tutorName, time: "Just now" };
  const created: PayoutRequest = {
    id: reference,
    tutor: input.tutorName,
    tutorImage: input.tutorImage,
    tutorSubject: input.tutorSubject,
    amount: input.amount,
    bankName: input.bankName,
    accountLast4: input.accountLast4,
    accountName: input.accountName,
    requestedLabel: "Just now",
    requestedAgo: "Just now",
    status: "Pending Review",
    availableBalanceBefore: balance.available,
    earningsBreakdown: [],
    auditTrail: [auditEntry],
  };
  writeJson(PAYOUTS_KEY, [created, ...readPayoutsRaw()]);
  return created;
}

// Admin actions — matching admin-payout-review-client.tsx's existing
// approveAndProcess/rejectPayout exactly (approve moves status to
// "Processing" only — there's no "mark as Paid" step anywhere in the
// existing admin UI, so none is added here). Rejection returns the funds to
// "available" for real simply by moving status out of isCommittedPayout —
// nothing to separately credit back.
export function approvePayout(id: string, actor: string): void {
  const current = readPayoutsRaw().find((p) => p.id === id);
  if (!current) return;
  updatePayout(id, {
    status: "Processing",
    auditTrail: [
      ...current.auditTrail,
      { action: "Approved", actor, time: "Just now" },
      { action: "Submitted to payment provider", actor: "System", time: "Just now" },
    ],
  });
}

export function rejectPayout(id: string, reason: string, note: string | undefined, actor: string): void {
  const current = readPayoutsRaw().find((p) => p.id === id);
  if (!current) return;
  updatePayout(id, {
    status: "Rejected",
    rejectionReason: reason,
    adminNote: note,
    auditTrail: [...current.auditTrail, { action: "Rejected", actor, time: "Just now" }],
  });
}

// The computed balance depends on BOTH stores — a lesson being released or a
// dispute being resolved (ESCROW_EVENT) changes it just as much as a payout
// being requested/rejected (PAYOUTS_EVENT) does, so useTutorBalance's
// subscription needs to wake up for either.
export function subscribePayouts(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PAYOUTS_EVENT, callback);
  window.addEventListener(ESCROW_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PAYOUTS_EVENT, callback);
    window.removeEventListener(ESCROW_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Display-only mapping — PayoutRequest.status (the real, shared source of
// truth) to the tutor-facing WithdrawalStatus label, so withdrawals-client.tsx
// keeps its existing WithdrawalRecord-shaped table/receipt UI untouched
// rather than needing a second real status field that could drift from the
// first. Same "one real status, mapped for display" pattern already used
// for GroupClassStatus -> GroupClassApprovalCategory in admin-group-classes-data.ts.
export function withdrawalStatusFor(status: PayoutStatus): WithdrawalStatus {
  switch (status) {
    case "Pending Review":
      return "Pending";
    case "Processing":
      return "Processing";
    case "Paid":
      return "Completed";
    case "Failed":
      return "Failed";
    case "Rejected":
      return "Rejected";
  }
}
