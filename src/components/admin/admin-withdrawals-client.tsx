"use client";

import { useState } from "react";
import { CheckCircle2, PauseCircle, XCircle } from "lucide-react";

import { formatNaira } from "@/lib/format";
import { initialAdminWithdrawals, withdrawalStatusStyles, type AdminWithdrawal, type WithdrawalStatus } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

const statusTabs: (WithdrawalStatus | "All")[] = ["All", "Pending", "Approved", "Held", "Rejected"];

export function AdminWithdrawalsClient() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>(initialAdminWithdrawals);
  const [statusFilter, setStatusFilter] = useState<(typeof statusTabs)[number]>("All");

  const filtered = withdrawals.filter((w) => statusFilter === "All" || w.status === statusFilter);
  const totalPending = withdrawals.filter((w) => w.status === "Pending").reduce((s, w) => s + w.amount, 0);

  function setStatus(id: string, status: WithdrawalStatus) {
    setWithdrawals((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Withdrawals</h1>
        <p className="mt-1 text-sm text-ensena-muted">Approve, reject, or hold tutor withdrawal requests.</p>
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
        <p className="text-xs text-ensena-muted">Pending Payouts</p>
        <p className="text-xl font-semibold text-amber-600">{formatNaira(totalPending)}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium",
                statusFilter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Method</th>
                <th className="py-2 pr-4 font-medium">Requested</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-ensena-ink">{w.tutor}</td>
                  <td className="py-3 pr-4 text-ensena-ink">{formatNaira(w.amount)}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{w.method}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{w.requestedDate}</td>
                  <td className="py-3 pr-4">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", withdrawalStatusStyles[w.status])}>{w.status}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      {w.status !== "Approved" && (
                        <button type="button" title="Approve" onClick={() => setStatus(w.id, "Approved")} className="flex size-7 items-center justify-center rounded-full text-ensena-success hover:bg-ensena-success/10">
                          <CheckCircle2 className="size-4" />
                        </button>
                      )}
                      {w.status !== "Held" && (
                        <button type="button" title="Hold" onClick={() => setStatus(w.id, "Held")} className="flex size-7 items-center justify-center rounded-full text-blue-600 hover:bg-blue-100">
                          <PauseCircle className="size-4" />
                        </button>
                      )}
                      {w.status !== "Rejected" && (
                        <button type="button" title="Reject" onClick={() => setStatus(w.id, "Rejected")} className="flex size-7 items-center justify-center rounded-full text-rose-600 hover:bg-rose-100">
                          <XCircle className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No withdrawals match this filter.</p>}
        </div>
      </div>
    </div>
  );
}
