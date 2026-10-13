"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { formatNaira } from "@/lib/format";
import { discoverySessionStats, discoverySessionStatusStyles, type DiscoverySessionStatus } from "@/lib/discovery-sessions-data";
import { cn } from "@/lib/utils";

const statusTabs: (DiscoverySessionStatus | "All")[] = ["All", "Upcoming", "Completed", "Cancelled", "No Show"];

export function AdminDiscoverySessionsClient() {
  const router = useRouter();
  const discoverySessions = useAllDiscoverySessions();
  const [statusFilter, setStatusFilter] = useState<(typeof statusTabs)[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = discoverySessions.filter((d) => {
    const matchesStatus = statusFilter === "All" || d.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      d.student.toLowerCase().includes(q) ||
      d.tutor.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q) ||
      d.bookingReference.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  function openSession(id: string, e: React.MouseEvent) {
    const href = `/admin/discovery-sessions/${id}`;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  }

  const topTutors = Array.from(new Set(discoverySessions.map((d) => d.tutor))).slice(0, 4);
  const topSubjects = Array.from(new Set(discoverySessions.map((d) => d.subject))).slice(0, 4);

  const tutorConversion = new Map<string, { completed: number; continued: number }>();
  for (const d of discoverySessions) {
    if (d.status !== "Completed") continue;
    const cur = tutorConversion.get(d.tutor) ?? { completed: 0, continued: 0 };
    cur.completed += 1;
    if (d.continued) cur.continued += 1;
    tutorConversion.set(d.tutor, cur);
  }
  const topConvertingTutors = [...tutorConversion.entries()]
    .filter(([, v]) => v.completed > 0)
    .map(([tutor, v]) => ({ tutor, pct: Math.round((v.continued / v.completed) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Discovery Sessions</h1>
        <p className="mt-1 text-sm text-ensena-muted">Short free intro sessions that help students find the right tutor before committing to lessons.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.total}</p><p className="text-[11px] text-ensena-muted">Total Sessions</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.upcoming}</p><p className="text-[11px] text-ensena-muted">Upcoming</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-success">{discoverySessionStats.completed}</p><p className="text-[11px] text-ensena-muted">Completed</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-rose-600">{discoverySessionStats.cancelled}</p><p className="text-[11px] text-ensena-muted">Cancelled</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-amber-600">{discoverySessionStats.noShows}</p><p className="text-[11px] text-ensena-muted">No Shows</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{formatNaira(discoverySessionStats.revenue)}</p><p className="text-[11px] text-ensena-muted">Revenue</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.conversionRatePct}%</p><p className="text-[11px] text-ensena-muted">Conversion Rate</p></div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-amber-600">{formatNaira(discoverySessionStats.escrowPending)}</p><p className="text-[11px] text-ensena-muted">Escrow Pending</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-success">{discoverySessionStats.studentsContinuing}</p><p className="text-[11px] text-ensena-muted">Students Continuing</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-rose-600">{discoverySessionStats.studentsDroppingOff}</p><p className="text-[11px] text-ensena-muted">Students Dropping Off</p></div>
        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5"><p className="text-lg font-semibold text-ensena-ink">{discoverySessionStats.avgTimeToContinueDays}d</p><p className="text-[11px] text-ensena-muted">Avg. Time to Continue</p></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
          {statusTabs.map((s) => (
            <button key={s} type="button" onClick={() => setStatusFilter(s)} className={cn("rounded-full px-3.5 py-1.5 font-medium transition-colors", statusFilter === s ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, tutor, subject, Lesson ID…"
            className="h-10 w-72 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Date &amp; Time</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} onClick={(e) => openSession(d.id, e)} className="cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={d.studentImage} alt={d.student} fill sizes="28px" className="object-cover" /></div>
                      <span className="text-ensena-ink">{d.student}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-ink">{d.tutor}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{d.subject}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{d.date}, {d.time}</td>
                  <td className="py-3 pr-4 text-ensena-ink">{formatNaira(d.price)}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", discoverySessionStatusStyles[d.status])}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No discovery sessions match this filter.</p>}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-ensena-border p-3.5">
            <p className="text-xs font-semibold text-ensena-ink">Top Tutors by Discovery Sessions</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs">
              {topTutors.map((t) => <li key={t} className="text-ensena-ink">{t}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-ensena-border p-3.5">
            <p className="text-xs font-semibold text-ensena-ink">Top Converting Tutors</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs">
              {topConvertingTutors.map((t) => (
                <li key={t.tutor} className="flex items-center justify-between text-ensena-ink">
                  <span>{t.tutor}</span>
                  <span className="font-semibold text-ensena-success">{t.pct}%</span>
                </li>
              ))}
              {topConvertingTutors.length === 0 && <li className="text-ensena-muted">Not enough data yet.</li>}
            </ul>
          </div>
          <div className="rounded-xl border border-ensena-border p-3.5">
            <p className="text-xs font-semibold text-ensena-ink">Top Subjects</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-xs">
              {topSubjects.map((s) => <li key={s} className="text-ensena-ink">{s}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
