"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Calendar, CalendarDays, Clock, Search, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PLATFORM_TIMEZONE } from "@/lib/platform-time";
import { cn } from "@/lib/utils";

import { platformISODate } from "./learning-utils";
import { PersonAvatar } from "./live-shared";

// Mobile-only "My Classes" (below lg, where the bottom tab bar shows).
// Desktop keeps MyClassesReal's own section layout untouched; this is the
// separate mobile design — Upcoming / Completed / Cancelled tabs with
// counts, search, subject / type / sort filters and one card style — fed
// from the same live snapshot, with every button wired to the same real
// actions (details modal, classroom, pay, confirm, review).

export type MobileClassKind = "Private Class" | "Group Class" | "Discovery Session" | "Counselling";

const kindTint: Record<MobileClassKind, string> = {
  "Private Class": "bg-rose-50 text-rose-700",
  "Group Class": "bg-[#CBEFFF] text-[#1E7BA6]",
  "Discovery Session": "bg-violet-50 text-violet-700",
  Counselling: "bg-amber-50 text-amber-700",
};

export interface MobileClassItem {
  id: string;
  kind: MobileClassKind;
  subject: string;
  participant: string;
  avatarSrc: string | null;
  dateLabel: string;
  timeLabel: string;
  statusLabel: string;
  statusTint: string;
  sortMs: number;
  onDetails: () => void;
  /** Extra context, e.g. a cancellation reason or refund. */
  noteText?: string;
  joinHref?: string;
  /** Why Join Class is disabled (payment, entry window not open yet). */
  joinDisabledHint?: ReactNode;
  /** A real action in place of Join Class (Pay now, Confirm Lesson, Leave Review). */
  primaryAction?: { label: string; onClick: () => void; loading?: boolean };
}

const pillDate = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: PLATFORM_TIMEZONE, ...opts });

/** "Today" / "Tomorrow" / "Jul 9, 2026" — the date line on the mobile cards. */
export function mobileDateLabel(ms: number, nowMs: number): string {
  const diff = Math.round((Date.parse(platformISODate(ms)) - Date.parse(platformISODate(nowMs))) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return pillDate({ month: "short", day: "numeric", year: "numeric" }).format(ms);
}

function MobileClassCard({ item }: { item: MobileClassItem }) {
  return (
    <article className="rounded-2xl border border-ensena-border bg-white p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar name={item.participant} image={item.avatarSrc} className="size-14" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", kindTint[item.kind])}>{item.kind}</span>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", item.statusTint)}>{item.statusLabel}</span>
          </div>
          <h3 className="mt-1.5 break-words font-heading text-base font-bold text-ensena-ink">{item.subject}</h3>
          <p className="break-words text-sm text-ensena-muted">with {item.participant}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
        <span className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-ensena-muted" /> <span className="break-words">{item.dateLabel}</span>
        </span>
        <span className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-ensena-muted" /> <span className="break-words">{item.timeLabel}</span>
        </span>
      </div>

      {item.noteText && <p className="mt-2 text-xs text-ensena-muted">{item.noteText}</p>}
      {item.joinHref && item.joinDisabledHint && <p className="mt-2 text-xs font-medium text-ensena-primary">{item.joinDisabledHint}</p>}

      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          onClick={item.onDetails}
          className="h-11 flex-1 rounded-full border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
        >
          View Details
        </Button>
        {item.joinHref && !item.primaryAction && (
          <Button
            nativeButton={false}
            disabled={!!item.joinDisabledHint}
            render={<Link href={item.joinHref} />}
            className="h-11 flex-[1.4] rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:pointer-events-none disabled:opacity-50"
          >
            <Video className="size-4" /> Join Class
          </Button>
        )}
        {item.primaryAction && (
          <Button onClick={item.primaryAction.onClick} loading={item.primaryAction.loading} className="h-11 flex-[1.4] rounded-full bg-ensena-primary text-sm font-semibold text-white">
            {item.primaryAction.label}
          </Button>
        )}
      </div>
    </article>
  );
}

export const mobileTabs = ["Upcoming", "Active", "Completed", "Cancelled", "Study Planner"] as const;
export type MobileTab = (typeof mobileTabs)[number];
type ClassTab = Exclude<MobileTab, "Study Planner">;

const tabCopy: Record<ClassTab, { heading: string; subtitle: string; empty: ReactNode }> = {
  Upcoming: {
    heading: "Upcoming Classes",
    subtitle: "Your scheduled learning sessions.",
    empty: (
      <>
        Nothing scheduled yet.{" "}
        <Link href="/student-dashboard/find-a-tutor" className="font-semibold text-ensena-primary hover:underline">Book a lesson</Link>
      </>
    ),
  },
  Active: { heading: "Active Classes", subtitle: "Your ongoing lesson series and group classes.", empty: "No active classes right now." },
  Completed: { heading: "Completed Classes", subtitle: "Classes you've already attended.", empty: "No completed classes yet." },
  Cancelled: { heading: "Cancelled Classes", subtitle: "Cancelled bookings are kept here for your records.", empty: "No cancelled classes." },
};

const sortOptions = ["Upcoming First", "Date (Latest)"] as const;
const typeFilters = ["All Class Types", "Private Class", "Group Class", "Discovery Session", "Counselling"] as const;

export function MyClassesMobile({
  upcoming,
  active,
  completed,
  cancelled,
  plannerCount,
  planner,
  tab,
  onTabChange,
}: {
  upcoming: MobileClassItem[];
  active: MobileClassItem[];
  completed: MobileClassItem[];
  cancelled: MobileClassItem[];
  /** Open study tasks, shown as the Study Planner tab's count. */
  plannerCount: number;
  /** The Study Planner tab's content. */
  planner: ReactNode;
  tab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}) {
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [typeFilter, setTypeFilter] = useState<(typeof typeFilters)[number]>("All Class Types");
  const [sort, setSort] = useState<(typeof sortOptions)[number]>("Upcoming First");

  const byTab: Record<ClassTab, MobileClassItem[]> = { Upcoming: upcoming, Active: active, Completed: completed, Cancelled: cancelled };
  const counts: Record<MobileTab, number> = { Upcoming: upcoming.length, Active: active.length, Completed: completed.length, Cancelled: cancelled.length, "Study Planner": plannerCount };
  const subjects = useMemo(() => Array.from(new Set([...upcoming, ...active, ...completed, ...cancelled].map((i) => i.subject))).sort(), [upcoming, active, completed, cancelled]);

  const isPlanner = tab === "Study Planner";
  const q = query.trim().toLowerCase();
  const visible = (isPlanner ? [] : byTab[tab])
    .filter(
      (i) =>
        (q === "" || i.subject.toLowerCase().includes(q) || i.participant.toLowerCase().includes(q)) &&
        (subjectFilter === "All Subjects" || i.subject === subjectFilter) &&
        (typeFilter === "All Class Types" || i.kind === typeFilter)
    )
    .sort((a, b) => (sort === "Upcoming First" ? a.sortMs - b.sortMs : b.sortMs - a.sortMs));

  const copy = isPlanner ? null : tabCopy[tab];
  const selectClass = "h-9 shrink-0 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink";

  return (
    <div className="lg:hidden">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">Your upcoming and ongoing learning sessions.</p>
      </div>

      {/* Five tabs don't fit a phone's width, so the row scrolls sideways. */}
      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {mobileTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={cn("shrink-0 whitespace-nowrap border-b-2 pb-2.5 pt-1 transition-colors", tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
          >
            {t} <span className="text-xs">({counts[t]})</span>
          </button>
        ))}
      </div>

      {isPlanner ? (
        planner
      ) : (
      <>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by subject or tutor name…"
          className="h-11 w-full rounded-full border border-ensena-border bg-ensena-surface pl-10 pr-4 text-sm"
        />
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <select aria-label="Filter by subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={selectClass}>
          <option>All Subjects</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select aria-label="Filter by class type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={selectClass}>
          {typeFilters.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectClass}>
          {sortOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Link
          href="/student-dashboard/study-planner"
          aria-label="View calendar"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Calendar className="size-4" />
        </Link>
      </div>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-semibold text-ensena-ink">{copy!.heading}</h2>
        <p className="mt-0.5 text-sm text-ensena-muted">{copy!.subtitle}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {visible.map((item) => (
          <MobileClassCard key={item.id} item={item} />
        ))}
        {visible.length === 0 && <p className="rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">{copy!.empty}</p>}
      </div>
      </>
      )}
    </div>
  );
}
