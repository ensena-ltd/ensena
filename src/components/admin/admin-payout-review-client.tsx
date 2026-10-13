"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Banknote, ChevronLeft, ClipboardList, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { logAdminAction } from "@/lib/admin-audit-log";
import { formatBookingDisplayId } from "@/lib/admin-bookings-data";
import {
  formatPayoutDisplayId,
  payoutStatusStyles,
  rejectionReasonOptions,
} from "@/lib/admin-tutor-payouts-data";
import { formatNaira } from "@/lib/format";
import { useAdminSession } from "@/hooks/use-admin-session";
import { usePayoutRequests } from "@/hooks/use-payouts";
import { currentActorLabel, hasPermission } from "@/lib/admin-session";
import { approvePayout, rejectPayout as rejectPayoutInStore } from "@/lib/payout-store";
import { cn } from "@/lib/utils";

function Card({ title, icon: Icon, children }: { title: string; icon?: typeof Banknote; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function AdminPayoutReviewClient({ payoutId }: { payoutId: string }) {
  const session = useAdminSession();
  const canApprovePayouts = hasPermission(session, "Payments", "Approve payouts");
  const payouts = usePayoutRequests();
  const payout = payouts.find((p) => p.id === payoutId);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast((cur) => (cur === m ? null : cur)), 2500);
  }

  if (!payout) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This payout request could not be found.</p>
        <Link href="/admin/payments?tab=Tutor Payouts" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Tutor Payouts</Link>
      </div>
    );
  }

  const current = payout;
  const displayId = formatPayoutDisplayId(current.id);
  const remainingBalance = Math.max(0, current.availableBalanceBefore - current.amount);

  function approveAndProcess() {
    approvePayout(payoutId, currentActorLabel());
    setApproveOpen(false);
    logAdminAction("Approved payout", currentActorLabel(), `${formatNaira(current.amount)} · ${current.tutor}`);
    flash("Payout approved and submitted to the payment provider.");
  }

  function handleRejectPayout() {
    if (!rejectReason) return;
    rejectPayoutInStore(payoutId, rejectReason, adminNote.trim() || undefined, currentActorLabel());
    setRejectOpen(false);
    logAdminAction("Rejected payout", currentActorLabel(), `${formatNaira(current.amount)} · ${current.tutor}: ${rejectReason}`);
    flash("Payout rejected. Funds returned to the tutor's available balance.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/payments?tab=Tutor Payouts" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Tutor Payouts
        </Link>
        <div className="rounded-xl border border-ensena-border bg-ensena-surface px-4 py-2.5">
          <p className="text-[11px] text-ensena-muted">Payout ID</p>
          <p className="font-mono text-sm font-semibold text-ensena-ink">{displayId}</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Payout Request</p>
            <p className="mt-1 font-heading text-3xl font-semibold text-ensena-ink">{formatNaira(current.amount)}</p>
          </div>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", payoutStatusStyles[current.status])}>
            <span className="size-1.5 rounded-full bg-current" /> {current.status}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-ensena-bg-soft p-3.5">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={current.tutorImage} alt={current.tutor} fill sizes="44px" className="object-cover" /></div>
          <div>
            <p className="text-xs text-ensena-muted">Requested by</p>
            <p className="text-sm font-semibold text-ensena-ink">{current.tutor}</p>
            <p className="text-xs text-ensena-muted">{current.tutorSubject}</p>
          </div>
        </div>

        {current.status === "Failed" && current.failureReason && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-sm text-rose-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Payout failed</p>
              <p className="text-xs">{current.failureReason}</p>
            </div>
          </div>
        )}

        {current.status === "Rejected" && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-ensena-bg-soft p-3.5 text-sm text-ensena-ink">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ensena-muted" />
            <div>
              <p className="font-semibold">Rejected: {current.rejectionReason}</p>
              {current.adminNote && <p className="mt-0.5 text-xs text-ensena-muted">{current.adminNote}</p>}
            </div>
          </div>
        )}

        {current.status === "Pending Review" && (
          canApprovePayouts ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setApproveOpen(true)} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">Approve Payout</Button>
              <Button variant="outline" onClick={() => setRejectOpen(true)} className="h-10 rounded-full border-ensena-border px-5 text-sm font-medium text-rose-600">Reject</Button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-ensena-muted">Your role doesn&apos;t have permission to approve or reject payouts.</p>
          )
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <Card title="Request Details">
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-ensena-muted">Requested</dt><dd className="font-medium text-ensena-ink">{current.requestedLabel}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Available balance before withdrawal</dt><dd className="font-medium text-ensena-ink">{formatNaira(current.availableBalanceBefore)}</dd></div>
              <div className="flex justify-between"><dt className="text-ensena-muted">Requested amount</dt><dd className="font-medium text-ensena-ink">{formatNaira(current.amount)}</dd></div>
              <div className="flex justify-between border-t border-ensena-border pt-2"><dt className="text-ensena-muted">Remaining balance</dt><dd className="font-semibold text-ensena-ink">{formatNaira(remainingBalance)}</dd></div>
            </dl>
          </Card>

          <Card title="Earnings Breakdown" icon={ClipboardList}>
            <p className="mt-1 text-xs text-ensena-muted">What generated this tutor&apos;s available balance.</p>
            {current.earningsBreakdown.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                      <th className="py-2 pr-3 font-medium">Booking</th>
                      <th className="py-2 pr-3 font-medium">Student</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 text-right font-medium">Tutor Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.earningsBreakdown.map((e) => (
                      <tr key={e.bookingId} className="border-b border-ensena-border text-sm last:border-0">
                        <td className="py-2.5 pr-3">
                          <Link href={`/admin/bookings/${e.bookingId}`} className="font-mono text-xs font-semibold text-ensena-primary hover:underline">{formatBookingDisplayId(e.bookingId)}</Link>
                        </td>
                        <td className="py-2.5 pr-3 text-ensena-ink">{e.student}</td>
                        <td className="py-2.5 pr-3 text-ensena-muted">{e.type}</td>
                        <td className="py-2.5 pr-3 text-ensena-muted">{e.date}</td>
                        <td className="py-2.5 pr-3 text-right font-medium text-ensena-ink">{formatNaira(e.tutorEarnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-ensena-muted">No linked earnings on file for this request.</p>
            )}
          </Card>

          <Card title="Payout Activity">
            <ol className="mt-3 flex flex-col gap-3">
              {current.auditTrail.map((entry, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                  <div>
                    <p className="font-medium text-ensena-ink">{entry.action}</p>
                    <p className="text-xs text-ensena-muted">{entry.time} · {entry.actor}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <Card title="Payout Account" icon={ShieldCheck}>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-ensena-muted">Bank</dt><dd className="font-medium text-ensena-ink">{current.bankName}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Account ending</dt><dd className="font-medium text-ensena-ink">••••{current.accountLast4}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Account name</dt><dd className="font-medium text-ensena-ink">{current.accountName}</dd></div>
          </dl>
        </Card>
      </div>

      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Payout?">
        <p className="text-sm text-ensena-muted">
          Approve {formatNaira(current.amount)} payout to {current.tutor}? The payout will be submitted to the configured payment provider.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setApproveOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
          <Button onClick={approveAndProcess} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Approve &amp; Process</Button>
        </div>
      </Modal>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Payout">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-ensena-muted">Reason</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {rejectionReasonOptions.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm text-ensena-ink">
                  <input type="radio" name="rejectReason" checked={rejectReason === r} onChange={() => setRejectReason(r)} /> {r}
                </label>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ensena-muted">Admin note</span>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} placeholder="Explain the reason…" className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </label>
          <Button disabled={!rejectReason} onClick={handleRejectPayout} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40">Reject Payout</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
