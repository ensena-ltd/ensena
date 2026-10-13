"use client";

import { useState } from "react";
import { BadgeCheck, Building2, Download, FileText, Plus, TrendingUp } from "lucide-react";

import { NeedHelpCard } from "@/components/booking/need-help-card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { tutorBookingEligibilityByName } from "@/lib/account-permissions";
import { usePayoutRequests, useTutorBalance } from "@/hooks/use-payouts";
import { generateFinancialInsights } from "@/lib/ai-earnings-insights";
import { splitEarnings } from "@/lib/commission";
import { formatNaira } from "@/lib/format";
import { requestPayout, withdrawalStatusFor } from "@/lib/payout-store";
import {
  dashboardTutor,
  financialDocuments,
  initialBankAccounts,
  processingStages,
  withdrawalNotifications,
  withdrawalRules,
  withdrawalStatusStyles,
  type BankAccount,
  type WithdrawalRecord,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

export function WithdrawalsClient() {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const payoutRequests = usePayoutRequests();
  const tutorBalance = useTutorBalance();
  const balance = tutorBalance.available;
  const heldInEscrow = tutorBalance.escrow;
  const pendingRelease = tutorBalance.pending;
  const myPayoutRequests = payoutRequests.filter((p) => p.tutor === dashboardTutor.name);
  const alreadyWithdrawn = myPayoutRequests.filter((p) => p.status === "Paid").reduce((sum, p) => sum + p.amount, 0);
  const withdrawals: WithdrawalRecord[] = myPayoutRequests
    .map((p) => ({
      id: p.id,
      date: p.requestedLabel,
      amount: p.amount,
      bank: `${p.bankName} •••${p.accountLast4}`,
      status: withdrawalStatusFor(p.status),
    }));

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  function openEditAccount(account: BankAccount) {
    setEditingAccountId(account.id);
    setBankName(account.bankName);
    setAccountNumber(account.accountNumber);
    setAccountName(account.accountName);
    setAddAccountOpen(true);
  }

  const [receiptWithdrawal, setReceiptWithdrawal] = useState<WithdrawalRecord | null>(null);

  // New withdrawal REQUESTS are paused while the account isn't in good
  // standing (matching every other new-financial-activity gate) — this
  // never touches funds already earned or already-submitted withdrawals,
  // only blocks starting a NEW one, per the platform's policy of never
  // confiscating money over an account status alone.
  const withdrawalEligibility = tutorBookingEligibilityByName(dashboardTutor.name);
  const withdrawalBlockedReason = withdrawalEligibility.allowed
    ? null
    : withdrawalEligibility.status === "Suspended"
      ? "New withdrawal requests are paused while your account is suspended. Funds already earned remain yours and any withdrawal already in progress is unaffected."
      : withdrawalEligibility.status === "Banned"
        ? "Your account has been removed from Ensena. Contact Support about any remaining balance."
        : "New withdrawal requests are paused while your account is under review. Funds already earned remain yours.";

  const insights = generateFinancialInsights({
    monthlyGross: 245000,
    withdrawnThisMonth: 55000,
    heldInEscrow,
    projectedNextWeek: 63000,
  });

  async function submitWithdrawal() {
    if (withdrawalBlockedReason) {
      setSubmitError(withdrawalBlockedReason);
      return;
    }
    const value = Number(amount);
    if (!value || value < withdrawalRules.minimum || value > balance) return;
    const account = accounts.find((a) => a.id === accountId);
    setSubmitting(true);
    setSubmitError(null);
    try {
      await requestPayout({
        tutorName: dashboardTutor.name,
        tutorImage: dashboardTutor.image,
        tutorSubject: dashboardTutor.subjectTitle,
        amount: value,
        bankName: account?.bankName ?? "Bank",
        accountLast4: account ? account.accountNumber.slice(-4) : "0000",
        accountName: account?.accountName ?? dashboardTutor.name,
      });
      setWithdrawOpen(false);
      setAmount("");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function submitAccount() {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) return;
    if (editingAccountId) {
      setAccounts((prev) =>
        prev.map((a) => (a.id === editingAccountId ? { ...a, bankName, accountNumber, accountName } : a))
      );
    } else {
      setAccounts((prev) => [
        ...prev,
        { id: `bank-${Date.now()}`, bankName, accountNumber, accountName, verified: false, isDefault: false },
      ]);
    }
    setAddAccountOpen(false);
    setEditingAccountId(null);
    setBankName("");
    setAccountNumber("");
    setAccountName("");
  }

  function downloadDocument(name: string) {
    const blob = new Blob([`Ensena: ${name}\nGenerated ${new Date().toLocaleDateString()}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Withdrawals</h1>
          <p className="mt-1 text-sm text-ensena-muted">Move your available earnings to your bank account.</p>
        </div>
        <Button
          onClick={() => setWithdrawOpen(true)}
          className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
        >
          Withdraw Funds
        </Button>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Available Balance</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(balance)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Held in Escrow</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(heldInEscrow)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Pending Release</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(pendingRelease)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Already Withdrawn</p>
          <p className="text-lg font-semibold text-ensena-ink">{formatNaira(alreadyWithdrawn)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-5">
          {/* Withdraw funds card */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-center">
            <p className="text-xs text-ensena-muted">Withdrawable Balance</p>
            <p className="font-heading text-3xl font-semibold text-ensena-ink">{formatNaira(balance)}</p>
            <Button
              onClick={() => setWithdrawOpen(true)}
              className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
            >
              Withdraw Funds
            </Button>
          </div>

          {/* Bank accounts */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Bank Accounts</h2>
              <button
                type="button"
                onClick={() => {
                  setEditingAccountId(null);
                  setBankName("");
                  setAccountNumber("");
                  setAccountName("");
                  setAddAccountOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline"
              >
                <Plus className="size-3.5" /> Add Account
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-start gap-3 rounded-xl border border-ensena-border p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                    <Building2 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                      {acc.bankName}
                      {acc.verified && <BadgeCheck className="size-3.5 text-ensena-success" />}
                      {acc.isDefault && <span className="rounded-full bg-ensena-bg-soft px-1.5 py-0.5 text-[10px] font-medium text-ensena-muted">Primary</span>}
                    </p>
                    <p className="text-xs text-ensena-muted">{acc.accountName} · •••{acc.accountNumber.slice(-4)}</p>
                  </div>
                  <button type="button" onClick={() => openEditAccount(acc)} className="text-xs font-medium text-ensena-primary">Edit</button>
                </div>
              ))}
            </div>
          </div>

          {/* Withdrawal rules */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-sm">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Withdrawal Rules</h2>
            <div className="mt-3 flex flex-col gap-2 text-xs">
              <div className="flex justify-between"><span className="text-ensena-muted">Minimum Withdrawal</span><span className="font-medium text-ensena-ink">{formatNaira(withdrawalRules.minimum)}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Maximum</span><span className="font-medium text-ensena-ink">Available Balance</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Processing Time</span><span className="font-medium text-ensena-ink">{withdrawalRules.processingTime}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Fee</span><span className="font-medium text-ensena-ink">{formatNaira(withdrawalRules.fee)}</span></div>
            </div>
          </div>

          {/* Tax & financial docs */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Tax &amp; Financial Documents</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {financialDocuments.map((doc) => (
                <li key={doc} className="flex items-center justify-between rounded-lg border border-ensena-border p-2.5 text-xs">
                  <span className="flex items-center gap-1.5 text-ensena-ink"><FileText className="size-3.5 text-ensena-muted" /> {doc}</span>
                  <button type="button" onClick={() => downloadDocument(doc)} aria-label={`Download ${doc}`} className="text-ensena-primary">
                    <Download className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {/* Processing timeline */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Processing Timeline</h2>
            <div className="mt-4 flex items-center justify-between">
              {processingStages.map((stage, i) => (
                <div key={stage} className="flex flex-1 flex-col items-center text-center">
                  <span className="flex size-7 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">
                    {i + 1}
                  </span>
                  <p className="mt-1.5 text-[11px] text-ensena-muted">{stage}</p>
                  {i < processingStages.length - 1 && <span className="mt-3 hidden h-px w-full bg-ensena-border sm:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* Withdrawal history */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Withdrawal History</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Bank</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-2.5 pr-4 text-ensena-muted">{w.date}</td>
                      <td className="py-2.5 pr-4 font-medium text-ensena-ink">{formatNaira(w.amount)}</td>
                      <td className="py-2.5 pr-4 text-ensena-muted">{w.bank}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", withdrawalStatusStyles[w.status])}>{w.status}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <button type="button" onClick={() => setReceiptWithdrawal(w)} className="text-xs font-semibold text-ensena-primary hover:underline">
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Notifications</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ensena-ink">
              {withdrawalNotifications.map((n, i) => (
                <li key={i}>✔ {n}</li>
              ))}
            </ul>
          </div>

          {/* Financial Insights */}
          <div className="rounded-2xl border border-ensena-cta-from/30 bg-gradient-to-br from-ensena-cta-from/5 to-transparent p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <TrendingUp className="size-4.5 text-ensena-cta-to" /> Financial Insights
            </h2>
            <div className="mt-3 flex flex-col gap-2 text-sm text-ensena-ink">
              <p>{insights.monthlyEarned}</p>
              <p>{insights.averageWeekly}</p>
              <p>{insights.withdrawnThisMonth}</p>
              <p>{insights.heldInEscrow}</p>
              <p>{insights.projectedNextWeek}</p>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold text-ensena-ink">Recommendation</p>
                <p className="mt-1 text-ensena-muted">{insights.recommendation}</p>
              </div>
            </div>
          </div>

          <NeedHelpCard
            role="Tutor"
            context="payout"
            relatedRecordType="payout"
            relatedRecordId={withdrawals[0]?.id}
            relatedRecordLabel={withdrawals[0] ? `Withdrawal of ${formatNaira(withdrawals[0].amount)}` : undefined}
          />
        </div>
      </div>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw Funds">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Available balance: <span className="font-semibold text-ensena-ink">{formatNaira(balance)}</span></p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Amount (₦)</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Minimum ${formatNaira(withdrawalRules.minimum)}`}
              className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Destination</span>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.bankName} (•••{a.accountNumber.slice(-4)})
                </option>
              ))}
            </select>
          </label>
          {(withdrawalBlockedReason || submitError) && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{withdrawalBlockedReason || submitError}</p>
          )}
          <Button
            onClick={submitWithdrawal}
            disabled={submitting || !!withdrawalBlockedReason}
            className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:pointer-events-none disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Withdraw Now"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={addAccountOpen}
        onClose={() => {
          setAddAccountOpen(false);
          setEditingAccountId(null);
        }}
        title={editingAccountId ? "Edit Bank Account" : "Add Bank Account"}
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Bank name</span>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Account number</span>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Account name</span>
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button onClick={submitAccount} className="mt-2 h-10 w-full rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">
            {editingAccountId ? "Save Changes" : "Add Account"}
          </Button>
        </div>
      </Modal>

      <Modal open={!!receiptWithdrawal} onClose={() => setReceiptWithdrawal(null)} title="Withdrawal Receipt">
        {receiptWithdrawal && (() => {
          const split = splitEarnings(receiptWithdrawal.amount);
          return (
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between"><span className="text-ensena-muted">Date</span><span className="font-medium text-ensena-ink">{receiptWithdrawal.date}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Bank</span><span className="font-medium text-ensena-ink">{receiptWithdrawal.bank}</span></div>
              <div className="flex justify-between"><span className="text-ensena-muted">Status</span><span className="font-medium text-ensena-ink">{receiptWithdrawal.status}</span></div>
              <div className="flex justify-between border-t border-ensena-border pt-2"><span className="text-ensena-muted">Amount Withdrawn</span><span className="font-semibold text-ensena-ink">{formatNaira(split.net)}</span></div>
              <p className="text-xs text-ensena-muted">This amount reflects your net balance after Ensena&apos;s commission was already deducted at the time of earning.</p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
