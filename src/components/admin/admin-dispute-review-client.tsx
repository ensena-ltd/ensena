"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Flag,
  Lock,
  Mail,
  MessageSquare,
  Shield,
  Star,
  User,
} from "lucide-react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { Button } from "@/components/ui/button";
import { initialAdminStudents, initialAdminTutors } from "@/lib/admin-data";
import { formatBookingDisplayId, initialBookings } from "@/lib/admin-bookings-data";
import { splitEarnings } from "@/lib/commission";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useTutorRating } from "@/hooks/use-reviews";
import {
  disputePriorityStyles,
  disputeStatusStyles,
  formatDisputeDisplayId,
  groupSessionSummary,
  type DisputeOutcome,
  type LessonConfirmation,
} from "@/lib/escrow-release";
import { formatNaira } from "@/lib/format";
import { useAdminSession } from "@/hooks/use-admin-session";
import { currentActorLabel, hasPermission } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

function Card({ title, icon: Icon, action, children }: { title: string; icon?: typeof Shield; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
          {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function EvidenceItem({ label, available }: { label: string; available: boolean }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {available ? <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> : <Circle className="size-4 shrink-0 text-ensena-border" />}
      <span className={available ? "text-ensena-ink" : "text-ensena-muted"}>{label}</span>
    </li>
  );
}

export function AdminDisputeReviewClient({ disputeId }: { disputeId: string }) {
  const session = useAdminSession();
  const canResolveDisputes = hasPermission(session, "Payments", "Resolve disputes");
  const { lessons, requestTutorResponse, submitTutorResponse, resolveDispute, markSessionTutorAbsent } = useLessonConfirmations();
  const dispute = lessons.find((l) => l.id === disputeId);
  const sourceTutor = dispute ? initialAdminTutors.find((t) => t.name === dispute.tutor) : undefined;

  const [outcome, setOutcome] = useState<DisputeOutcome>("Release");
  const [refundToStudent, setRefundToStudent] = useState(0);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [msgTarget, setMsgTarget] = useState<{ name: string; role: "Student" | "Tutor" } | null>(null);
  const rating = useTutorRating(sourceTutor?.name ?? "", sourceTutor?.rating ?? 0, sourceTutor?.reviews ?? 0);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!dispute) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This dispute could not be found.</p>
        <Link href="/admin/disputes" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Disputes</Link>
      </div>
    );
  }

  const current: LessonConfirmation = dispute;
  const displayId = formatDisputeDisplayId(current.id, current.disputeReferenceCode);
  const status = current.disputeStatus ?? "New";
  const priority = current.disputePriority ?? "Low";
  const split = splitEarnings(current.amountGross);
  const isClosed = status === "Resolved" || status === "Dismissed";

  const sourceBooking = current.bookingId ? initialBookings.find((b) => b.id === current.bookingId) : undefined;
  const sourceStudent = initialAdminStudents.find((s) => s.name === current.student);

  const maxRefund = Math.max(0, current.amountGross - split.commission);
  const computedTutorAmount = Math.max(0, maxRefund - refundToStudent);

  const complaint = current.disputeDetails ?? current.complaintDetails ?? "";
  const reason = current.disputeReason ?? current.complaintReason ?? current.tutorReportedIssue ?? (current.tutorAbsent ? "Tutor did not attend" : "—");

  const evidenceAvailable = [
    { label: "Virtual classroom session data", available: Boolean(current.scheduledLabel) },
    { label: "Attendance", available: Boolean(current.tutorJoinedLabel || current.studentJoinedLabel || current.attendance) },
    { label: "Session duration", available: Boolean(current.recordedDurationMinutes || current.attendance) },
    { label: "Booking details", available: Boolean(current.bookingId) },
    { label: "Payment record", available: true },
    { label: "Student complaint", available: Boolean(complaint) },
    { label: "Tutor response", available: Boolean(current.tutorResponse) },
  ];

  const timeline = [
    { label: "Lesson Completed", time: current.completedAtLabel, done: true },
    { label: "Student Reported Problem", time: current.disputeSubmittedLabel, done: Boolean(current.disputeSubmittedLabel) },
    { label: "Tutor Notified", time: current.disputeSubmittedLabel, done: Boolean(current.disputeSubmittedLabel) },
    { label: "Tutor Responded", time: current.tutorResponseAtLabel, done: Boolean(current.tutorResponse) },
    { label: isClosed ? "Dispute Resolved" : "Under Review", time: current.resolution?.resolvedAtLabel, done: isClosed },
  ].filter((step) => step.time || step.label === (isClosed ? "Dispute Resolved" : "Under Review"));

  function handleRequestResponse() {
    requestTutorResponse(current.id, currentActorLabel());
    flash("Response requested. Tutor has been notified.");
  }

  function handleSimulateTutorResponse() {
    submitTutorResponse(current.id, current.tutor, "I extended the session after resolving a technical issue on my end.");
    flash("Tutor response received.");
  }

  const groupSummary = current.type === "Group" && current.sessionId ? groupSessionSummary(lessons, current.sessionId) : null;

  function handleMarkTutorAbsent() {
    if (!current.sessionId) return;
    markSessionTutorAbsent(current.sessionId, currentActorLabel());
    flash("Session marked Tutor Absent. Every student's allocation for this session is now held for review.");
  }

  function handleResolve() {
    resolveDispute(current.id, currentActorLabel(), outcome, note.trim() || "No note provided.", outcome === "Partial" ? refundToStudent : undefined);
    flash(outcome === "Dismiss" ? "Dispute dismissed." : "Dispute resolved.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/disputes" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Disputes
        </Link>
      </div>

      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">Dispute {displayId}</h1>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", disputeStatusStyles[status])}><span className="size-1.5 rounded-full bg-current" /> {status}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", disputePriorityStyles[priority])}>{priority} Priority</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Related Booking</p>
            {sourceBooking ? (
              <>
                <Link href={`/admin/bookings/${sourceBooking.id}`} className="mt-1.5 flex items-center gap-1 font-mono text-sm font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(sourceBooking.id)}</Link>
                <p className="mt-1 text-sm text-ensena-ink">{sourceBooking.type}</p>
                <p className="text-xs text-ensena-muted">{sourceBooking.subject}</p>
                <p className="mt-1 text-xs text-ensena-muted">{sourceBooking.date} · {sourceBooking.time}</p>
              </>
            ) : (
              <>
                <p className="mt-1.5 text-sm text-ensena-ink">{current.subject}</p>
                <p className="text-xs text-ensena-muted">{current.type} Lesson</p>
                {current.scheduledLabel && <p className="mt-1 text-xs text-ensena-muted">{current.scheduledLabel}</p>}
              </>
            )}
          </div>

          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student (Reporter)</p>
            <div className="mt-2 flex items-center gap-2.5">
              {sourceBooking?.studentImage && <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={sourceBooking.studentImage} alt={current.student} fill sizes="36px" className="object-cover" /></span>}
              <p className="truncate text-sm font-semibold text-ensena-ink">{current.student}</p>
            </div>
            {sourceStudent && <p className="mt-1 text-xs text-ensena-muted">{sourceStudent.level} Student</p>}
            {sourceStudent && (
              <Link href={`/admin/users/usr-${sourceStudent.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Student Profile</Link>
            )}
          </div>

          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Tutor (Reported)</p>
            <div className="mt-2 flex items-center gap-2.5">
              {sourceBooking?.tutorImage && <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={sourceBooking.tutorImage} alt={current.tutor} fill sizes="36px" className="object-cover" /></span>}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{current.tutor}</p>
                {sourceTutor && rating.rating > 0 && <p className="flex items-center gap-1 text-xs text-ensena-muted"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews})</p>}
              </div>
            </div>
            {sourceTutor?.verification === "Verified" && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ensena-success"><CheckCircle2 className="size-3" /> Verified</p>}
            {sourceTutor && (
              <Link href={`/admin/users/usr-${sourceTutor.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Tutor Profile</Link>
            )}
          </div>

          <div className="rounded-xl bg-ensena-bg-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Dispute Summary</p>
            <dl className="mt-2 flex flex-col gap-1">
              <InfoRow label="Reason" value={reason} />
              <InfoRow label="Submitted" value={current.disputeSubmittedLabel ?? "—"} />
              <InfoRow label="Status" value={status} />
              <InfoRow label="Priority" value={priority} />
            </dl>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4">
          <Card title="Complaint Details" icon={Flag}>
            <p className="mt-2 text-xs font-semibold text-ensena-ink">Student&apos;s Complaint</p>
            <p className="mt-1 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">&ldquo;{complaint || "No complaint text provided."}&rdquo;</p>
            {current.disputeAdditionalNotes && (
              <>
                <p className="mt-3 text-xs font-semibold text-ensena-ink">Additional Notes (Student)</p>
                <p className="mt-1 text-sm text-ensena-muted">{current.disputeAdditionalNotes}</p>
              </>
            )}
          </Card>

          <Card title="Tutor Response" icon={MessageSquare}>
            {current.tutorResponse ? (
              <>
                <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Responded</span>
                <p className="mt-2 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">&ldquo;{current.tutorResponse}&rdquo;</p>
                <p className="mt-1.5 text-xs text-ensena-muted">Responded on {current.tutorResponseAtLabel}</p>
              </>
            ) : status === "Awaiting Response" ? (
              <>
                <span className="mt-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Awaiting response</span>
                <p className="mt-2 text-sm text-ensena-muted">The tutor has been notified and asked to explain their side.</p>
                <button type="button" onClick={handleSimulateTutorResponse} className="mt-2 text-[11px] font-medium text-ensena-muted underline decoration-dotted">⚙ Demo: simulate tutor response</button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ensena-muted">The tutor hasn&apos;t been asked for a response yet.</p>
                {!isClosed && <Button onClick={handleRequestResponse} className="mt-3 h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">Request Response</Button>}
              </>
            )}
          </Card>

          <Card title="Communication" icon={Mail}>
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-3">
                <div>
                  <p className="text-sm font-medium text-ensena-ink">Student</p>
                  <p className="text-xs text-ensena-muted">Send a message to {current.student}</p>
                </div>
                <Button variant="outline" onClick={() => setMsgTarget({ name: current.student, role: "Student" })} className="h-8 shrink-0 rounded-full border-ensena-border px-3 text-xs font-medium">Message Student</Button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-3">
                <div>
                  <p className="text-sm font-medium text-ensena-ink">Tutor</p>
                  <p className="text-xs text-ensena-muted">Send a message to {current.tutor}</p>
                </div>
                <Button variant="outline" onClick={() => setMsgTarget({ name: current.tutor, role: "Tutor" })} className="h-8 shrink-0 rounded-full border-ensena-border px-3 text-xs font-medium">Message Tutor</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Session Evidence" icon={Shield}>
            {current.scheduledLabel ? (
              <>
                <p className="mt-2 text-xs font-semibold text-ensena-ink">Session Record</p>
                <dl className="mt-1 flex flex-col divide-y divide-ensena-border">
                  <InfoRow label="Scheduled" value={`${current.scheduledLabel}${current.scheduledDurationMinutes ? ` (${current.scheduledDurationMinutes} min)` : ""}`} />
                  {current.tutorJoinedLabel && <InfoRow label="Tutor joined" value={current.tutorJoinedLabel} />}
                  {current.studentJoinedLabel && <InfoRow label="Student joined" value={current.studentJoinedLabel} />}
                  {current.sessionEndedLabel && <InfoRow label="Session ended" value={current.sessionEndedLabel} />}
                  {current.recordedDurationMinutes !== undefined && <InfoRow label="Recorded duration" value={`${current.recordedDurationMinutes} minutes`} />}
                </dl>
                {current.recordedDurationMinutes !== undefined && current.scheduledDurationMinutes !== undefined && current.recordedDurationMinutes < current.scheduledDurationMinutes && (
                  <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700"><AlertTriangle className="size-3.5" /> Session significantly shorter than scheduled</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-ensena-muted">No classroom session record available for this dispute.</p>
            )}

            {current.attendance && (
              <>
                <p className="mt-3 text-xs font-semibold text-ensena-ink">{groupSummary ? "This Student's Attendance" : "Attendance"}</p>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-ensena-muted">Attended</p><p className="font-medium text-ensena-ink">{current.attendance.attendedMinutes}/{current.attendance.classDurationMinutes}m ({current.attendance.attendancePct}%)</p></div>
                  <div><p className="text-ensena-muted">Status</p><p className={cn("font-medium", current.attendance.present ? "text-ensena-success" : "text-rose-600")}>{current.attendance.present ? "Present" : "Absent"}</p></div>
                </div>
              </>
            )}

            {groupSummary && (
              <>
                <p className="mt-3 text-xs font-semibold text-ensena-ink">Whole-Class Attendance</p>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-ensena-muted">Attendance</p><p className="font-medium text-ensena-ink">{groupSummary.presentCount} / {groupSummary.totalStudents} students</p></div>
                  <div><p className="text-ensena-muted">Other Disputes</p><p className="font-medium text-ensena-ink">{Math.max(0, groupSummary.disputedCount - 1)} other student{groupSummary.disputedCount - 1 === 1 ? "" : "s"}</p></div>
                </div>
                {current.type === "Group" && !current.tutorAbsent && (
                  <Button variant="outline" onClick={handleMarkTutorAbsent} disabled={!canResolveDisputes} className="mt-2.5 h-8 w-full rounded-full border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
                    Mark Tutor Absent for This Session
                  </Button>
                )}
              </>
            )}

            {current.tutorAbsent && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700"><AlertTriangle className="size-3.5" /> Tutor never joined this session. Held for every enrolled student pending review.</p>
            )}

            <p className="mt-3 text-xs font-semibold text-ensena-ink">Evidence Available</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {evidenceAvailable.map((e) => <EvidenceItem key={e.label} {...e} />)}
            </ul>
          </Card>

          <Card title="Financial Status" icon={Banknote}>
            <dl className="mt-2 flex flex-col divide-y divide-ensena-border">
              <InfoRow label="Student Paid" value={formatNaira(current.amountGross)} />
              <InfoRow label="Enseña Commission" value={formatNaira(split.commission)} />
              <InfoRow label="Tutor Earnings" value={formatNaira(split.net)} />
            </dl>
            <div className={cn("mt-3 flex items-center gap-2 rounded-xl p-3 text-xs font-medium", current.escrowStatus === "Frozen" ? "bg-amber-50 text-amber-700" : current.escrowStatus === "Released" ? "bg-emerald-50 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted")}>
              <Lock className="size-3.5 shrink-0" />
              {current.escrowStatus === "Frozen" ? "Funds are on hold while this dispute is under review." : current.escrowStatus === "Released" ? "Funds have been released per the resolution below." : "Funds are held in escrow."}
            </div>
          </Card>

          {!isClosed && !canResolveDisputes && (
            <Card title="Resolve Dispute" icon={CheckCircle2}>
              <p className="mt-2 text-sm text-ensena-muted">Your role doesn&apos;t have permission to resolve disputes. You can still review the evidence above and request a tutor response.</p>
            </Card>
          )}

          {!isClosed && canResolveDisputes ? (
            <Card title="Resolve Dispute" icon={CheckCircle2}>
              <div className="mt-2 flex flex-col gap-2">
                {([
                  { key: "Release" as const, label: "Release Full Tutor Payment", sub: `Release ${formatNaira(split.net)} to tutor` },
                  { key: "Refund" as const, label: "Full Student Refund", sub: `Refund ${formatNaira(current.amountGross)} to student` },
                  { key: "Partial" as const, label: "Partial Refund", sub: null },
                  { key: "Dismiss" as const, label: "Dismiss Dispute", sub: "No refund or payment. Keep funds held." },
                ]).map((opt) => (
                  <label key={opt.key} className={cn("flex cursor-pointer flex-col gap-1 rounded-xl border p-3", outcome === opt.key ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border")}>
                    <span className="flex items-center gap-2 text-sm font-medium text-ensena-ink">
                      <input type="radio" name="outcome" checked={outcome === opt.key} onChange={() => setOutcome(opt.key)} /> {opt.label}
                    </span>
                    {opt.sub && <span className="pl-5 text-xs text-ensena-muted">{opt.sub}</span>}
                    {opt.key === "Partial" && outcome === "Partial" && (
                      <div className="mt-1 grid grid-cols-2 gap-2 pl-5">
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-ensena-muted">Refund to student (₦)</span>
                          <input
                            type="number"
                            min={0}
                            max={maxRefund}
                            value={refundToStudent}
                            onChange={(e) => setRefundToStudent(Math.min(maxRefund, Math.max(0, Number(e.target.value))))}
                            className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[11px] text-ensena-muted">Amount to tutor (₦)</span>
                          <input type="number" value={computedTutorAmount} disabled className="h-9 rounded-lg border border-ensena-border bg-ensena-bg-soft px-2.5 text-sm text-ensena-muted" />
                        </label>
                      </div>
                    )}
                  </label>
                ))}
              </div>

              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ensena-muted">Admin Resolution Note</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Explain the decision…" className="rounded-xl border border-ensena-border p-2.5 text-sm outline-none focus-visible:border-ensena-primary" />
              </label>

              <Button onClick={handleResolve} className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Resolve Dispute</Button>
            </Card>
          ) : isClosed ? (
            <Card title="Resolved" icon={CheckCircle2}>
              <span className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", disputeStatusStyles[status])}>
                <span className="size-1.5 rounded-full bg-current" /> {current.resolution?.outcome === "Release" ? "Tutor Payment Released" : current.resolution?.outcome === "Refund" ? "Student Fully Refunded" : current.resolution?.outcome === "Partial" ? "Partial Resolution" : "Dispute Dismissed"}
              </span>
              <p className="mt-2 text-xs font-semibold text-ensena-ink">Decision</p>
              <p className="mt-1 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">{current.resolution?.note}</p>
              <dl className="mt-3 flex flex-col divide-y divide-ensena-border">
                <InfoRow label="Tutor received" value={formatNaira(current.resolution?.tutorReceived ?? 0)} />
                <InfoRow label="Student refund" value={formatNaira(current.resolution?.studentRefund ?? 0)} />
                <InfoRow label="Resolved by" value={current.resolution?.resolvedBy ?? "—"} />
                <InfoRow label="Resolved" value={current.resolution?.resolvedAtLabel ?? "—"} />
              </dl>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
      <Card title="Activity Timeline" icon={Clock}>
        <div className="mt-3 flex flex-wrap items-start gap-x-1 gap-y-3">
          {timeline.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex w-32 flex-col items-center gap-1 text-center">
                <span className={cn("flex size-6 items-center justify-center rounded-full", step.done ? "bg-ensena-success text-white" : "border-2 border-ensena-border bg-ensena-surface text-ensena-muted")}>
                  {step.done ? <CheckCircle2 className="size-3.5" /> : <User className="size-3" />}
                </span>
                <p className={cn("text-xs font-semibold", step.done ? "text-ensena-ink" : "text-ensena-muted")}>{step.label}</p>
                <p className="text-[11px] text-ensena-muted">{step.time ?? "Current Stage"}</p>
              </div>
              {i < timeline.length - 1 && <span className="mx-1 h-px w-6 bg-ensena-border sm:w-10" />}
            </div>
          ))}
        </div>
      </Card>
      </div>

      {msgTarget && <AdminMsgTutorModal open={!!msgTarget} onClose={() => setMsgTarget(null)} recipientName={msgTarget.name} role={msgTarget.role} />}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
