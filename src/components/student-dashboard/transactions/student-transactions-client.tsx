"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { formatNaira } from "@/lib/format";
import { studentTransactions } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const typeFilters = ["All", "Private Lesson", "Group Class", "Refund", "Top Up"] as const;

const statusStyles: Record<string, string> = {
  Completed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-rose-100 text-rose-700",
};

function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentTransactionsClient() {
  const [filter, setFilter] = useState<(typeof typeFilters)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return studentTransactions.filter((t) => {
      const matchesFilter = filter === "All" || t.type === filter;
      const matchesQuery = query.trim() === "" || t.description.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  function exportCsv() {
    const rows: (string | number)[][] = [
      ["Date", "Description", "Type", "Amount", "Status"],
      ...filtered.map((t) => [t.date, t.description, t.type, t.amount, t.status]),
    ];
    downloadCsv(rows, "ensena-transactions.csv");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Transactions</h1>
          <p className="mt-1 text-sm text-ensena-muted">Your full payment history on Ensena.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Download className="size-4" /> Export CSV
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {typeFilters.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium",
                  filter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions…"
              className="h-10 w-60 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 pr-4 text-ensena-muted">{t.date}</td>
                  <td className="py-2.5 pr-4 font-medium text-ensena-ink">{t.description}</td>
                  <td className="py-2.5 pr-4 text-ensena-muted">{t.type}</td>
                  <td className={cn("py-2.5 pr-4 font-medium", t.direction === "credit" ? "text-ensena-success" : "text-ensena-ink")}>
                    {t.direction === "credit" ? "+" : "-"}{formatNaira(t.amount)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusStyles[t.status])}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No transactions match this filter.</p>}
        </div>
      </div>
    </div>
  );
}
