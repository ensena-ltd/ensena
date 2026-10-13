"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  Circle,
  Clock,
  Mail,
  RotateCcw,
  Shield,
  Star,
  Wallet,
} from "lucide-react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useTutorRating } from "@/hooks/use-reviews";
import { initialAdminStudents, initialAdminTutors } from "@/lib/admin-data";
import {
  bookingStatusStyles,
  formatBookingDisplayId,
  initialBookings,
  paymentEscrowStyles,
  type BookingRow,
} from "@/lib/admin-bookings-data";
import { ENSENA_COMMISSION_PCT, splitEarnings } from "@/lib/commission";
import { lessonConfirmationToBookingRow } from "@/lib/lesson-confirmation-to-booking-row";
import { getPayoutRequests } from "@/lib/payout-store";
import { formatNaira } from "@/lib/format";
import { statusToneStyles, transactionStatus } from "@/lib/transaction-status";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children, action }: { title: string; icon?: typeof Wallet; children: React.ReactNode; action?: React.ReactNode }) {
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

// A per-booking payout reference, deterministically derived from the
// booking's own id — same convention as formatBookingDisplayId /
// formatPayoutDisplayId, never a randomly generated value.
function formatPayoutReference(id: string): string {
  const numeric = id.replace(/\D/g, "") || "0";
  return `PYO-${numeric.padStart(8, "0")}`;
}

// Real payout account on file for this tutor, reused from the Tutor Payouts
// queue where available, rather than fabricating bank details on this page.
function payoutAccountFor(tutorName: string) {
  return getPayoutRequests().find((p) => p.tutor === tutorName);
}

export function AdminPaymentDetailsClient({ bookingId }: { bookingId: string }) {
  // Seed rows merged with every real completed session (via the same
  // hydration-safe escrow hook every other admin page uses — a dispute
  // resolved elsewhere updates this page too, not just on refresh) computed
  // fresh each render rather than synced into state, so it can never drift;
  // `overrides` layers this page's own local demo actions (e.g. "Refund")
  // on top, keyed by booking id.
  const { lessons: escrowLessons } = useLessonConfirmations();
  const [overrides, setOverrides] = useState<Record<string, Partial<BookingRow>>>({});
  const baseBookings: BookingRow[] = [...initialBookings, ...escrowLessons.map(lessonConfirmationToBookingRow)];
  const bookings = baseBookings.map((b) => (overrides[b.id] ? { ...b, ...overrides[b.id] } : b));
  const booking = bookings.find((b) => b.id === bookingId);
  const sourceTutor = booking ? initialAdminTutors.find((t) => t.name === booking.tutor) : undefined;

  const [actionsOpen, setActionsOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [msgTarget, setMsgTarget] = useState<{ name: string; role: "Student" | "Tutor" } | null>(null);
  const rating = useTutorRating(sourceTutor?.name ?? "", sourceTutor?.rating ?? 0, sourceTutor?.reviews ?? 0);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!booking) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This transaction could not be found.</p>
        <Link href="/admin/payments" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Payments &amp; Earnings</Link>
      </div>
    );
  }

  const current = booking;
  const displayId = formatBookingDisplayId(current.id);
  const status = transactionStatus(current);
  const isRefunded = current.paymentStatus === "Refunded";
  const split = splitEarnings(current.amountGross);
  const sourceStudent = initialAdminStudents.find((s) => s.name === current.student);
  const payoutAccount = payoutAccountFor(current.tutor);

  const studentReceived = isRefunded ? current.amountGross : 0;
  const tutorPayout = isRefunded ? 0 : split.net;
  const commission = isRefunded ? 0 : split.commission;

  const escrowRelevant = current.amountGross > 0 && (current.status === "Completed" || current.status === "Disputed");
  const lessonCompletedStep = current.timeline.find((s) => /lesson completed/i.test(s.label));
  const escrowReleasedStep = current.timeline.find((s) => /escrow released/i.test(s.label));
  const studentConfirmation = current.status === "Disputed" ? "Disputed" : current.paymentStatus === "Released" ? "Confirmed" : lessonCompletedStep?.done ? "Pending" : "—";

  function updateBooking(patch: Partial<BookingRow>) {
    setOverrides((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], ...patch } }));
  }

  function confirmRefund() {
    const lessonAlreadyHappened = current.status === "Completed" || current.status === "Disputed";
    updateBooking({
      status: lessonAlreadyHappened ? current.status : "Cancelled",
      paymentStatus: "Refunded",
      refundStatus: `Fully refunded by admin${refundReason.trim() ? `: ${refundReason.trim()}` : ""}`,
      timeline: [...current.timeline, { label: "Refunded by admin", time: "Just now", done: true }],
    });
    setRefundOpen(false);
    setActionsOpen(false);
    flash("Payment refunded. Student will be notified.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/payments?tab=Transactions" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Payments &amp; Earnings
        </Link>

        <div className="relative">
          <button type="button" onClick={() => setActionsOpen((v) => !v)} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            Actions <ChevronDown className={cn("size-3.5 transition-transform", actionsOpen && "rotate-180")} />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
              <button type="button" onClick={() => { setMsgTarget({ name: current.student, role: "Student" }); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"><Mail className="size-3.5" /> Contact Student</button>
              <button type="button" onClick={() => { setMsgTarget({ name: current.tutor, role: "Tutor" }); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"><Mail className="size-3.5" /> Contact Tutor</button>
              {!isRefunded && current.amountGross > 0 && (
                <button type="button" onClick={() => { setRefundOpen(true); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"><RotateCcw className="size-3.5" /> Refund Payment</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">Payment Details</h1>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusToneStyles[status.tone])}>
            <span className="size-1.5 rounded-full bg-current" /> {status.label}
          </span>
        </div>
        <p className="mt-1 font-mono text-lg font-semibold text-ensena-ink">{displayId}</p>
        <p className="mt-0.5 text-sm text-ensena-muted">
          {isRefunded
            ? `Refunded${current.updatedAt ? ` on ${current.updatedAt}` : ""}.`
            : current.paymentStatus === "Released"
              ? `Payment completed${current.updatedAt ? ` on ${current.updatedAt}` : ""}.`
              : current.paymentStatus === "Held in Escrow"
                ? "Payment received and held in escrow."
                : current.amountGross === 0
                  ? "No payment required for this session."
                  : "Payment not yet collected."}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Booking</p>
            <p className="mt-2 text-sm font-semibold text-ensena-ink">{current.type}</p>
            <p className="text-xs text-ensena-muted">{current.subject}</p>
            <p className="mt-1 text-xs text-ensena-muted">{current.date} · {current.time}</p>
            <span className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", bookingStatusStyles[current.status])}>{current.status}</span>
          </div>
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={current.studentImage} alt={current.student} fill sizes="40px" className="object-cover" /></span>
              <p className="truncate text-sm font-semibold text-ensena-ink">{current.student}</p>
            </div>
            {sourceStudent && (
              <Link href={`/admin/users/usr-${sourceStudent.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Student Profile</Link>
            )}
          </div>
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Tutor</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={current.tutorImage} alt={current.tutor} fill sizes="40px" className="object-cover" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{current.tutor}</p>
                {sourceTutor && rating.rating > 0 && <p className="flex items-center gap-1 text-xs text-ensena-muted"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews})</p>}
              </div>
            </div>
            {sourceTutor && (
              <Link href={`/admin/users/usr-${sourceTutor.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Tutor Profile</Link>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Payment Summary" icon={Banknote}>
          <div className="mt-3 rounded-xl bg-ensena-primary/5 p-4 text-center">
            <p className="text-xs font-medium text-ensena-muted">Student paid</p>
            <p className="font-heading text-3xl font-bold text-ensena-ink">{current.amountGross > 0 ? formatNaira(current.amountGross) : "Free"}</p>
          </div>
          <dl className="mt-3 divide-y divide-ensena-border">
            <InfoRow label={`Enseña commission (${ENSENA_COMMISSION_PCT}%)`} value={formatNaira(commission)} />
            <InfoRow label="Tutor earnings" value={formatNaira(tutorPayout)} />
          </dl>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ensena-ink">Payment status</span>
            <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusToneStyles[status.tone])}><span className="size-1.5 rounded-full bg-current" /> {status.label}</span>
          </div>
          {current.updatedAt && <InfoRow label="Payment date" value={current.updatedAt} />}
          {current.paymentMethod && <InfoRow label="Payment method" value={current.paymentMethod} />}
          <Link href={`/admin/bookings/${current.id}`} className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Related Booking</Link>
        </Card>

        <Card title="Transaction Activity">
          <ul className="mt-3 flex flex-col gap-3">
            {current.timeline.map((step, i) => {
              const isNext = !step.done && current.timeline.slice(0, i).every((s) => s.done);
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  {step.done ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ensena-success" />
                  ) : isNext ? (
                    <Clock className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-ensena-border" />
                  )}
                  <div>
                    <p className={cn(step.done ? "font-medium text-ensena-ink" : "text-ensena-muted")}>{step.label}</p>
                    <p className="text-xs text-ensena-muted">{step.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex flex-col gap-4">
          <Card title="Tutor Payout" icon={Wallet}>
            {current.amountGross > 0 ? (
              <>
                <p className="mt-2 font-heading text-2xl font-bold text-ensena-ink">{formatNaira(tutorPayout)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-ensena-muted">Status</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", paymentEscrowStyles[current.paymentStatus])}>{current.paymentStatus === "Released" ? "Released" : current.paymentStatus === "Refunded" ? "Refunded" : current.paymentStatus === "Held in Escrow" ? "Held" : "Pending"}</span>
                </div>
                {current.paymentStatus === "Released" && (
                  <InfoRow label="Released on" value={escrowReleasedStep?.done ? escrowReleasedStep.time : (current.updatedAt ?? "—")} />
                )}
                {payoutAccount ? (
                  <InfoRow label="Payout method" value={`${payoutAccount.bankName} ••••${payoutAccount.accountLast4}`} />
                ) : (
                  <InfoRow label="Payout method" value="Bank Transfer" />
                )}
                <InfoRow label="Reference ID" value={formatPayoutReference(current.id)} />
                <Link href="/admin/payments?tab=Tutor Payouts" className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">View Payout History</Link>
              </>
            ) : (
              <p className="mt-2 text-sm text-ensena-muted">No tutor earnings on this session.</p>
            )}
          </Card>

          <Card title="Refund" icon={RotateCcw}>
            {isRefunded ? (
              <>
                <InfoRow label="Refund amount" value={formatNaira(current.amountGross)} />
                <InfoRow label="Reason" value={current.refundStatus ?? "Refunded"} />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-ensena-ink">Status</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Refunded</span>
                </div>
                <dl className="mt-2 divide-y divide-ensena-border border-t border-ensena-border pt-1">
                  <InfoRow label="Student received" value={formatNaira(studentReceived)} />
                  <InfoRow label="Tutor payout" value={formatNaira(tutorPayout)} />
                  <InfoRow label="Enseña commission" value={formatNaira(commission)} />
                </dl>
              </>
            ) : (
              <p className="mt-2 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-muted">This payment was completed successfully and no refund has been issued.</p>
            )}
          </Card>
        </div>
      </div>

      {escrowRelevant && (
        <Card title="Lesson & Escrow Information" icon={Shield}>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-xs text-ensena-muted">Escrow status</p>
              <span className={cn("mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", paymentEscrowStyles[current.paymentStatus])}>{current.paymentStatus}</span>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">Student confirmation</p>
              <span className={cn("mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                studentConfirmation === "Confirmed" ? "bg-emerald-100 text-emerald-700" : studentConfirmation === "Disputed" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                {studentConfirmation}
              </span>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">Lesson completed</p>
              <p className="mt-1 text-sm font-medium text-ensena-ink">{lessonCompletedStep?.done ? lessonCompletedStep.time : "Not yet"}</p>
            </div>
            <div>
              <p className="text-xs text-ensena-muted">{studentConfirmation === "Confirmed" ? "Confirmed / released" : "Auto-release window"}</p>
              <p className="mt-1 text-sm font-medium text-ensena-ink">{escrowReleasedStep ? escrowReleasedStep.time : "24 hours after lesson completion"}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ensena-muted">
            {studentConfirmation === "Confirmed" && "Student confirmed the lesson and earnings were released to the tutor."}
            {studentConfirmation === "Disputed" && "This lesson is under dispute review. Tutor earnings remain held until resolved."}
            {studentConfirmation === "Pending" && "Waiting for the student to confirm the lesson, or for the 24-hour auto-release window to pass."}
            {studentConfirmation === "—" && "This lesson has not been completed yet. Escrow release is not applicable."}
          </p>
          {current.status === "Disputed" && (
            <Link href="/admin/disputes" className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100">Review in Disputes</Link>
          )}
        </Card>
      )}

      <Modal open={refundOpen} onClose={() => setRefundOpen(false)} title="Refund Payment?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            This refunds {formatNaira(current.amountGross)} to {current.student} in full. Tutor earnings and Enseña commission on this transaction will be reversed to ₦0.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ensena-muted">Reason (optional)</span>
            <textarea value={refundReason} onChange={(e) => setRefundReason(e.target.value)} rows={2} placeholder="e.g. Booking cancelled" className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRefundOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmRefund} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Refund Payment</Button>
          </div>
        </div>
      </Modal>

      {msgTarget && <AdminMsgTutorModal open={!!msgTarget} onClose={() => setMsgTarget(null)} recipientName={msgTarget.name} role={msgTarget.role} />}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
