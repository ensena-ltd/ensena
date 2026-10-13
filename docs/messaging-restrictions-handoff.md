# Messaging Restriction & Enforcement System — Developer Handoff

## What this is

A durable, timed enforcement ledger for messaging restrictions, support-review
outcomes, and account suspensions. It replaces the old vague "you've been
restricted" copy with explicit start/end timestamps, a configurable
progressive-enforcement policy, an admin review flow, and automatic
expiry — all built as an extension of the existing violation engine
(`src/lib/moderation-store.ts`), not a parallel system.

No new backend or API route was added. Like every other "real" system in
this app, enforcement is a client-side localStorage ledger that every caller
is routed through — the same pattern as `escrow-store.ts` and
`account-status-store.ts`.

## Data model

`RestrictionRecord` (`src/lib/moderation-store.ts`) is the single source of
truth. One record per enforcement action:

```ts
interface RestrictionRecord {
  id: string;
  actorName: string;
  actorRole: "Student" | "Tutor";
  type: "Warning" | "MessagingRestriction" | "Suspension";
  reason: string;                 // admin-facing only, never shown to the user verbatim
  violationCountAtTime: number;
  status: "Active" | "UnderReview" | "Resolved" | "Expired" | "Escalated" | "Suspended";
  startAtMs: number;
  endAtMs: number | null;         // null only ever valid for "Warning"
  durationLabel: string;          // e.g. "7 days" — precomputed for display
  createdBy: string;              // "System" for the automatic ladder, or an admin's display name
  createdAtMs: number;
  caseReportId?: string;          // links back to reports-store.ts
  supersedesId?: string;          // set when an admin decision replaces a prior record
  appealTicketId?: string;        // set once "Contact Internal Support" is used
  resolvedBy?: string;
  resolvedAtMs?: number;
  resolutionReason?: string;
}
```

Stored under `ensena_moderation_restrictions` in localStorage, alongside the
pre-existing `ensena_moderation_violations` key. Status is **derived live**,
never mutated to reflect expiry — see "How expiry works" below.

`"Suspended"` appears both as a `RestrictionType` (the action an admin
applies) and as a `RestrictionStatus` (the in-effect state for a Suspension
record, parallel to `"Active"` for a Warning/MessagingRestriction). This lets
an admin scanning a list tell "can't message" apart from "account is down"
at a glance — it is not a duplicate/typo.

## Progressive enforcement policy

`ENFORCEMENT_POLICY` in `moderation-store.ts` is one editable array — not
magic numbers scattered across call sites:

```ts
export const ENFORCEMENT_POLICY: EnforcementTier[] = [
  { atViolationCount: 1, action: "Warning",             durationHours: null,      label: "First violation — formal warning" },
  { atViolationCount: 2, action: "MessagingRestriction", durationHours: 24,       label: "Second violation — 24-hour messaging restriction" },
  { atViolationCount: 3, action: "MessagingRestriction", durationHours: 24 * 3,   label: "Third violation — 3-day messaging restriction" },
  { atViolationCount: 4, action: "MessagingRestriction", durationHours: 24 * 7,   label: "Fourth violation — 7-day messaging restriction" },
  { atViolationCount: 5, action: "Suspension",           durationHours: 24 * 14,  label: "Fifth+ violation — account suspension pending review" },
];
```

`tierForViolationCount(count)` looks up the exact tier, or caps at the last
tier for anything beyond it. **To change enforcement durations or add
tiers, edit this array only** — nothing else needs to change.

`recordViolation()` (fires when the communication-safety filter blocks a
high-confidence message) and `adminConfirmViolation()` (fires when an admin
promotes a flagged/medium-confidence violation) both call
`tierForViolationCount()` and then `applyRestriction()` automatically, with
`createdBy: "System"` (or the confirming admin's name for the latter).

A burst of ≥3 blocked/flagged attempts from the same person within 5 minutes
(`PROBE_WINDOW_MS`/`PROBE_THRESHOLD` in `recordViolation`) is treated as a
deliberate bypass attempt and forces at least a MessagingRestriction even if
the individual tier would only be a Warning.

## Creating and resolving restrictions

- **`applyRestriction(input)`** — the only place a `RestrictionRecord` is
  ever created. Throws if `type !== "Warning"` and no `endAtMs` can be
  computed — a restriction or suspension can never be applied open-ended.
  Accepts either `durationHours` (relative to `startAtMs`) or an explicit
  `endAtMs`. Passing `supersedesId` resolves the prior record
  (`status: "Resolved"`, `resolutionReason: "Superseded by..."`) so an admin
  decision on top of an automatic interim restriction never leaves two
  "active" records. Syncs the account-status store immediately after
  (`syncAccountStatus`).
- **`resolveRestrictionNoViolation(id, actor, reason)`** — flips the record
  to `"Resolved"` **and** immediately calls `setAccountStatus(..., "Active", ...)`.
  This is the one call site that satisfies the "resolving must actually
  unlock the account, not just relabel a ticket" requirement — nothing else
  is needed after calling it.
- **`markRestrictionUnderReview(id, ticketId)`** — called when a user hits
  "Contact Internal Support". Moves status to `UnderReview` (or leaves it
  `Suspended` if the record type is a Suspension) and stores
  `appealTicketId`. Does **not** lift the restriction — only an explicit
  admin decision does that.

## How expiry works (no cron, no server)

`effectiveRestrictionStatus(record, nowMs)` compares `record.endAtMs` against
the current time and returns a **derived** copy with `status: "Expired"` if
a blocking status (`Active`/`UnderReview`/`Escalated`/`Suspended`) has passed
its end time. The stored record is never mutated — this mirrors two
existing idioms in the codebase: `offers-data.ts`'s `effectiveStatus()` and
`account-status-store.ts`'s `effectiveAccountStatus()`.

`getActiveRestriction(actorName, actorRole)` runs every stored record for
that person through `effectiveRestrictionStatus`, filters to blocking
statuses, and — defensively, for requirement "multiple active restrictions
never overlap" — tie-breaks by severity (`Suspension > MessagingRestriction
> Warning`) if more than one is somehow still live. In normal operation this
tie-break never fires because `applyRestriction`'s `supersedesId` already
resolves the prior record.

`isRestricted()` / `buildRestrictionMessage()` / the composer banner all
call `getActiveRestriction()` — there is exactly one function that decides
"is this person currently blocked," used everywhere.

**Client-side polling, not push**: since a restriction can expire purely
from wall-clock time passing with zero storage writes,
`useActiveRestriction`/`useRestrictionHistory` (`src/hooks/use-restriction.ts`)
use `useState` + `useEffect` + a 30-second `setInterval`, not
`useSyncExternalStore` (whose snapshot must return a stable reference when
nothing changed — a time-derived value can't guarantee that). This was
verified live: seeding a restriction that expires a few seconds after page
load results in the composer unlocking on its own within the next poll tick,
with zero manual action and the stored record still literally saying
`"Active"`.

## User-facing surfaces

- **`buildRestrictionMessage(actorName, actorRole)`** (`moderation-store.ts`)
  — the one place the plain-text fallback notice is built, used by
  `messages-store.ts` (`checkSendAllowed`/`checkOfferTextAllowed`),
  `classroom-shell.tsx`'s chat send, and `reviews-store.ts`'s `submitReview`.
  Always states what happened, why (via `userFacingReasonLabel`, generic on
  purpose), and the exact restoration date/time — never an indefinite
  message.
- **`MessageComposer`** (`src/components/shared/messages/message-composer.tsx`)
  — the primary surface. When `useActiveRestriction` returns a record, the
  entire input row is replaced by a rose-tinted banner (not a disabled
  input) with the same what/why/until-when/what-to-do structure, plus a
  "Contact Internal Support" button (or "View appeal status" once
  `UnderReview`). Both tutor and student inboxes get this automatically —
  they share this one component.
- **`RestrictionAppealModal`** (`src/components/shared/messages/restriction-appeal-modal.tsx`)
  — submits a real ticket via `submitSupportRequest` carrying restriction
  type, status, violation count, `createdBy`, start/end timestamps, and the
  linked case report id, then calls `markRestrictionUnderReview`. The
  confirmation screen shows the raw ticket id as the reference — there is no
  separate reference-code formatting step for this ticket type.
- **`userFacingReasonLabel(record)`** — deliberately never surfaces the raw
  admin-facing `reason` field (which can name the exact detection category).
  Only distinguishes "system-applied" (`"repeated communication policy
  violations"`) vs "admin-confirmed" (`"a confirmed communication policy
  violation"`) wording.

## Admin surfaces

**`ModerationRestrictionPanel`**
(`src/components/admin/moderation-restriction-panel.tsx`) is the one shared
management UI, embedded in three places:
- Tutor Safety tab (`tutor-full-details-client.tsx`)
- Student Safety tab (`student-full-details-client.tsx`)
- Report review, only for `type === "Message"` reports
  (`admin-report-review-client.tsx`)

It shows the current restriction (if any) with a full detail grid, plus two
actions:
- **Resolve — No Violation Found** — reason textarea, confirms via
  `resolveRestrictionNoViolation`.
- **Apply Account Action** — select Warning/MessagingRestriction/Suspension,
  a reason, and (for anything but Warning) either a preset duration
  (`RESTRICTION_DURATION_PRESETS`: 24h/3d/7d/14d/30d) or a custom start+end
  `datetime-local` pair. A live summary card
  (Action/Reason/Starts/Ends/Duration) renders before confirming, and the
  confirm button's label is dynamic (e.g. "Apply 7 days suspension"). The
  confirm button is disabled until a reason is entered and (for
  non-Warning) `endMs > startMs`.

Below that, an Enforcement History list renders every past record for that
person via `getRestrictionHistory`, newest first, including who resolved it
and why for resolved records.

This is an **additional** panel alongside the existing
`ReportResolution.accountAction` picker on the report-review page — it does
not replace or modify that field.

## Wiring into `support-data.ts`

Two additive changes only:
- `RelatedRecordType` gained `"restriction"`.
- The `"account"` support context's `categories` gained `"Appeal a messaging
  restriction or suspension"`.

## Known limitations / follow-ups

- **Restriction actions don't appear in the global admin audit log.**
  `applyRestriction`/`resolveRestrictionNoViolation` don't call
  `logAdminAction` (`src/lib/admin-audit-log.ts`), unlike most other admin
  actions in this codebase (payouts, disputes, reviews, etc.). The
  `RestrictionRecord` ledger itself is a complete audit trail for *that
  person* (`createdBy`, timestamps, `resolvedBy`, `resolutionReason`,
  `supersedesId` chain, surfaced via Enforcement History) — but an admin
  reviewing the site-wide feed at `/admin/audit-logs` will not see restriction
  events there. Add `logAdminAction(...)` calls in `applyRestriction` and
  `resolveRestrictionNoViolation` if unified visibility there is needed.
- **`RestrictionLevel`** (`"None"|"CommunicationRestricted"|"SeverelyRestricted"|"PendingTermination"`)
  is kept only for `UserSafetyProfile.restriction`'s existing display field
  and is now re-derived from the ledger — it is not a parallel state to keep
  in sync with anything.
- Duration presets for **admin-applied** actions
  (`RESTRICTION_DURATION_PRESETS`) are intentionally separate from the
  **automatic ladder's** per-tier durations (`ENFORCEMENT_POLICY`) — an
  admin reviewing a specific case can pick a shorter/longer window than the
  system default for that violation count. Keep both in sync manually if
  policy changes (e.g. adding a new preset) should apply to both.

## Files touched

| File | Change |
|---|---|
| `src/lib/moderation-store.ts` | Core rewrite — new restriction ledger, policy table, all restriction functions |
| `src/hooks/use-restriction.ts` | New — polling hooks for active restriction / history |
| `src/components/shared/messages/restriction-appeal-modal.tsx` | New — appeal flow |
| `src/components/admin/moderation-restriction-panel.tsx` | New — admin management UI |
| `src/components/shared/messages/message-composer.tsx` | Restriction banner branch, `actorEmail` prop |
| `src/lib/messages-store.ts` | Blocked-message copy now uses `buildRestrictionMessage` |
| `src/components/classroom/classroom-shell.tsx` | Same, for classroom chat |
| `src/lib/reviews-store.ts` | Same, for review submission |
| `src/lib/support-data.ts` | New `RelatedRecordType`/category for appeals |
| `src/components/admin/tutor-full-details-client.tsx` | Safety tab now embeds the panel |
| `src/components/admin/student-full-details-client.tsx` | Same |
| `src/components/admin/admin-report-review-client.tsx` | Panel embedded on Message-type reports |
| `src/components/student-dashboard/messages/student-messages-client.tsx` | Passes `actorEmail` to composer |

## Verification performed

`tsc --noEmit` clean; `eslint src/` at the pre-existing baseline (29
problems, 1 pre-existing unrelated error, 28 pre-existing warnings);
`npm test` at 123/125 passing (2 pre-existing, unrelated failures in
`booking-reference.test.ts`).

Live-verified via Playwright/Edge end-to-end:
1. Rich blocked-message banner with correct Africa/Lagos-formatted
   restoration time.
2. "Contact Internal Support" creates a real, correctly-shaped ticket and
   flips the restriction to `UnderReview`.
3. Admin panel on the Safety tab shows full restriction detail and both
   action buttons.
4. "Resolve — No Violation Found" immediately flips the restriction to
   `Resolved` and immediately restores account status to `Active` — the
   composer re-renders fully unlocked with zero restriction banner.
5. "Apply Account Action" with a Suspension + 7-day preset: summary card
   computes Starts/Ends/Duration correctly, confirm button label reads
   "Apply 7 days suspension", and confirming creates a `RestrictionRecord`
   with `status: "Suspended"` and a matching 7-day `endAtMs`, synced to
   `ensena_account_status`.
6. Automatic expiry: a restriction seeded to expire 8 seconds after page
   load unlocked the composer on its own ~30 seconds later (the hook's poll
   interval), with no reload and no admin action — while the stored record
   still read `"Active"`, confirming status is derived, not mutated.
