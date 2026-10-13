// Real, persisted Reports & Issues — localStorage-backed, same idiom as
// support-store.ts. Previously admin-reports-data.ts's `initialReports` was
// read straight into a component's local useState, so any resolution/
// dismissal/escalation vanished on reload; this is the one place a report
// is transitioned, and every admin surface reads from here so a change is
// immediately visible everywhere and survives refresh.
//
// Seed + real-delta merge (see getMerged below), same as support-store.ts —
// NOT a whole-array snapshot. The previous version of this file stored the
// entire reports array (seed included) verbatim on first write, which meant
// a browser that had already used the app once would keep showing whatever
// admin-reports-data.ts looked like AT THAT TIME forever: a later code fix
// to a seed report (e.g. its id format) would never reach that browser
// without manually clearing localStorage. Storing only the real delta and
// re-merging it onto the CURRENT seed on every read means a seed-data fix
// in code reaches every browser on the next load, exactly like every other
// store in this app.
import { logAdminAction } from "@/lib/admin-audit-log";
import { initialReports, type Report, type ReportEscalation, type ReportPriority, type ReportResolution, type ReportType } from "@/lib/admin-reports-data";
import { issueOrGetReferenceCode } from "@/lib/reference-code-store";

const REPORTS_KEY = "ensena_reports";
export const REPORTS_EVENT = "ensena:reports-changed";

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

const EMPTY: Report[] = [];
const readRawStored = makeCachedReader<Report[]>(REPORTS_KEY, EMPTY);

function writeJson(value: Report[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(REPORTS_EVENT));
}

// A real report created before the RPT-reference-code fix still carries its
// original rep-<timestamp>-<random> id (from the old createReport()) in
// localStorage — code changes don't retroactively rewrite already-persisted
// browser data.
const LEGACY_RANDOM_ID_FORMAT = /^rep-\d+-/;

// A DIFFERENT legacy shape: plain "rep-1".."rep-9", with no second segment.
// These were never independently-created reports — they only exist because
// an even older version of this store wrote its ENTIRE array (seed
// included) to localStorage on any admin action, back when the seed's own
// ids were still "rep-1".."rep-9". That stale full-array copy is why a
// browser that used the app back then still has a "rep-1" entry sitting in
// real storage today: without this, getMerged() below has no way to know
// "rep-1" and the current seed's RPTB2CNHDC are the same underlying report,
// so it shows both side by side as if they were two different cases. Since
// this shape only ever came from a positional copy of initialReports (see
// admin-reports-data.ts), "rep-N" maps back onto the Nth seed report there —
// same mapping this app's seed ids were computed from in the first place.
const LEGACY_SEED_POSITION_FORMAT = /^rep-(\d+)$/;

// issueOrGetReferenceCode is idempotent (keyed on the old id, in its own
// separate registry — see reference-code-store.ts), so re-deriving either
// migration on every read is safe and cheap, and deliberately never writes
// back to REPORTS_KEY itself: a getSnapshot function (this feeds
// useSyncExternalStore via use-reports.ts) must stay a pure read, the same
// reason support-store.ts's normalize() never persists either. The old id
// is preserved as `legacyId` so anything that already stored it (e.g.
// ModerationViolation.reportId) still resolves via getReport().
function migrateLegacyId(report: Report): Report {
  if (report.legacyId) return report;

  const positionMatch = report.id.match(LEGACY_SEED_POSITION_FORMAT);
  if (positionMatch) {
    const seedReport = initialReports[Number(positionMatch[1]) - 1];
    if (seedReport) return { ...report, legacyId: report.id, id: seedReport.id };
  }

  if (LEGACY_RANDOM_ID_FORMAT.test(report.id) || positionMatch) {
    const newId = issueOrGetReferenceCode("report", report.id);
    return { ...report, legacyId: report.id, id: newId };
  }

  return report;
}

// Cached on the underlying stored reference (itself already stable) so
// repeated calls between actual writes return the identical migrated array
// instance — same stability requirement as getMerged() below.
let cachedStoredRaw: Report[] | null = null;
let cachedMigrated: Report[] = EMPTY;
function readRaw(): Report[] {
  const stored = readRawStored();
  if (stored !== cachedStoredRaw) {
    cachedStoredRaw = stored;
    cachedMigrated = stored.map(migrateLegacyId);
  }
  return cachedMigrated;
}

// Cached on the real array's own (already-stable) reference so repeated
// calls between actual writes return the identical merged array instance —
// required for useSyncExternalStore (see use-reports.ts): a fresh array on
// every call, even with identical contents, causes React to think the store
// changed on every render and re-render in a loop.
let cachedReal: Report[] | null = null;
let cachedMerged: Report[] = initialReports;

function getMerged(): Report[] {
  const real = readRaw();
  if (real !== cachedReal) {
    cachedReal = real;
    const overridden = new Set(real.map((r) => r.id));
    cachedMerged = [...initialReports.filter((r) => !overridden.has(r.id)), ...real];
  }
  return cachedMerged;
}

export function getReports(): Report[] {
  return getMerged();
}

export function getReport(id: string): Report | undefined {
  return getMerged().find((r) => r.id === id || r.legacyId === id);
}

function nowLabel(): string {
  return new Date().toLocaleString();
}

function withTimeline(report: Report, label: string): Report {
  return { ...report, timeline: [...report.timeline, { label, atLabel: nowLabel() }] };
}

// A seed report has no entry in real storage until an admin action touches
// it — this materializes it there (with the patch applied) instead of
// silently dropping the mutation, so seed rows are just as editable as
// freshly-created ones. Same pattern as support-store.ts's updateRequest.
function updateReport(id: string, fn: (r: Report) => Report): void {
  const report = getReport(id);
  if (!report) return;
  const updated = fn(report);
  const real = readRaw();
  const next = real.some((r) => r.id === report.id) ? real.map((r) => (r.id === report.id ? updated : r)) : [...real, updated];
  writeJson(next);
}

// Opening a case for the first time moves it out of "Open" — a lightweight,
// real status transition (previously "Under Review" was a dead status
// nothing ever entered).
export function markUnderReview(id: string, actor: string): void {
  updateReport(id, (r) => (r.status === "Open" ? withTimeline({ ...r, status: "Under Review" }, "Admin opened case") : r));
}

export type ResolveReportInput = Omit<ReportResolution, "resolvedBy" | "resolvedAtLabel">;

// The one place a report is actually resolved. `outcome` answers "how was
// the reporter's problem resolved"; `accountAction` is a completely
// separate decision and defaults to "No account action" — resolving a
// report never implies any account was touched unless the admin
// explicitly chose to.
export function resolveReport(id: string, actor: string, input: ResolveReportInput): void {
  const report = getReport(id);
  if (!report) return;
  const resolution: ReportResolution = { ...input, resolvedBy: actor, resolvedAtLabel: nowLabel() };
  updateReport(id, (r) => {
    let next = withTimeline({ ...r, status: "Resolved", resolution }, `Case resolved: ${resolution.outcome}`);
    if (resolution.accountAction !== "No account action") {
      next = withTimeline(next, `Account action: ${resolution.accountAction}${resolution.accountActionTarget ? ` (${resolution.accountActionTarget})` : ""}`);
    }
    if (resolution.notifyStudent) next = withTimeline(next, "Student notified");
    if (resolution.notifyTutor) next = withTimeline(next, "Tutor notified");
    return next;
  });
  logAdminAction(`Report resolved: ${resolution.outcome}`, actor, `${report.reportedName}: ${report.reason}${resolution.accountAction !== "No account action" ? `. Account action: ${resolution.accountAction}` : ""}`);
}

export function dismissReport(id: string, actor: string, note: string): void {
  const report = getReport(id);
  if (!report) return;
  const resolution: ReportResolution = {
    outcome: "Dismissed without further action",
    note: note.trim() || "No note provided.",
    accountAction: "No account action",
    notifyStudent: false,
    notifyTutor: false,
    resolvedBy: actor,
    resolvedAtLabel: nowLabel(),
  };
  updateReport(id, (r) => withTimeline({ ...r, status: "Dismissed", resolution }, "Case dismissed"));
  logAdminAction("Dismissed report", actor, `${report.reportedName}: ${report.reason}`);
}

export function escalateReport(id: string, actor: string, destination: string, note: string): void {
  const report = getReport(id);
  if (!report) return;
  const escalation: ReportEscalation = { destination, note: note.trim(), escalatedBy: actor, escalatedAtLabel: nowLabel() };
  updateReport(id, (r) => withTimeline({ ...r, status: "Escalated", escalation }, `Escalated to ${destination}`));
  logAdminAction("Escalated report", actor, `${report.reportedName}: ${report.reason} → ${destination}`);
}

export function requestInformation(id: string, actor: string, from: "Student" | "Tutor", note: string): void {
  const report = getReport(id);
  if (!report) return;
  updateReport(id, (r) => withTimeline({ ...r, status: "Awaiting Information" }, `Requested more information from ${from}${note ? `: ${note}` : ""}`));
  logAdminAction("Requested more information", actor, `${report.reportedName}: from ${from}`);
}

export interface CreateReportInput {
  type: ReportType;
  reportedName: string;
  reportedRole?: string;
  reportedImage?: string;
  reportedUserId?: string;
  reporterName: string;
  reporterRole: "Student" | "Tutor" | "Admin";
  reason: string;
  description: string;
  priority: ReportPriority;
  bookingId?: string;
  communityPostId?: string;
  communityCommentId?: string;
}

// The one place a NEW report/case is created at runtime — previously
// admin-reports-data.ts's `initialReports` was a fixed, never-appended-to
// seed array; nothing in the app (a student, a tutor, or a system process
// like the communication-safety engine) could actually raise a new case.
// Every system-generated case (e.g. a confirmed off-platform communication
// violation — see moderation-store.ts) goes through this function so it
// shows up in the same Admin Reports queue as a human-submitted report.
//
// The report's `id` is a real, routable RPT-prefixed reference code minted
// via reference-code-store.ts — the same code shown to admins and the code
// /admin/reports/[reportId] looks the report up by, with nothing in
// between. This is what fixes reports that used to 404 on Review: their
// internal id and their on-screen id used to be two different values.
export function createReport(input: CreateReportInput): Report {
  const now = Date.now();
  const submittedLabel = new Date(now).toLocaleString();
  const internalId = `report-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const report: Report = {
    id: issueOrGetReferenceCode("report", internalId),
    ...input,
    status: "Open",
    submittedLabel,
    timeline: [{ label: "Report submitted", atLabel: submittedLabel }],
  };
  writeJson([report, ...readRaw()]);
  logAdminAction("New report created", input.reporterName, `${input.reportedName}: ${input.reason}`);
  return report;
}

export function subscribeReports(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REPORTS_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(REPORTS_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
