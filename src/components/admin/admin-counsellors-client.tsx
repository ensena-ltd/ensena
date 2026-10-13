"use client";

import { useState } from "react";
import { CheckCircle2, PauseCircle, Search, Star, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { adminCounsellorStatusStyles, initialAdminCounsellors, type AdminCounsellor, type AdminCounsellorStatus } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

const statusTabs: (AdminCounsellorStatus | "All")[] = ["All", "Active", "Pending", "Suspended"];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminCounsellorsClient() {
  const [counsellors, setCounsellors] = useState<AdminCounsellor[]>(initialAdminCounsellors);
  const [statusFilter, setStatusFilter] = useState<(typeof statusTabs)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = counsellors.filter((c) => {
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesQuery = query.trim() === "" || c.name.toLowerCase().includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  function setStatus(id: string, status: AdminCounsellorStatus) {
    setCounsellors((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Counsellors</h1>
        <p className="mt-1 text-sm text-ensena-muted">Approve and manage counsellor accounts.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search counsellors…"
              className="h-10 w-64 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.id} className="rounded-xl border border-ensena-border p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ensena-ink">{c.name}</p>
                  <p className="truncate text-xs text-ensena-muted">{c.email}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", adminCounsellorStatusStyles[c.status])}>{c.status}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-ensena-bg-soft p-2">
                  <p className="font-semibold text-ensena-ink">{c.studentsHelped}</p>
                  <p className="text-ensena-muted">Students</p>
                </div>
                <div className="rounded-lg bg-ensena-bg-soft p-2">
                  <p className="flex items-center justify-center gap-0.5 font-semibold text-ensena-ink">
                    {c.rating > 0 ? c.rating : "N/A"} {c.rating > 0 && <Star className="size-3 fill-amber-400 text-amber-400" />}
                  </p>
                  <p className="text-ensena-muted">Rating</p>
                </div>
                <div className="rounded-lg bg-ensena-bg-soft p-2">
                  <p className="font-semibold text-ensena-ink">{c.sessionsThisMonth}</p>
                  <p className="text-ensena-muted">This Month</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {c.status === "Pending" && (
                  <>
                    <Button onClick={() => setStatus(c.id, "Active")} className="h-8 flex-1 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">
                      <CheckCircle2 className="size-3.5" /> Approve
                    </Button>
                    <Button variant="outline" onClick={() => setStatus(c.id, "Suspended")} className="h-8 flex-1 rounded-full border-ensena-border text-xs font-medium text-rose-600">
                      <XCircle className="size-3.5" /> Reject
                    </Button>
                  </>
                )}
                {c.status === "Active" && (
                  <Button variant="outline" onClick={() => setStatus(c.id, "Suspended")} className="h-8 flex-1 rounded-full border-ensena-border text-xs font-medium text-amber-600">
                    <PauseCircle className="size-3.5" /> Suspend
                  </Button>
                )}
                {c.status === "Suspended" && (
                  <Button onClick={() => setStatus(c.id, "Active")} className="h-8 flex-1 rounded-full bg-ensena-success text-xs font-semibold text-white hover:bg-ensena-success/90">
                    <CheckCircle2 className="size-3.5" /> Reinstate
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No counsellors match this filter.</p>}
      </div>
    </div>
  );
}
