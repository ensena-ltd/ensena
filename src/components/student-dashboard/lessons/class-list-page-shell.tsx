"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClassListRow, type ClassKind, type ClassListItem } from "@/components/student-dashboard/lessons/class-list-row";

const ALL = "All";
const sortOptions = ["Date (Earliest)", "Date (Latest)"] as const;
const PAGE_SIZE = 6;

// Shared shell for the three "view all" pages (Upcoming / Active /
// Completed) — same header, back link, filter tabs, sort, card list and
// Load More pagination everywhere; only which items get passed in changes.
export function ClassListPageShell({
  title,
  subtitle,
  kinds,
  items,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  kinds: ClassKind[];
  items: ClassListItem[];
  emptyLabel: string;
}) {
  const [filter, setFilter] = useState<ClassKind | typeof ALL>(ALL);
  const [sort, setSort] = useState<(typeof sortOptions)[number]>(sortOptions[0]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = (filter === ALL ? items : items.filter((i) => i.kind === filter))
    .slice()
    .sort((a, b) => (sort === "Date (Earliest)" ? a.sortTime - b.sortTime : b.sortTime - a.sortTime));

  const visible = filtered.slice(0, visibleCount);
  const counts: Record<string, number> = { [ALL]: items.length };
  kinds.forEach((k) => { counts[k] = items.filter((i) => i.kind === k).length; });

  return (
    <div>
      <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        <ArrowLeft className="size-4" /> My Classes
      </Link>

      <div className="mt-3">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{title}</h1>
        <p className="mt-1 text-sm text-ensena-muted">{subtitle}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[ALL, ...kinds].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setFilter(tab as ClassKind | typeof ALL); setVisibleCount(PAGE_SIZE); }}
              className={
                filter === tab
                  ? "rounded-full bg-ensena-primary/10 px-3.5 py-1.5 text-sm font-semibold text-ensena-primary"
                  : "rounded-full px-3.5 py-1.5 text-sm font-medium text-ensena-muted hover:bg-ensena-bg-soft"
              }
            >
              {tab} ({counts[tab] ?? 0})
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ensena-muted">
          Sort by:
          <Select value={sort} onValueChange={(v) => v && setSort(v as (typeof sortOptions)[number])}>
            <SelectTrigger className="h-9 rounded-lg border-ensena-border text-sm font-medium text-ensena-ink">
              <ArrowUpDown className="size-3.5 shrink-0 text-ensena-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {visible.map((item) => (
          <ClassListRow key={item.id} item={item} />
        ))}
        {filtered.length === 0 && <p className="rounded-2xl border border-dashed border-ensena-border p-10 text-center text-sm text-ensena-muted">{emptyLabel}</p>}
      </div>

      {filtered.length > 0 && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-ensena-muted">
            Showing {visible.length} of {filtered.length} {title.toLowerCase()}
          </p>
          {visible.length < filtered.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="h-10 rounded-full border border-ensena-border px-6 text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
