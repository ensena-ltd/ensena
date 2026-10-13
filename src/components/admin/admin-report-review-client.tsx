"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, Clock, FileText, Lock, MessageSquare, ShieldAlert, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ModerationRestrictionPanel } from "@/components/admin/moderation-restriction-panel";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useReports } from "@/hooks/use-reports";
import { formatBookingDisplayId, initialBookings } from "@/lib/admin-bookings-data";
import {
  reportPriorityStyles,
  reportStatusStyles,
  type Report,
} from "@/lib/admin-reports-data";
import { currentActorLabel, hasPermission } from "@/lib/admin-session";
import {
  accountActionOptions,
  categoryEmphasizesAccountAction,
  defaultAccountActionTarget,
  escalationDestinations,
  inferReportCategory,
  recommendedResolution,
  reportCategoryLabels,
  resolutionNeedsRefundDetails,
  resolutionOptionsByCategory,
  type AccountActionType,
} from "@/lib/report-resolution-taxonomy";
import { dismissReport, escalateReport, markUnderReview, resolveReport } from "@/lib/reports-store";
import { cn } from "@/lib/utils";

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function AdminReportReviewClient({ reportId }: { reportId: string }) {
  const session = useAdminSession();
  const canResolveReports = hasPermission(session, "Reports", "Resolve reports");
  const canRestrictAccounts = hasPermission(session, "Reports", "Restrict accounts");
  const canBanAccounts = hasPermission(session, "Reports", "Ban accounts");
  const canTakeAccountAction = canRestrictAccounts || canBanAccounts;

  const reports = useReports();
  const report = reports.find((r) => r.id === reportId);

  const [resolveOpen, setResolveOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve-modal draft state
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundMethod, setRefundMethod] = useState("Original payment method");
  const [refundReference, setRefundReference] = useState("");
  const [accountAction, setAccountAction] = useState<AccountActionType>("No account action");
  const [accountActionTarget, setAccountActionTarget] = useState<"Tutor" | "Student" | undefined>(undefined);
  const [notifyStudent, setNotifyStudent] = useState(true);
  const [notifyTutor, setNotifyTutor] = useState(false);
  const [studentMessage, setStudentMessage] = useState("");
  const [tutorMessage, setTutorMessage] = useState("");

  const [escalateDestination, setEscalateDestination] = useState<string>(escalationDestinations[0]);
  const [escalateNote, setEscalateNote] = useState("");
  const [dismissNote, setDismissNote] = useState("");

  const category = report ? inferReportCategory(report) : "General";
  const resolutionOptions = resolutionOptionsByCategory[category];

  // Opening the case for the first time moves it into "Under Review" — a
  // real transition, not cosmetic.
  useEffect(() => {
    if (report && report.status === "Open") markUnderReview(report.id, currentActorLabel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!report) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This report could not be found.</p>
        <Link href="/admin/reports" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Reports</Link>
      </div>
    );
  }

  const current: Report = report;
  const isClosed = current.status === "Resolved" || current.status === "Dismissed";
  const sourceBooking = current.bookingId ? initialBookings.find((b) => b.id === current.bookingId) : undefined;
  const relatedRecordLabel = current.type === "Group Class" ? "Related Group Class" : current.type === "Lesson Quality" ? "Related Lesson" : "Related Booking";
  const needsRefundDetails = resolutionNeedsRefundDetails(outcome);
  const isSignificant = needsRefundDetails || accountAction !== "No account action";

  function openResolve() {
    const recommended = recommendedResolution(category);
    setOutcome(recommended);
    setNote("");
    setOriginalAmount("");
    setRefundAmount("");
    setRefundReference("");
    setAccountAction("No account action");
    setAccountActionTarget(defaultAccountActionTarget(current.type));
    setNotifyStudent(current.reporterRole === "Student" || current.type !== "Tutor");
    setNotifyTutor(current.reporterRole === "Tutor" || current.type === "Tutor");
    setStudentMessage(`Your report has been reviewed. ${recommended}.`);
    setTutorMessage(`This report concerning you has been reviewed. ${recommended}.`);
    setResolveOpen(true);
  }

  function confirmResolve() {
    if (isSignificant && !note.trim()) {
      flash("Please add an admin note explaining this decision before resolving.");
      return;
    }
    resolveReport(current.id, currentActorLabel(), {
      outcome,
      note: note.trim() || "No note provided.",
      originalAmount: needsRefundDetails && originalAmount ? Number(originalAmount) : undefined,
      refundAmount: needsRefundDetails && refundAmount ? Number(refundAmount) : undefined,
      remainingAmount: needsRefundDetails && originalAmount && refundAmount ? Math.max(0, Number(originalAmount) - Number(refundAmount)) : undefined,
      refundMethod: needsRefundDetails ? refundMethod : undefined,
      refundReference: needsRefundDetails && refundReference.trim() ? refundReference.trim() : undefined,
      accountAction,
      accountActionTarget: accountAction !== "No account action" ? accountActionTarget : undefined,
      notifyStudent,
      notifyTutor,
      studentMessage: notifyStudent ? studentMessage.trim() : undefined,
      tutorMessage: notifyTutor ? tutorMessage.trim() : undefined,
    });
    setResolveOpen(false);
    flash("Report resolved.");
  }

  function confirmEscalate() {
    escalateReport(current.id, currentActorLabel(), escalateDestination, escalateNote);
    setEscalateOpen(false);
    setEscalateNote("");
    flash(`Escalated to ${escalateDestination}.`);
  }

  function confirmDismiss() {
    dismissReport(current.id, currentActorLabel(), dismissNote);
    setDismissOpen(false);
    setDismissNote("");
    flash("Report dismissed.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/reports" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Reports
        </Link>
      </div>

      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">Report {current.id}</h1>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", reportStatusStyles[current.status])}><span className="size-1.5 rounded-full bg-current" /> {current.status}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", reportPriorityStyles[current.priority])}>{current.priority} Priority</span>
          <span className="rounded-full bg-ensena-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ensena-muted">{reportCategoryLabels[category]}</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Reported</p>
            <div className="mt-2 flex items-center gap-2.5">
              {current.reportedImage && <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={current.reportedImage} alt={current.reportedName} fill sizes="36px" className="object-cover" /></span>}
              <p className="truncate text-sm font-semibold text-ensena-ink">{current.reportedName}</p>
            </div>
            {current.reportedRole && <p className="mt-1 text-xs text-ensena-muted">{current.reportedRole}</p>}
            {current.reportedUserId && (
              <Link href={`/admin/users/usr-${current.reportedUserId}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Profile</Link>
            )}
          </div>

          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Reported By</p>
            <p className="mt-2 text-sm font-semibold text-ensena-ink">{current.reporterName}</p>
            <p className="text-xs text-ensena-muted">{current.reporterRole}</p>
          </div>

          <div className="rounded-xl bg-ensena-bg-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Report Type</p>
            <p className="mt-2 text-sm font-semibold text-ensena-ink">{current.type}</p>
            <p className="text-xs text-ensena-muted">Submitted {current.submittedLabel}</p>
          </div>

          <div className="rounded-xl bg-ensena-bg-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Reason</p>
            <p className="mt-2 text-sm font-semibold text-ensena-ink">{current.reason}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Card title="Description" icon={FileText}>
            <p className="mt-2 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">&ldquo;{current.description}&rdquo;</p>
          </Card>

          {current.type === "Message" && (current.reportedRole === "Student" || current.reportedRole === "Tutor") && (
            <Card title="Messaging Restriction" icon={ShieldAlert}>
              <div className="mt-2">
                <ModerationRestrictionPanel actorName={current.reportedName} actorRole={current.reportedRole} />
              </div>
            </Card>
          )}

          {sourceBooking && (
            <Card title={relatedRecordLabel} icon={MessageSquare}>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                <div>
                  <Link href={`/admin/bookings/${sourceBooking.id}`} className="font-mono text-sm font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(sourceBooking.id)}</Link>
                  <p className="text-xs text-ensena-muted">{sourceBooking.type} · {sourceBooking.subject}</p>
                </div>
                <Link href={`/admin/bookings/${sourceBooking.id}`} className="inline-flex h-8 items-center justify-center rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Booking</Link>
              </div>
            </Card>
          )}

          {current.escalation && (
            <Card title="Escalation" icon={ShieldAlert}>
              <span className="mt-2 inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">{current.escalation.destination}</span>
              {current.escalation.note && <p className="mt-2 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">{current.escalation.note}</p>}
              <p className="mt-2 text-xs text-ensena-muted">Escalated by {current.escalation.escalatedBy} · {current.escalation.escalatedAtLabel}</p>
            </Card>
          )}

          {isClosed && current.resolution && (
            <Card title="Resolution Summary" icon={ShieldAlert}>
              <p className={cn("mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", current.status === "Dismissed" ? "bg-ensena-bg-soft text-ensena-muted" : "bg-emerald-100 text-emerald-700")}>{current.status}</p>
              <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ensena-muted">Resolution</dt><dd className="font-medium text-ensena-ink">{current.resolution.outcome}</dd></div>
                {current.resolution.refundAmount !== undefined && (
                  <>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Original amount</dt><dd className="font-medium text-ensena-ink">₦{(current.resolution.originalAmount ?? 0).toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Refund amount</dt><dd className="font-medium text-ensena-ink">₦{current.resolution.refundAmount.toLocaleString()}</dd></div>
                    <div className="flex justify-between"><dt className="text-ensena-muted">Remaining</dt><dd className="font-medium text-ensena-ink">₦{(current.resolution.remainingAmount ?? 0).toLocaleString()}</dd></div>
                    {current.resolution.refundReference && <div className="flex justify-between"><dt className="text-ensena-muted">Refund reference</dt><dd className="font-mono font-medium text-ensena-ink">{current.resolution.refundReference}</dd></div>}
                  </>
                )}
                <div className="flex justify-between"><dt className="text-ensena-muted">Resolved by</dt><dd className="font-medium text-ensena-ink">{current.resolution.resolvedBy}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Resolved</dt><dd className="font-medium text-ensena-ink">{current.resolution.resolvedAtLabel}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Student notified</dt><dd className="font-medium text-ensena-ink">{current.resolution.notifyStudent ? "Yes" : "No"}</dd></div>
                <div className="flex justify-between"><dt className="text-ensena-muted">Tutor notified</dt><dd className="font-medium text-ensena-ink">{current.resolution.notifyTutor ? "Yes" : "No"}</dd></div>
              </dl>
              <p className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">{current.resolution.note}</p>
              {current.resolution.accountAction !== "No account action" && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Account Action (separate decision)</p>
                  <p className="mt-1 text-sm font-medium text-amber-800">{current.resolution.accountAction}{current.resolution.accountActionTarget ? `: ${current.resolution.accountActionTarget}` : ""}</p>
                </div>
              )}
            </Card>
          )}

          <Card title="Case Timeline" icon={Clock}>
            <ul className="mt-2 flex flex-col gap-2 text-sm">
              {current.timeline.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 border-b border-ensena-border pb-2 last:border-0 last:pb-0">
                  <span className="text-ensena-ink">{t.label}</span>
                  <span className="shrink-0 text-xs text-ensena-muted">{t.atLabel}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Admin Actions" icon={Lock}>
            {!isClosed ? (
              canResolveReports ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <Button onClick={openResolve} className="h-9 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                    <CheckCircle2 className="size-3.5" /> Resolve Case
                  </Button>
                  <Button variant="outline" onClick={() => setEscalateOpen(true)} className="h-9 rounded-full border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                    Escalate
                  </Button>
                  <Button variant="outline" onClick={() => setDismissOpen(true)} className="h-9 rounded-full border-ensena-border text-xs font-medium">
                    Dismiss
                  </Button>
                  {current.status !== "Open" && current.status !== "Under Review" && (
                    <p className="mt-1 text-xs text-ensena-muted">Status: {current.status}</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-ensena-muted">Your role doesn&apos;t have permission to act on this report.</p>
              )
            ) : (
              <p className="mt-2 text-sm text-ensena-muted">This report has been {current.status.toLowerCase()}. No further action needed.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Resolve Case modal — the primary decision is "how was the
          reporter's problem resolved"; Account Action is a visually and
          semantically separate section that only matters when the admin
          opts into it. */}
      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve Case" widthClassName="max-w-lg">
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Report</p>
            <p className="font-medium text-ensena-ink">{current.reason}</p>
          </div>

          <div className="rounded-xl border border-ensena-primary/30 bg-ensena-primary/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">Recommended resolution</p>
            <p className="mt-0.5 font-medium text-ensena-ink">{recommendedResolution(category)}</p>
            <p className="mt-1 text-xs text-ensena-muted">Based on this report&apos;s category ({reportCategoryLabels[category]}). You choose the final resolution below.</p>
          </div>

          <div>
            <p className="text-xs font-medium text-ensena-muted">Resolution</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {resolutionOptions.map((o) => (
                <label key={o} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <input type="radio" name="reportOutcome" checked={outcome === o} onChange={() => setOutcome(o)} /> {o}
                </label>
              ))}
            </div>
          </div>

          {needsRefundDetails && (
            <div className="flex flex-col gap-2 rounded-xl border border-ensena-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Refund details</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-ensena-muted">
                  Original amount (₦)
                  <input type="number" min="0" value={originalAmount} onChange={(e) => setOriginalAmount(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ensena-muted">
                  Refund amount (₦)
                  <input type="number" min="0" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink" />
                </label>
              </div>
              {originalAmount && refundAmount && (
                <p className="text-xs text-ensena-muted">Remaining: ₦{Math.max(0, Number(originalAmount) - Number(refundAmount)).toLocaleString()}</p>
              )}
              <label className="flex flex-col gap-1 text-xs text-ensena-muted">
                Refund method
                <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink">
                  <option>Original payment method</option>
                  <option>Wallet credit</option>
                  <option>Bank transfer</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-ensena-muted">
                Refund / reference ID (optional)
                <input value={refundReference} onChange={(e) => setRefundReference(e.target.value)} placeholder="e.g. RF-10432" className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink" />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ensena-muted">Admin note{isSignificant ? " (required)" : ""}</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Document what you reviewed, your decision, and any follow-up action." className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </label>

          <div className="flex flex-col gap-2 rounded-xl border border-ensena-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Communication</p>
            <label className="flex items-center gap-2 text-sm text-ensena-ink">
              <input type="checkbox" checked={notifyStudent} onChange={(e) => setNotifyStudent(e.target.checked)} /> Notify student
            </label>
            {notifyStudent && (
              <textarea value={studentMessage} onChange={(e) => setStudentMessage(e.target.value)} rows={2} className="rounded-lg border border-ensena-border p-2 text-xs text-ensena-ink" />
            )}
            <label className="flex items-center gap-2 text-sm text-ensena-ink">
              <input type="checkbox" checked={notifyTutor} onChange={(e) => setNotifyTutor(e.target.checked)} /> Notify tutor
            </label>
            {notifyTutor && (
              <textarea value={tutorMessage} onChange={(e) => setTutorMessage(e.target.value)} rows={2} className="rounded-lg border border-ensena-border p-2 text-xs text-ensena-ink" />
            )}
          </div>

          {/* Account Action — a deliberately separate decision from the
              resolution above. Auto-expanded for categories where it's
              actually likely relevant; always available for any category
              since an admin may find something the category guess missed. */}
          <div className={cn("flex flex-col gap-2 rounded-xl border p-3", categoryEmphasizesAccountAction(category) ? "border-amber-200 bg-amber-50" : "border-ensena-border")}>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Account action (separate from the resolution above)</p>
            <p className="text-xs text-ensena-muted">Only choose this if the incident involves misconduct, a policy violation, or a repeated pattern. Not for ordinary service issues.</p>
            {canTakeAccountAction ? (
              <select value={accountAction} onChange={(e) => setAccountAction(e.target.value as AccountActionType)} className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink">
                {accountActionOptions.map((a) => <option key={a}>{a}</option>)}
              </select>
            ) : (
              <p className="text-xs text-ensena-muted">Your role doesn&apos;t have permission to take account action.</p>
            )}
            {canTakeAccountAction && accountAction !== "No account action" && (
              <select value={accountActionTarget ?? ""} onChange={(e) => setAccountActionTarget(e.target.value as "Tutor" | "Student")} className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm text-ensena-ink">
                <option value="" disabled>Applies to…</option>
                <option value="Tutor">Tutor</option>
                <option value="Student">Student</option>
              </select>
            )}
          </div>

          <Button onClick={confirmResolve} disabled={!outcome} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-50">Resolve Case</Button>
        </div>
      </Modal>

      <Modal open={escalateOpen} onClose={() => setEscalateOpen(false)} title="Escalate Case">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Use this when the case can&apos;t be resolved immediately and needs a specialist review.</p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Escalate to</span>
            <select value={escalateDestination} onChange={(e) => setEscalateDestination(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {escalationDestinations.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Note</span>
            <textarea value={escalateNote} onChange={(e) => setEscalateNote(e.target.value)} rows={3} placeholder="What does the specialist team need to know?" className="rounded-xl border border-ensena-border p-3 text-sm" />
          </label>
          <Button onClick={confirmEscalate} className="h-10 w-full rounded-full bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">Escalate Case</Button>
        </div>
      </Modal>

      <Modal open={dismissOpen} onClose={() => setDismissOpen(false)} title="Dismiss Report">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Use this when, after review, no resolution or account action is needed.</p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Note</span>
            <textarea value={dismissNote} onChange={(e) => setDismissNote(e.target.value)} rows={3} placeholder="Why is this being dismissed?" className="rounded-xl border border-ensena-border p-3 text-sm" />
          </label>
          <Button variant="outline" onClick={confirmDismiss} className="h-10 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">Dismiss Report</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
