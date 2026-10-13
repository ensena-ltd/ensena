// Enseña's off-platform-communication Violation & Restriction engine —
// localStorage-persisted, same idiom as every other store this session.
// This is the layer between "the safety engine blocked a message" (see
// communication-safety.ts) and any real consequence: recording who did it,
// building their strike history, applying a real progressive-enforcement
// ladder with EXPLICIT start/end timestamps on every restriction, and
// raising a real case in the existing admin Reports queue (reports-store.ts)
// so this becomes one connected system rather than a silent client-side
// filter nobody can review or appeal.
//
// Core rule, enforced everywhere this module is used: ONLY THE SENDER IS
// PENALIZED. A recipient never accrues a violation just because someone
// else tried to send them prohibited content.
import { accountIdForName, emailForName, setAccountStatus, type AccountStatus } from "@/lib/account-status-store";
import { logAdminAction } from "@/lib/admin-audit-log";
import type { SafetyCategory, SafetyConfidence } from "@/lib/communication-safety";
import { formatPlatformDate, formatPlatformTime, getPlatformNowMs } from "@/lib/platform-time";
import { createReport } from "@/lib/reports-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type ActorRole = "Student" | "Tutor";
export type ModerationChannel = "Message" | "Review" | "Profile" | "File" | "Camera" | "Screen" | "Audio";

// Kept for admin-list summaries that just want "how bad is this person's
// record" at a glance — derived from confirmedViolationCount, never stored.
export type RestrictionLevel = "None" | "CommunicationRestricted" | "SeverelyRestricted" | "PendingTermination";

export interface ModerationViolation {
  id: string;
  actorName: string;
  actorRole: ActorRole;
  category: SafetyCategory;
  confidence: SafetyConfidence;
  channel: ModerationChannel;
  // Confirmed (high-confidence) violations count toward strikes immediately;
  // medium-confidence ones are blocked but only "flagged" pending an
  // admin's review of the case this creates (see reports-store.ts).
  confirmed: boolean;
  atMs: number;
  atLabel: string;
  reportId: string;
  // The actual offending text/filename, truncated — ADMIN-ONLY evidence for
  // reviewing the case (see the report/violation detail views). Never
  // surfaced to the sender or recipient — the blocked-message copy they see
  // stays generic on purpose (see communication-safety.ts's
  // BLOCKED_MESSAGE_COPY / "do not expose the detection logic").
  evidenceSnippet?: string;
  // True when this violation was only detected by combining this message
  // with the sender's own recent messages in the same conversation (see
  // messages-store.ts's context-window check) — an email or phone number
  // split across several individually-harmless-looking messages.
  fromContextWindow?: boolean;
}

export interface UserSafetyProfile {
  actorName: string;
  actorRole: ActorRole;
  confirmedViolationCount: number;
  restriction: RestrictionLevel;
  violations: ModerationViolation[];
}

// ---------------------------------------------------------------------------
// Restrictions — the real, durable enforcement ledger. Every Warning,
// messaging restriction, and suspension this platform ever applies is one of
// these records, with an explicit start/end the messaging gate (isRestricted,
// below) and the account-status system (account-status-store.ts) both derive
// live from — never a vague "you're restricted" flag with no expiry.
// ---------------------------------------------------------------------------

export type RestrictionType = "Warning" | "MessagingRestriction" | "Suspension";

// A restriction's CASE-REVIEW lifecycle, not just "is it in effect" — mirrors
// reports-store.ts's own status vocabulary so the two systems read as one
// connected pipeline rather than two disconnected state machines. "Active"
// covers an in-effect Warning or MessagingRestriction; "Suspended" is the
// equivalent in-effect state specifically for a Suspension-type record (kept
// distinct so an admin scanning a list can immediately tell "just can't
// message" apart from "whole account is down").
export type RestrictionStatus = "Active" | "UnderReview" | "Resolved" | "Expired" | "Escalated" | "Suspended";

export interface RestrictionRecord {
  id: string;
  actorName: string;
  actorRole: ActorRole;
  type: RestrictionType;
  reason: string;
  violationCountAtTime: number;
  status: RestrictionStatus;
  startAtMs: number;
  // null only ever valid for a Warning (never blocks anything, so never
  // needs to expire). A MessagingRestriction or Suspension always has one —
  // enforced in applyRestriction below, not just a UI convention.
  endAtMs: number | null;
  durationLabel: string;
  // "System" for the automatic ladder, or the admin's own display name.
  createdBy: string;
  createdAtMs: number;
  caseReportId?: string;
  // The restriction this one replaces, when an admin issues a manual
  // "Apply Account Action" decision on top of an existing case.
  supersedesId?: string;
  // Set only once a support ticket has been filed contesting this
  // restriction — see submitRestrictionAppeal.
  appealTicketId?: string;
  resolvedBy?: string;
  resolvedAtMs?: number;
  resolutionReason?: string;
}

const MODERATION_KEY = "ensena_moderation_violations";
export const MODERATION_EVENT = "ensena:moderation-changed";
const RESTRICTIONS_KEY = "ensena_moderation_restrictions";
export const RESTRICTIONS_EVENT = "ensena:restrictions-changed";

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

const readViolationsRaw = makeCachedReader<ModerationViolation[]>(MODERATION_KEY, []);

function writeJson(value: ModerationViolation[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODERATION_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(MODERATION_EVENT));
}

export function getAllViolations(): ModerationViolation[] {
  return readViolationsRaw();
}

const readRestrictionsRaw = makeCachedReader<RestrictionRecord[]>(RESTRICTIONS_KEY, []);

function writeRestrictions(value: RestrictionRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESTRICTIONS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(RESTRICTIONS_EVENT));
}

// ---------------------------------------------------------------------------
// Progressive enforcement policy — ONE named, editable table (matching the
// same "policy object" idiom offers-data.ts's defaultOfferPolicySettings
// already uses) rather than magic numbers scattered across call sites. A
// violation count beyond the table's last tier stays capped at that tier
// (Suspension) rather than escalating indefinitely.
// ---------------------------------------------------------------------------
export interface EnforcementTier {
  atViolationCount: number;
  action: RestrictionType;
  /** null is only valid for a Warning tier. */
  durationHours: number | null;
  label: string;
}

export const ENFORCEMENT_POLICY: EnforcementTier[] = [
  { atViolationCount: 1, action: "Warning", durationHours: null, label: "First violation — formal warning" },
  { atViolationCount: 2, action: "MessagingRestriction", durationHours: 24, label: "Second violation — 24-hour messaging restriction" },
  { atViolationCount: 3, action: "MessagingRestriction", durationHours: 24 * 3, label: "Third violation — 3-day messaging restriction" },
  { atViolationCount: 4, action: "MessagingRestriction", durationHours: 24 * 7, label: "Fourth violation — 7-day messaging restriction" },
  { atViolationCount: 5, action: "Suspension", durationHours: 24 * 14, label: "Fifth+ violation — account suspension pending review" },
];

export function tierForViolationCount(count: number): EnforcementTier {
  const exact = ENFORCEMENT_POLICY.find((t) => t.atViolationCount === count);
  if (exact) return exact;
  const last = ENFORCEMENT_POLICY[ENFORCEMENT_POLICY.length - 1];
  return count > last.atViolationCount ? last : ENFORCEMENT_POLICY[0];
}

// Preset durations offered in the "Apply Account Action" admin flow —
// separate from the automatic ladder's own defaults so an admin reviewing a
// specific case can pick a shorter/longer window than the system's default
// for that violation count.
export const RESTRICTION_DURATION_PRESETS: { label: string; hours: number }[] = [
  { label: "24 hours", hours: 24 },
  { label: "3 days", hours: 24 * 3 },
  { label: "7 days", hours: 24 * 7 },
  { label: "14 days", hours: 24 * 14 },
  { label: "30 days", hours: 24 * 30 },
];

function formatDurationLabel(startAtMs: number, endAtMs: number | null): string {
  if (endAtMs === null) return "No expiration";
  const ms = Math.max(0, endAtMs - startAtMs);
  const hours = ms / (60 * 60 * 1000);
  if (hours < 24) {
    const h = Math.round(hours);
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** "September 10, 2026 at 3:00 PM" — the exact restoration-time format required everywhere a restriction is shown, Africa/Lagos-anchored like every other date on the platform. */
export function formatRestorationMoment(ms: number): string {
  return `${formatPlatformDate(ms)} at ${formatPlatformTime(ms)}`;
}

function resolveAccountId(actorName: string, actorRole: ActorRole): string | undefined {
  return accountIdForName(actorRole === "Tutor" ? "tutor" : "student", actorName);
}

const ACCOUNT_STATUS_FOR_TYPE: Record<RestrictionType, AccountStatus> = {
  Warning: "Warning",
  MessagingRestriction: "Restricted",
  Suspension: "Suspended",
};

function syncAccountStatus(record: RestrictionRecord): void {
  const accountId = resolveAccountId(record.actorName, record.actorRole);
  if (!accountId) return;
  setAccountStatus(
    record.actorRole === "Tutor" ? "tutor" : "student",
    accountId,
    ACCOUNT_STATUS_FOR_TYPE[record.type],
    record.reason,
    record.createdBy,
    {
      expiresAt: record.endAtMs ? new Date(record.endAtMs).toISOString() : undefined,
      interim: record.createdBy === "System",
      caseReportId: record.caseReportId,
    }
  );
}

// The one place a restriction is ever created — used both by the automatic
// ladder (recordViolation/adminConfirmViolation, createdBy: "System") and by
// an admin's own "Apply Account Action" decision. Requires a real end
// date/time for anything that actually blocks something — never lets a
// MessagingRestriction or Suspension be applied open-ended.
export interface ApplyRestrictionInput {
  actorName: string;
  actorRole: ActorRole;
  type: RestrictionType;
  reason: string;
  violationCountAtTime: number;
  createdBy: string;
  startAtMs?: number;
  /** Provide either durationHours (relative to startAtMs) or an explicit endAtMs — never both. */
  durationHours?: number | null;
  endAtMs?: number | null;
  caseReportId?: string;
  supersedesId?: string;
}

export function applyRestriction(input: ApplyRestrictionInput): RestrictionRecord {
  const startAtMs = input.startAtMs ?? getPlatformNowMs();
  const endAtMs = input.endAtMs !== undefined ? input.endAtMs : input.durationHours == null ? null : startAtMs + input.durationHours * 60 * 60 * 1000;

  if (input.type !== "Warning" && endAtMs === null) {
    throw new Error("A messaging restriction or suspension must have an expiration date/time.");
  }

  const previous = input.supersedesId ? readRestrictionsRaw().find((r) => r.id === input.supersedesId) : undefined;

  const record: RestrictionRecord = {
    id: `rst-${startAtMs}-${Math.random().toString(36).slice(2, 7)}`,
    actorName: input.actorName,
    actorRole: input.actorRole,
    type: input.type,
    reason: input.reason,
    violationCountAtTime: input.violationCountAtTime,
    status: input.type === "Suspension" ? "Suspended" : "Active",
    startAtMs,
    endAtMs,
    durationLabel: formatDurationLabel(startAtMs, endAtMs),
    createdBy: input.createdBy,
    createdAtMs: Date.now(),
    caseReportId: input.caseReportId,
    supersedesId: input.supersedesId,
  };

  // Superseding an existing restriction (an admin's manual decision on a
  // case that already had an automatic interim one) resolves the old record
  // rather than leaving two "active" restrictions on the same account.
  const rest = readRestrictionsRaw().filter((r) => r.id !== input.supersedesId);
  const superseded = previous
    ? [{ ...previous, status: "Resolved" as RestrictionStatus, resolvedBy: input.createdBy, resolvedAtMs: Date.now(), resolutionReason: `Superseded by a new ${input.type === "MessagingRestriction" ? "messaging restriction" : input.type.toLowerCase()}.` }]
    : [];

  writeRestrictions([record, ...superseded, ...rest]);
  syncAccountStatus(record);
  logAdminAction(`Applied ${record.type}`, input.createdBy, `${input.actorName} (${input.actorRole}): ${input.reason}`);

  return record;
}

// Lazily derives Expired from a stored end date/time — the exact same
// "compute live status from a stored timestamp, never mutate storage just to
// display it" idiom as offers-data.ts's effectiveStatus() and
// account-status-store.ts's effectiveAccountStatus(). Terminal statuses
// (Resolved) are never overwritten by this.
export function effectiveRestrictionStatus(record: RestrictionRecord, nowMs: number = getPlatformNowMs()): RestrictionRecord {
  const blocking: RestrictionStatus[] = ["Active", "UnderReview", "Escalated", "Suspended"];
  if (blocking.includes(record.status) && record.endAtMs !== null && record.endAtMs <= nowMs) {
    return { ...record, status: "Expired" };
  }
  return record;
}

export function getRestrictionHistory(actorName: string, actorRole: ActorRole, nowMs: number = getPlatformNowMs()): RestrictionRecord[] {
  return readRestrictionsRaw()
    .filter((r) => r.actorName === actorName && r.actorRole === actorRole)
    .map((r) => effectiveRestrictionStatus(r, nowMs))
    .sort((a, b) => b.startAtMs - a.startAtMs);
}

// The single restriction actually governing this account right now, or
// undefined if none — picks the most severe one if more than one somehow
// remains live (should not normally happen, since applyRestriction supersedes
// the prior record, but a defensive tie-break matters for §10's "multiple
// active restrictions" requirement).
const TYPE_SEVERITY: Record<RestrictionType, number> = { Warning: 0, MessagingRestriction: 1, Suspension: 2 };

export function getActiveRestriction(actorName: string, actorRole: ActorRole, nowMs: number = getPlatformNowMs()): RestrictionRecord | undefined {
  const blocking: RestrictionStatus[] = ["Active", "UnderReview", "Escalated", "Suspended"];
  const live = getRestrictionHistory(actorName, actorRole, nowMs).filter((r) => blocking.includes(r.status) && r.type !== "Warning");
  if (live.length === 0) return undefined;
  return live.sort((a, b) => TYPE_SEVERITY[b.type] - TYPE_SEVERITY[a.type])[0];
}

// Admin action — the case had no real violation, or the restriction was
// applied incorrectly. Restores access IMMEDIATELY: the record's status
// flips to Resolved right now (not "will resolve"), so the very next call to
// getActiveRestriction/isRestricted for this person reflects the unlock —
// there is no separate "unlock messaging" step to remember to also do.
export function resolveRestrictionNoViolation(restrictionId: string, actor: string, reason: string): RestrictionRecord | undefined {
  const restrictions = readRestrictionsRaw();
  const target = restrictions.find((r) => r.id === restrictionId);
  if (!target) return undefined;
  const resolved: RestrictionRecord = {
    ...target,
    status: "Resolved",
    resolvedBy: actor,
    resolvedAtMs: Date.now(),
    resolutionReason: reason,
  };
  writeRestrictions(restrictions.map((r) => (r.id === restrictionId ? resolved : r)));

  // Reinstate the account status immediately too — the same "restore right
  // now, don't wait for the stored expiresAt" guarantee applies there.
  const accountId = resolveAccountId(target.actorName, target.actorRole);
  if (accountId) {
    setAccountStatus(target.actorRole === "Tutor" ? "tutor" : "student", accountId, "Active", `Resolved — no violation found: ${reason}`, actor);
  }
  logAdminAction("Resolved restriction", actor, `${target.actorName} (${target.actorRole}): ${reason}`);
  return resolved;
}

// Called when a user taps "Contact Internal Support" on the restriction
// notice — links the resulting ticket back onto the restriction record and
// moves it into UnderReview so admin's queue immediately shows this is being
// actively contested, without changing whether messaging stays blocked.
export function markRestrictionUnderReview(restrictionId: string, ticketId: string): void {
  const restrictions = readRestrictionsRaw();
  const target = restrictions.find((r) => r.id === restrictionId);
  if (!target || target.status === "Resolved" || target.status === "Expired") return;
  writeRestrictions(
    restrictions.map((r) => (r.id === restrictionId ? { ...r, status: r.type === "Suspension" ? "Suspended" : "UnderReview", appealTicketId: ticketId } : r))
  );
}

export function getSafetyProfile(actorName: string, actorRole: ActorRole): UserSafetyProfile {
  const violations = readViolationsRaw()
    .filter((v) => v.actorName === actorName && v.actorRole === actorRole)
    .sort((a, b) => b.atMs - a.atMs);
  const confirmedViolationCount = violations.filter((v) => v.confirmed).length;
  const active = getActiveRestriction(actorName, actorRole);
  const restriction: RestrictionLevel =
    active?.type === "Suspension" ? "PendingTermination" : active?.type === "MessagingRestriction" ? "SeverelyRestricted" : confirmedViolationCount >= 1 ? "CommunicationRestricted" : "None";
  return { actorName, actorRole, confirmedViolationCount, restriction, violations };
}

// "CommunicationRestricted" (strike 1 / a Warning) is a formal notice — the
// user can still send messages. A MessagingRestriction or Suspension
// actually blocks the capability, enforced by the caller (see
// messages-store.ts) checking this before allowing a send. Per §10: this is
// only ever true while a real, unexpired, unresolved restriction exists —
// checking both this actor's own messaging restriction AND their overall
// account status (a Suspended/Banned account blocks messaging too, even if
// no messaging-specific restriction record exists for some other reason).
export function isRestricted(actorName: string, actorRole: ActorRole, capability: "messaging" | "fileUpload"): boolean {
  void capability; // both capabilities share the same restriction ladder today
  return getActiveRestriction(actorName, actorRole) !== undefined;
}

/** The full, user-facing "what happened, why, until when, what can I do" restriction the blocked-message UI needs — undefined when the user isn't currently blocked. */
export function getBlockingRestriction(actorName: string, actorRole: ActorRole): RestrictionRecord | undefined {
  return getActiveRestriction(actorName, actorRole);
}

// A clean, generic reason phrase for the USER-FACING notice — deliberately
// never the raw `reason` field (which can name the exact detection category
// and is meant for admin eyes only, same "never expose the detection logic"
// rule as communication-safety.ts's BLOCKED_MESSAGE_COPY). Distinguishes
// only "system-applied" vs "admin-confirmed" wording, per the two example
// notices the product spec calls for.
export function userFacingReasonLabel(record: RestrictionRecord): string {
  if (record.createdBy !== "System") return "a confirmed communication policy violation";
  return "repeated communication policy violations";
}

// The one place the plain-text fallback notice (a toast/inline error, for
// any surface that isn't rendering the full MessageComposer restriction
// banner — the classroom's own chat, offer-composer modals) is built. Never
// the old vague "your ability has been restricted" with no end date — always
// states what happened, why, and exactly when messaging resumes.
export function buildRestrictionMessage(actorName: string, actorRole: ActorRole): string {
  const restriction = getActiveRestriction(actorName, actorRole);
  if (!restriction) {
    return "Your ability to send messages has been restricted. Contact Internal Support if you believe this is a mistake.";
  }
  const subject = restriction.type === "Suspension" ? "Your account has been temporarily suspended" : "Your messaging access has been temporarily restricted";
  const restoreLine = restriction.endAtMs
    ? restriction.type === "Suspension"
      ? `Suspension ends on ${formatRestorationMoment(restriction.endAtMs)}.`
      : `Messaging will be available again on ${formatRestorationMoment(restriction.endAtMs)}.`
    : "";
  return `${subject} due to ${userFacingReasonLabel(restriction)}. ${restoreLine} If you believe this was applied incorrectly, contact Internal Support.`;
}

const categoryLabels: Record<SafetyCategory, string> = {
  url: "an external link",
  email: "an email address",
  phone: "a phone number",
  social: "off-platform contact information",
  payment: "off-platform payment details",
  address: "a physical address or meeting location",
};

export interface RecordViolationOptions {
  // The actual offending text/filename — stored for admin review only, see
  // ModerationViolation.evidenceSnippet.
  evidence?: string;
  fromContextWindow?: boolean;
}

// Someone testing the filter — "zero eight zero...", then "oh eight oh...",
// then a screenshot of the rest — isn't three unrelated events. A burst of
// blocked/flagged attempts (confirmed or not) in a short window is itself
// evidence of a deliberate bypass attempt, so it forces at least the tier-2
// (MessagingRestriction) enforcement even before any individual message
// reaches high confidence on its own.
const PROBE_WINDOW_MS = 5 * 60 * 1000;
const PROBE_THRESHOLD = 3;

// The one place a violation is ever recorded. Always attributes it to the
// SENDER (`actorName`/`actorRole`) — callers must never pass the recipient
// here, even though the recipient is the one who would have received the
// content had it not been blocked.
export function recordViolation(
  actorName: string,
  actorRole: ActorRole,
  category: SafetyCategory,
  confidence: SafetyConfidence,
  channel: ModerationChannel,
  options: RecordViolationOptions = {}
): ModerationViolation {
  const confirmed = confidence === "high";
  const priorProfile = getSafetyProfile(actorName, actorRole);
  const newCount = confirmed ? priorProfile.confirmedViolationCount + 1 : priorProfile.confirmedViolationCount;
  const recentAttempts = priorProfile.violations.filter((v) => Date.now() - v.atMs < PROBE_WINDOW_MS).length + 1;
  const isProbing = recentAttempts >= PROBE_THRESHOLD;

  const report = createReport({
    type: "Message",
    reportedName: actorName,
    reportedRole: actorRole,
    reportedUserId: resolveAccountId(actorName, actorRole),
    reporterName: "System",
    reporterRole: "Admin",
    reason: confirmed ? "Off-platform communication policy violation" : "Possible off-platform communication (flagged for review)",
    description: [
      `Automatically detected attempt to share ${categoryLabels[category]} via ${channel.toLowerCase()}.`,
      options.fromContextWindow ? "Only became apparent when combined with this sender's own recent messages in the conversation." : "",
      confirmed ? `This is confirmed violation ${newCount}.` : "Confidence was not high enough to auto-confirm. Needs admin review.",
      isProbing ? `${recentAttempts} blocked/flagged attempts from this person in the last 5 minutes. Treated as a deliberate bypass attempt regardless of individual confidence.` : "",
    ].filter(Boolean).join(" "),
    priority: isProbing || (confirmed && newCount >= 2) ? "High" : confirmed ? "Medium" : "Low",
  });

  const now = Date.now();
  const violation: ModerationViolation = {
    id: `mv-${now}-${Math.random().toString(36).slice(2, 7)}`,
    actorName,
    actorRole,
    category,
    confidence,
    channel,
    confirmed,
    atMs: now,
    atLabel: new Date(now).toLocaleString(),
    reportId: report.id,
    evidenceSnippet: options.evidence?.slice(0, 200),
    fromContextWindow: options.fromContextWindow,
  };
  writeJson([violation, ...readViolationsRaw()]);

  if (confirmed) {
    const tier = tierForViolationCount(newCount);
    const rateLimitBump = isProbing && tier.action === "Warning";
    const effectiveTier = rateLimitBump ? ENFORCEMENT_POLICY[1] : tier; // at least a MessagingRestriction if actively probing
    applyRestriction({
      actorName,
      actorRole,
      type: effectiveTier.action,
      reason: `Automatic: off-platform communication violation ladder reached "${effectiveTier.label}"${isProbing ? " (repeated attempts detected in a short window)" : ""}.`,
      violationCountAtTime: newCount,
      createdBy: "System",
      durationHours: effectiveTier.durationHours,
      caseReportId: report.id,
    });
  }

  return violation;
}

// Admin override — promotes a pending (medium-confidence) violation to a
// confirmed one, applying its strike. Used when an admin reviews the case
// this violation raised and agrees it was a genuine policy breach.
export function adminConfirmViolation(violationId: string, actor: string): void {
  const violations = readViolationsRaw();
  const violation = violations.find((v) => v.id === violationId);
  if (!violation || violation.confirmed) return;
  writeJson(violations.map((v) => (v.id === violationId ? { ...v, confirmed: true } : v)));
  const newCount = getSafetyProfile(violation.actorName, violation.actorRole).confirmedViolationCount;
  const tier = tierForViolationCount(newCount);
  applyRestriction({
    actorName: violation.actorName,
    actorRole: violation.actorRole,
    type: tier.action,
    reason: `Automatic: off-platform communication violation ladder reached "${tier.label}" (violation confirmed on review).`,
    violationCountAtTime: newCount,
    createdBy: actor,
    durationHours: tier.durationHours,
    caseReportId: violation.reportId,
  });
}

// Admin override — reverses a confirmed violation (a false positive), per
// "admin appeal/override" — the strike no longer counts toward the ladder.
export function adminReverseViolation(violationId: string): void {
  const violations = readViolationsRaw();
  writeJson(violations.map((v) => (v.id === violationId ? { ...v, confirmed: false } : v)));
}

export function subscribeModeration(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(MODERATION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(MODERATION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function subscribeRestrictions(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(RESTRICTIONS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(RESTRICTIONS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// ---------------------------------------------------------------------------
// Backend-aware admin restriction workflow — used by the admin "Apply/
// Resolve/Remove Restriction" UI (ModerationRestrictionPanel) and the
// restriction-appeal flow. NOT used by the automatic off-platform-
// communication ladder above (recordViolation/isRestricted/getSafetyProfile
// and their ~13 synchronous call sites in messages-store.ts, file-safety.ts,
// the classroom safety hooks, etc.) — those keep working exactly as today,
// unconditionally local, for every account. Rewriting that hot-path
// synchronous ladder onto an async backend is a separate, much larger
// change this pass deliberately doesn't make.
//
// The real Supabase `account_restrictions` table + RPCs
// (apply_account_restriction / resolve_account_restriction /
// mark_restriction_under_review / get_effective_account_status) require a
// genuine signed-up auth account — account_restrictions.actor_id references
// profiles, which references auth.users. Most of this app's tutor/student
// catalog is still seed/mock data (admin-data.ts) with no such account, so
// every function below resolves the target's real profile by email when one
// exists — genuinely backend-driven, timer-independent expiry via
// get_effective_account_status, not a frontend setInterval — and
// transparently falls back to the exact same local ledger above when it
// doesn't. Either way, account-status-store.ts stays in sync, so
// AccountStatusBanner and every other account-status consumer never needs
// to know which path was actually used.
// ---------------------------------------------------------------------------

interface DbAccountRestriction {
  id: string;
  actor_id: string;
  type: RestrictionType;
  reason: string;
  violation_count_at_time: number;
  status: "active" | "expired" | "reversed" | "under_review";
  start_at: string;
  end_at: string | null;
  duration_label: string | null;
  created_by: string | null;
  case_report_id: string | null;
  supersedes_id: string | null;
  appeal_ticket_ref: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_reason: string | null;
}

// Real (Postgres uuid) ids never start with the local ledger's "rst-"
// prefix — cheap enough to distinguish which store a given RestrictionRecord
// actually lives in without carrying a separate flag on the record itself.
function isBackendRestrictionId(id: string): boolean {
  return !id.startsWith("rst-");
}

async function resolveRealProfileId(actorName: string, actorRole: ActorRole, actorEmail?: string): Promise<string | undefined> {
  if (!isSupabaseConfigured()) return undefined;
  const email = actorEmail ?? emailForName(actorRole === "Tutor" ? "tutor" : "student", actorName);
  if (!email) return undefined;
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    return data?.id;
  } catch {
    return undefined;
  }
}

// created_by/resolved_by are real admin uuids in the backend, not display
// names — batch-resolved in one query rather than N+1 per history row.
async function resolveAdminNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (unique.length === 0) return new Map();
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
    return new Map((data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "Admin"]));
  } catch {
    return new Map();
  }
}

function mapDbRestrictionToRecord(row: DbAccountRestriction, actorName: string, actorRole: ActorRole, adminNames: Map<string, string>): RestrictionRecord {
  const startAtMs = new Date(row.start_at).getTime();
  const endAtMs = row.end_at ? new Date(row.end_at).getTime() : null;
  const status: RestrictionStatus =
    row.status === "reversed" ? "Resolved" : row.status === "under_review" ? "UnderReview" : row.type === "Suspension" ? "Suspended" : "Active";
  return {
    id: row.id,
    actorName,
    actorRole,
    type: row.type,
    reason: row.reason,
    violationCountAtTime: row.violation_count_at_time,
    status,
    startAtMs,
    endAtMs,
    durationLabel: row.duration_label ?? formatDurationLabel(startAtMs, endAtMs),
    createdBy: (row.created_by && adminNames.get(row.created_by)) || "Admin",
    createdAtMs: startAtMs,
    caseReportId: row.case_report_id ?? undefined,
    supersedesId: row.supersedes_id ?? undefined,
    appealTicketId: row.appeal_ticket_ref ?? undefined,
    resolvedBy: (row.resolved_by && adminNames.get(row.resolved_by)) || undefined,
    resolvedAtMs: row.resolved_at ? new Date(row.resolved_at).getTime() : undefined,
    resolutionReason: row.resolution_reason ?? undefined,
  };
}

export interface ApplyRestrictionResolvedInput extends ApplyRestrictionInput {
  actorEmail?: string;
}

// The one function ModerationRestrictionPanel's "Apply Account Action" (and
// the automatic ladder, indirectly, if it's ever pointed at this instead of
// the plain applyRestriction — it isn't today, by design) should call.
export async function applyRestrictionResolved(input: ApplyRestrictionResolvedInput): Promise<RestrictionRecord> {
  const profileId = await resolveRealProfileId(input.actorName, input.actorRole, input.actorEmail);
  if (!profileId) return applyRestriction(input);

  const startAtMs = input.startAtMs ?? getPlatformNowMs();
  const endAtMs = input.endAtMs !== undefined ? input.endAtMs : input.durationHours == null ? null : startAtMs + input.durationHours * 60 * 60 * 1000;
  if (input.type !== "Warning" && endAtMs === null) {
    throw new Error("A messaging restriction or suspension must have an expiration date/time.");
  }

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("apply_account_restriction", {
      p_actor_id: profileId,
      p_type: input.type,
      p_reason: input.reason,
      p_end_at: endAtMs ? new Date(endAtMs).toISOString() : null,
      p_duration_label: formatDurationLabel(startAtMs, endAtMs),
      p_case_report_id: input.caseReportId ?? null,
      p_supersedes_id: input.supersedesId ?? null,
      p_start_at: new Date(startAtMs).toISOString(),
    });
    if (error) throw error;

    const record = mapDbRestrictionToRecord(data as DbAccountRestriction, input.actorName, input.actorRole, new Map());
    // We already know who's applying this synchronously (the caller passed
    // it in) — no need to round-trip through profiles.full_name for it.
    record.createdBy = input.createdBy;
    syncAccountStatus(record);
    logAdminAction(`Applied ${record.type}`, input.createdBy, `${input.actorName} (${input.actorRole}): ${input.reason}`);
    return record;
  } catch {
    // The target has a real profile, but the write itself was rejected —
    // most commonly because THIS admin session isn't a real Supabase-
    // authenticated one (this app's admin dashboard is still its own
    // client-side session system, see admin-session.ts; RLS/the RPC's own
    // is_admin() check has nothing to authorize against). Falling back to
    // the local ledger here — instead of surfacing an opaque failure for an
    // action that plainly should succeed from the admin's point of view —
    // keeps this resilient today and automatically stops firing the moment
    // admin auth becomes real, with no further code change needed anywhere.
    return applyRestriction(input);
  }
}

// Shared by both admin "resolve" actions below — the DB side is identical
// (resolve_account_restriction always just reverses the row); only the
// resolution-reason text and audit-log wording differ between "no violation
// found" and "removed early".
async function resolveBackendRestriction(record: RestrictionRecord, actor: string, reason: string): Promise<RestrictionRecord> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("resolve_account_restriction", { p_restriction_id: record.id, p_resolution_reason: reason });
  if (error) throw error;
  const resolved = mapDbRestrictionToRecord(data as DbAccountRestriction, record.actorName, record.actorRole, new Map());
  resolved.resolvedBy = actor;
  return resolved;
}

// Restoring account-status-store.ts's "Active" state is the one guarantee
// resolveRestrictionResolved/removeRestrictionEarly must never skip, even
// when the backend write above fails (same admin-session caveat as
// applyRestrictionResolved) — the account-status banner has to actually
// unlock, not just silently fail to update while the admin sees a success
// toast for the backend call it never got.
function restoreAccountStatusActive(record: RestrictionRecord, actor: string, reason: string): void {
  const accountId = resolveAccountId(record.actorName, record.actorRole);
  if (accountId) setAccountStatus(record.actorRole === "Tutor" ? "tutor" : "student", accountId, "Active", reason, actor);
}

// Shared by resolveRestrictionResolved/removeRestrictionEarly: whatever
// happens with the Postgres row, the affected person must actually end up
// unblocked — restoring account-status-store's "Active" state locally is
// the one thing that's never allowed to silently no-op, since that's the
// state every dashboard/banner/permission check in this app actually reads.
async function resolveWithGuaranteedUnlock(record: RestrictionRecord, actor: string, reason: string, logLabel: string): Promise<RestrictionRecord | undefined> {
  if (!isBackendRestrictionId(record.id)) return resolveRestrictionNoViolation(record.id, actor, reason);
  try {
    const resolved = await resolveBackendRestriction(record, actor, reason);
    restoreAccountStatusActive(record, actor, reason);
    logAdminAction(logLabel, actor, `${record.actorName} (${record.actorRole}): ${reason}`);
    return resolved;
  } catch {
    // Same admin-session caveat as applyRestrictionResolved's catch — the
    // Postgres row itself may not update, but the person must still be
    // unblocked right now, so restore status locally regardless.
    restoreAccountStatusActive(record, actor, reason);
    logAdminAction(logLabel, actor, `${record.actorName} (${record.actorRole}): ${reason}`);
    return { ...record, status: "Resolved", resolvedBy: actor, resolvedAtMs: Date.now(), resolutionReason: reason };
  }
}

/** Admin "Resolve — No Violation Found" — dispatches to the real backend when `record` is a backend-issued restriction, otherwise the local ledger above. Guarantees the person is unblocked either way. */
export async function resolveRestrictionResolved(record: RestrictionRecord, actor: string, reason: string): Promise<RestrictionRecord | undefined> {
  return resolveWithGuaranteedUnlock(record, actor, reason, "Resolved restriction");
}

/** Admin "Remove Restriction" — ends an active, presumed-valid restriction early (distinct from "no violation found": the violation stands, enforcement is just ending sooner than scheduled). Same immediate-unlock guarantee as resolveRestrictionResolved. */
export async function removeRestrictionEarly(record: RestrictionRecord, actor: string, note: string): Promise<RestrictionRecord | undefined> {
  const reason = note.trim() || "Removed early by admin.";
  return resolveWithGuaranteedUnlock(record, actor, reason, "Removed restriction early");
}

/** Called when a user taps "Contact Internal Support" — the backend-aware counterpart to markRestrictionUnderReview above. */
export async function markRestrictionUnderReviewResolved(record: RestrictionRecord, ticketRef: string): Promise<void> {
  if (!isBackendRestrictionId(record.id)) {
    markRestrictionUnderReview(record.id, ticketRef);
    return;
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc("mark_restriction_under_review", { p_restriction_id: record.id, p_appeal_ticket_ref: ticketRef });
    if (error) throw error;
  } catch {
    // The appeal ticket itself was still filed successfully by the caller
    // (submitSupportRequest, a separate local system) — this only failing
    // to flag the restriction row as under_review is a display nicety, not
    // something worth surfacing as an appeal-submission failure.
  }
}

/** The backend-aware counterpart to getActiveRestriction — what useActiveRestriction actually polls. */
export async function getActiveRestrictionResolved(actorName: string, actorRole: ActorRole, actorEmail?: string): Promise<RestrictionRecord | undefined> {
  const profileId = await resolveRealProfileId(actorName, actorRole, actorEmail);
  if (!profileId) return getActiveRestriction(actorName, actorRole);

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc("get_effective_account_status", { p_actor_id: profileId });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as DbAccountRestriction | null;
    if (!row) return getActiveRestriction(actorName, actorRole);
    const adminNames = await resolveAdminNames([row.created_by]);
    return mapDbRestrictionToRecord(row, actorName, actorRole, adminNames);
  } catch {
    // Same admin-session caveat as the write side — never let a rejected
    // read make a genuinely restricted person look unrestricted; fall back
    // to whatever the local ledger says instead of silently returning none.
    return getActiveRestriction(actorName, actorRole);
  }
}

/** The backend-aware counterpart to getRestrictionHistory — what useRestrictionHistory actually polls. */
export async function getRestrictionHistoryResolved(actorName: string, actorRole: ActorRole, actorEmail?: string): Promise<RestrictionRecord[]> {
  const profileId = await resolveRealProfileId(actorName, actorRole, actorEmail);
  if (!profileId) return getRestrictionHistory(actorName, actorRole);

  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.from("account_restrictions").select("*").eq("actor_id", profileId).order("start_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as DbAccountRestriction[];
    const adminNames = await resolveAdminNames(rows.flatMap((r) => [r.created_by, r.resolved_by]));
    return rows.map((row) => effectiveRestrictionStatus(mapDbRestrictionToRecord(row, actorName, actorRole, adminNames)));
  } catch {
    return getRestrictionHistory(actorName, actorRole);
  }
}
