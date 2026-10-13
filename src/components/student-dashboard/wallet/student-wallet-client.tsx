"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Gift, Users2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { formatNaira } from "@/lib/format";
import { studentTransactions, studentWallet } from "@/lib/student-dashboard-data";

const topUpAmounts = [5000, 10000, 20000, 50000];

export function StudentWalletClient() {
  const [balance, setBalance] = useState(studentWallet.balance);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  function confirmTopUp() {
    const value = Number(amount);
    if (!value) return;
    setBalance((prev) => prev + value);
    setConfirmed(true);
    setTimeout(() => {
      setTopUpOpen(false);
      setConfirmed(false);
      setAmount("");
    }, 1200);
  }

  const recentTransactions = studentTransactions.slice(0, 4);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Wallet</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your Ensena balance and credits.</p>
        </div>
        <Button onClick={() => setTopUpOpen(true)} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
          Top Up
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Wallet className="size-3.5 text-ensena-primary" /> Wallet Balance</p>
          <p className="text-xl font-semibold text-ensena-ink">{formatNaira(balance)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs text-ensena-muted">Pending Refund</p>
          <p className="text-xl font-semibold text-ensena-ink">{formatNaira(studentWallet.pendingRefund)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Gift className="size-3.5 text-amber-500" /> Promo Credits</p>
          <p className="text-xl font-semibold text-ensena-ink">{formatNaira(studentWallet.promoCredits)}</p>
        </div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Users2 className="size-3.5 text-ensena-success" /> Referral Earnings</p>
          <p className="text-xl font-semibold text-ensena-ink">{formatNaira(studentWallet.referralEarnings)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Recent Transactions</h2>
          <Link href="/student-dashboard/transactions" className="text-xs font-semibold text-ensena-primary hover:underline">View all</Link>
        </div>
        <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
          {recentTransactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <span className={t.direction === "credit" ? "text-ensena-success" : "text-ensena-muted"}>
                  {t.direction === "credit" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div>
                  <p className="font-medium text-ensena-ink">{t.description}</p>
                  <p className="text-xs text-ensena-muted">{t.date}</p>
                </div>
              </div>
              <span className={t.direction === "credit" ? "font-semibold text-ensena-success" : "font-semibold text-ensena-ink"}>
                {t.direction === "credit" ? "+" : "-"}{formatNaira(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Modal open={topUpOpen} onClose={() => setTopUpOpen(false)} title="Top Up Wallet">
        {confirmed ? (
          <p className="py-6 text-center text-sm text-ensena-success">Wallet topped up successfully!</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {topUpAmounts.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmount(String(a))}
                  className="rounded-xl border border-ensena-border py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  {formatNaira(a)}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Or enter a custom amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
            <Button onClick={confirmTopUp} className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
              Confirm Top Up
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
