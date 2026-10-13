"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Lock,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TutorEscrowConfirmationPanel } from "@/components/tutor-dashboard/private-lessons/escrow-confirmation-panel";
import { TutorGroupEarningsPanel } from "@/components/tutor-dashboard/private-lessons/group-earnings-panel";
import { useTutorBalance } from "@/hooks/use-payouts";
import { ENSENA_COMMISSION_PCT, commissionExplainer, splitEarnings } from "@/lib/commission";
import { generateEarningsInsights } from "@/lib/ai-earnings-insights";
import { formatNaira } from "@/lib/format";
import {
  escrowBookings,
  escrowDisputes,
  escrowMonthlyTrend,
  escrowNotifications,
  escrowUpcomingReleases,
  revenueBySubject,
  type EscrowBooking,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const filterTabs = ["All", "Private", "Group", "Held", "Completed"] as const;

const mobileTabs = ["Overview", "Held", "Released", "Withdrawals"] as const;

function bookingTotals(booking: EscrowBooking) {
  const released = booking.lessons.filter((l) => l.status === "Completed").reduce((s, l) => s + l.amountGross, 0);
  const held = booking.lessons.filter((l) => l.status !== "Completed").reduce((s, l) => s + l.amountGross, 0);
  const paid = released + held;
  return { released, held, paid };
}

export function EscrowClient() {
  const [filter, setFilter] = useState<(typeof filterTabs)[number]>("All");
  const [mobileTab, setMobileTab] = useState<(typeof mobileTabs)[number]>("Overview");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(escrowBookings[0]?.id ?? null);
  const [viewingBooking, setViewingBooking] = useState<EscrowBooking | null>(null);
  const availableBalance = useTutorBalance().available;

  const totals = useMemo(() => {
    let held = 0;
    let released = 0;
    let lessonsAwaiting = 0;
    for (const b of escrowBookings) {
      const t = bookingTotals(b);
      held += t.held;
      released += t.released;
      lessonsAwaiting += b.lessons.filter((l) => l.status === "Held").length;
    }
    return { held, released, lessonsAwaiting };
  }, []);

  const heldSplit = splitEarnings(totals.held);
  const withdrawnThisMonth = 145000;
  const withdrawnSplit = splitEarnings(withdrawnThisMonth);
  const lifetimeSplit = splitEarnings(2450000);
  const pendingReleaseSplit = splitEarnings(9500);

  const filteredBookings = escrowBookings.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Private" || filter === "Group") return b.type === filter;
    if (filter === "Held") return b.lessons.some((l) => l.status !== "Completed");
    if (filter === "Completed") return b.completedSessions === b.totalSessions;
    return true;
  });

  const insights = generateEarningsInsights(245000);
  const maxSubject = Math.max(...revenueBySubject.map((r) => r.amount));
  const maxTrend = Math.max(...escrowMonthlyTrend.released);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Escrow</h1>
          <p className="mt-1 text-sm text-ensena-muted">Exactly how much money is protected, and when you&apos;ll be paid.</p>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mt-4 flex gap-1 overflow-x-auto rounded-full border border-ensena-border bg-ensena-surface p-1 text-xs sm:hidden">
        {mobileTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 font-medium", mobileTab === t ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "text-ensena-muted")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1 text-xs text-ensena-muted"><Lock className="size-3.5 text-amber-500" /> Held in Escrow</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(totals.held)}</p>
          <p className="text-[11px] text-ensena-muted">Net: {formatNaira(heldSplit.net)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Available for Withdrawal</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(availableBalance)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Pending Release</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(9500)}</p>
          <p className="text-[11px] text-ensena-muted">Net: {formatNaira(pendingReleaseSplit.net)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Withdrawn This Month</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(withdrawnThisMonth)}</p>
          <p className="text-[11px] text-ensena-muted">Net: {formatNaira(withdrawnSplit.net)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Total Lifetime Earnings</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(2450000)}</p>
          <p className="text-[11px] text-ensena-muted">Net: {formatNaira(lifetimeSplit.net)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Awaiting Confirmation</p>
          <p className="text-lg font-semibold text-ensena-ink">6 Lessons</p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
        Ensena charges a {ENSENA_COMMISSION_PCT}% commission on every completed lesson. {commissionExplainer}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <TutorEscrowConfirmationPanel />
        <TutorGroupEarningsPanel />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium",
              filter === tab ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "bg-ensena-surface text-ensena-muted border border-ensena-border hover:bg-ensena-bg-soft"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Escrow Timeline */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Escrow Timeline</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Lesson</th>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const nextLesson = b.lessons.find((l) => l.status !== "Completed") ?? b.lessons[b.lessons.length - 1];
                const isReleasing = b.completedSessions === b.totalSessions;
                return (
                  <tr key={b.id} className="border-b border-ensena-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-ensena-ink">{b.student}</td>
                    <td className="py-2.5 pr-4 text-ensena-muted">{b.subject}</td>
                    <td className="py-2.5 pr-4 text-ensena-muted">
                      {nextLesson.label} of {b.totalSessions}
                    </td>
                    <td className="py-2.5 pr-4 text-ensena-muted">{nextLesson.date}</td>
                    <td className="py-2.5 pr-4 font-medium text-ensena-ink">{formatNaira(nextLesson.amountGross)}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          isReleasing
                            ? "bg-blue-100 text-blue-700"
                            : nextLesson.status === "Held"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-ensena-bg-soft text-ensena-muted"
                        )}
                      >
                        {isReleasing ? "Releasing" : nextLesson.status === "Held" ? "Held" : "Scheduled"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <button type="button" onClick={() => setViewingBooking(b)} className="text-xs font-semibold text-ensena-primary hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Escrow Progress + Lesson breakdown */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Escrow Progress</h2>
        <div className="mt-3 flex flex-col gap-3">
          {filteredBookings.map((b) => {
            const t = bookingTotals(b);
            const pct = (b.completedSessions / b.totalSessions) * 100;
            const expanded = expandedBooking === b.id;
            return (
              <div key={b.id} className="rounded-2xl border border-ensena-border p-4">
                <button
                  type="button"
                  onClick={() => setExpandedBooking(expanded ? null : b.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{b.title}</p>
                    <p className="text-xs text-ensena-muted">Student: {b.student} · Paid {formatNaira(t.paid)}</p>
                  </div>
                  <ChevronDown className={cn("size-4 shrink-0 text-ensena-muted transition-transform", expanded && "rotate-180")} />
                </button>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ensena-muted">
                  <span>Released: <span className="font-semibold text-ensena-ink">{formatNaira(t.released)}</span></span>
                  <span>Held: <span className="font-semibold text-ensena-ink">{formatNaira(t.held)}</span></span>
                  <span>Lessons Completed: <span className="font-semibold text-ensena-ink">{b.completedSessions} / {b.totalSessions}</span></span>
                </div>

                {expanded && (
                  <div className="mt-3 flex flex-col divide-y divide-ensena-border border-t border-ensena-border pt-2">
                    {b.lessons.map((l) => (
                      <div key={l.label} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <p className="font-medium text-ensena-ink">{l.label}</p>
                          <p className="text-xs text-ensena-muted">{l.date}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("text-xs font-semibold", l.status === "Completed" ? "text-ensena-success" : "text-ensena-muted")}>
                            {l.status === "Completed" ? "Released" : "Held"}
                          </span>
                          <span className="font-medium text-ensena-ink">{formatNaira(l.amountGross)}</span>
                          {l.status === "Completed" ? (
                            <Check className="size-4 text-ensena-success" />
                          ) : (
                            <Lock className="size-4 text-ensena-muted" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Upcoming releases */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Upcoming Escrow Releases</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {escrowUpcomingReleases.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                <div>
                  <p className="font-medium text-ensena-ink">{r.date}</p>
                  <p className="text-xs text-ensena-muted">{r.student}</p>
                </div>
                <span className="font-semibold text-ensena-ink">{formatNaira(r.amountGross)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Release rules */}
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <ShieldCheck className="size-4.5 text-ensena-success" /> How Ensena Escrow Works
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-ensena-ink">
            {[
              "Student pays before lessons begin.",
              "Payment is securely held.",
              "After each completed lesson, one session payment is released.",
              "Funds become available for withdrawal.",
              "Students remain protected until each lesson is delivered.",
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-ensena-success" /> {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Analytics */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Monthly Escrow</h2>
          <div className="mt-3 flex h-32 items-end gap-2">
            {escrowMonthlyTrend.released.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-ensena-primary/70" style={{ height: `${(v / maxTrend) * 100}%` }} />
                <div className="w-full rounded-t bg-amber-400" style={{ height: `${(escrowMonthlyTrend.held[i] / maxTrend) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-ensena-muted">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-ensena-primary/70" /> Released</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" /> Held</span>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subject Earnings</h2>
          <div className="mt-3 flex flex-col gap-2.5">
            {revenueBySubject.map((r) => (
              <div key={r.label} className="flex items-center gap-3 text-sm">
                <span className="w-20 shrink-0 text-ensena-muted">{r.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-ensena-bg-soft">
                  <div className="h-full rounded-full" style={{ width: `${(r.amount / maxSubject) * 100}%`, backgroundColor: r.color }} />
                </div>
                <span className="w-20 shrink-0 text-right font-medium text-ensena-ink">{formatNaira(r.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Withdrawal + Disputes */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Wallet className="size-3.5 text-ensena-primary" /> Available</p>
          {availableBalance > 0 ? (
            <>
              <p className="mt-1 text-2xl font-semibold text-ensena-ink">{formatNaira(availableBalance)}</p>
              <p className="mt-2 text-xs text-ensena-muted">Bank: GTBank •••3245</p>
              <Button
                nativeButton={false}
                render={<Link href="/tutor-dashboard/withdrawals" />}
                className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
              >
                Withdraw Funds
              </Button>
            </>
          ) : (
            <>
              <p className="mt-1 text-2xl font-semibold text-ensena-ink">₦0</p>
              <p className="mt-2 text-sm text-ensena-muted">You currently have no available balance. Payments will become available after completed lessons.</p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
            <AlertTriangle className="size-4.5 text-amber-500" /> Disputes
          </h2>
          {escrowDisputes.length === 0 ? (
            <p className="mt-2 text-sm text-ensena-muted">No active disputes.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {escrowDisputes.map((d) => (
                <li key={d.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-ensena-ink">{d.student} · {d.subject}</p>
                  <p className="text-xs text-ensena-muted">Reason: {d.reason}</p>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-ensena-ink">Frozen: {formatNaira(d.amountFrozen)}</span>
                    <span className="font-semibold text-amber-700">{d.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
          <Bell className="size-4.5 text-ensena-primary" /> Notifications
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-ensena-ink">
          {escrowNotifications.map((n, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ensena-success" /> {n}
            </li>
          ))}
        </ul>
      </div>

      {/* AI Earnings Insights */}
      <div className="mt-4 rounded-2xl border border-ensena-cta-from/30 bg-gradient-to-br from-ensena-cta-from/5 to-transparent p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
          <Wallet className="size-4.5 text-ensena-cta-to" /> Earnings Insights
        </h2>
        <div className="mt-3 flex flex-col gap-2 text-sm text-ensena-ink">
          <p>{insights.headline}</p>
          <p>{insights.topSubjectShare}</p>
          <p>{insights.busiestTime}</p>
          <p>{insights.atRiskStudents}</p>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-ensena-ink">Suggested Action</p>
            <p className="mt-1 text-ensena-muted">{insights.suggestedAction}</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-ensena-ink">Students with Highest Retention</p>
            <p className="mt-1 text-ensena-muted">{insights.topRetention.join(" · ")}</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-ensena-ink">Recommended</p>
            <p className="mt-1 text-ensena-muted">{insights.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Escrow details modal */}
      <Modal open={!!viewingBooking} onClose={() => setViewingBooking(null)} title="Booking Details">
        {viewingBooking && (() => {
          const t = bookingTotals(viewingBooking);
          return (
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-ensena-muted">Student</span><span className="font-medium text-ensena-ink">{viewingBooking.student}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Subject</span><span className="font-medium text-ensena-ink">{viewingBooking.subject}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Plan</span><span className="font-medium text-ensena-ink">{viewingBooking.plan}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Started</span><span className="font-medium text-ensena-ink">{viewingBooking.startDate}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Ends</span><span className="font-medium text-ensena-ink">{viewingBooking.endDate}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Sessions</span><span className="font-medium text-ensena-ink">{viewingBooking.totalSessions}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Completed</span><span className="font-medium text-ensena-ink">{viewingBooking.completedSessions}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Remaining</span><span className="font-medium text-ensena-ink">{viewingBooking.totalSessions - viewingBooking.completedSessions}</span></div>
              <div className="flex justify-between border-t border-ensena-border pt-2"><span className="text-ensena-muted">Payment (Gross)</span><span className="font-medium text-ensena-ink">{formatNaira(t.paid)}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Held</span><span className="font-medium text-ensena-ink">{formatNaira(t.held)}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Released</span><span className="font-medium text-ensena-ink">{formatNaira(t.released)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span className="text-ensena-ink">Status</span><span className="text-ensena-ink">{t.held > 0 ? "Held in Escrow" : "Fully Released"}</span></div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
