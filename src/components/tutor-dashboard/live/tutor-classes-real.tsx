"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ban, Calendar, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Compass, MessageSquare, MoreHorizontal, Plus, Search, Users, Users2, Video, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { markDiscoveryCompleted } from "@/lib/actions/tutor-teaching";
import { addDaysToISO, dayOfWeekISO } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import { platformWallTimeToMs } from "@/lib/platform-time";
import type { TeachingDiscovery, TeachingGroupClass, TeachingLesson, TeachingSnapshot } from "@/lib/tutor-teaching-server";
import { cn } from "@/lib/utils";

import { CreateGroupClassReal } from "./create-group-class-real";
import {
  EmptyState,
  PersonAvatar,
  StatusBadge,
  canTutorEnter,
  dayLabel,
  entryOpensAt,
  formatShortDate,
  formatTime,
  formatTimeRange,
  fullWhen,
  lessonDisplay,
  platformISODate,
  useLiveNow,
} from "./teaching-shared";
import { useLessonActions } from "./use-lesson-actions";

const viewTabs = ["Schedule", "Lessons", "Group Classes", "Discovery Sessions"] as const;
export type ClassesTab = (typeof viewTabs)[number];
const tabLabels: Record<ClassesTab, string> = { Schedule: "Schedule", Lessons: "Private Classes", "Group Classes": "Group Classes", "Discovery Sessions": "Discovery Sessions" };

function resolveTab(raw: string | null, fallback: ClassesTab): ClassesTab {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "calendar") return "Schedule";
  return viewTabs.find((t) => t.toLowerCase() === normalized) ?? fallback;
}

/** Monday of the platform week containing `iso`. */
function mondayOf(iso: string): string {
  return addDaysToISO(iso, -((dayOfWeekISO(iso) + 6) % 7));
}

function isoStartMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return platformWallTimeToMs(y, m, d, 0, 0);
}

interface ScheduleEvent {
  key: string;
  kind: "private" | "group" | "discovery" | "blocked";
  startMs: number;
  endMs: number;
  title: string;
  subtitle: string;
  status: string;
  enterHref: string | null;
  detailHref: string | null;
}

const kindStyle: Record<ScheduleEvent["kind"], string> = {
  private: "border-l-ensena-primary",
  group: "border-l-[#2F9BE0]",
  discovery: "border-l-violet-500",
  blocked: "border-l-ensena-border bg-ensena-bg-soft",
};

function buildEvents(data: TeachingSnapshot, nowMs: number): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  for (const l of data.lessons) {
    if (l.status === "Cancelled" || l.holdExpired) continue;
    events.push({
      key: `p-${l.id}`,
      kind: "private",
      startMs: l.startMs,
      endMs: l.endMs,
      title: l.subject,
      subtitle: `Private · ${l.studentName}`,
      status: lessonDisplay(l, nowMs),
      enterHref: `/tutor-dashboard/classroom/private/${l.id}`,
      detailHref: `/tutor-dashboard/private-lessons/${l.id}`,
    });
  }
  for (const c of data.groupClasses) {
    if (c.status === "Cancelled") continue;
    for (const k of c.cohorts) {
      for (const s of k.sessions) {
        if (s.status === "Cancelled") continue;
        events.push({
          key: `g-${s.id}`,
          kind: "group",
          startMs: s.startMs,
          endMs: s.endMs,
          title: c.title,
          subtitle: `Group · Session ${s.number} · ${k.roster.filter((r) => r.status === "Active").length}/${k.seatsTotal} students`,
          status: c.status === "Draft" ? "Draft" : s.status,
          enterHref: c.status === "Published" ? `/tutor-dashboard/classroom/group/${c.id}` : null,
          detailHref: `/tutor-dashboard/group-classes/${c.slug}`,
        });
      }
    }
  }
  for (const d of data.discovery) {
    if (d.status === "Cancelled") continue;
    events.push({
      key: `d-${d.id}`,
      kind: "discovery",
      startMs: d.startMs,
      endMs: d.endMs,
      title: d.subject ? `Discovery · ${d.subject}` : "Discovery Session",
      subtitle: d.studentName,
      status: d.status,
      enterHref: `/tutor-dashboard/classroom/discovery/${d.id}`,
      detailHref: null,
    });
  }
  for (const b of data.blocked) {
    events.push({ key: `b-${b.id}`, kind: "blocked", startMs: b.startMs, endMs: b.endMs, title: "Blocked time", subtitle: b.reason ?? "Not bookable", status: "", enterHref: null, detailHref: "/tutor-dashboard/profile?tab=Availability" });
  }
  return events.sort((a, b) => a.startMs - b.startMs);
}

export function TutorClassesReal({ data, defaultTab = "Schedule" }: { data: TeachingSnapshot; defaultTab?: ClassesTab }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<ClassesTab>(() => resolveTab(tabParam, defaultTab));
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setView(resolveTab(tabParam, defaultTab));
  }
  const nowMs = useLiveNow(data.generatedAtMs);
  const [createOpen, setCreateOpen] = useState(false);

  const events = useMemo(() => buildEvents(data, nowMs), [data, nowMs]);
  const weekStart = mondayOf(platformISODate(nowMs));
  const weekFrom = isoStartMs(weekStart);
  const weekTo = isoStartMs(addDaysToISO(weekStart, 7));
  const thisWeek = events.filter((e) => e.kind !== "blocked" && e.startMs >= weekFrom && e.startMs < weekTo);

  const statCards = [
    { icon: Calendar, iconClass: "bg-rose-100 text-rose-700", cardClass: "bg-rose-50/60 border-rose-100", label: "Classes This Week", value: thisWeek.length },
    { icon: Users, iconClass: "bg-blue-100 text-blue-700", cardClass: "bg-blue-50/60 border-blue-100", label: "Private Lessons", value: thisWeek.filter((e) => e.kind === "private").length },
    { icon: Users2, iconClass: "bg-violet-100 text-violet-700", cardClass: "bg-violet-50/60 border-violet-100", label: "Group Sessions", value: thisWeek.filter((e) => e.kind === "group").length },
    { icon: Compass, iconClass: "bg-amber-100 text-amber-700", cardClass: "bg-amber-50/60 border-amber-100", label: "Discovery Sessions", value: thisWeek.filter((e) => e.kind === "discovery").length },
  ];

  const subjectSuggestions = [...new Set([...data.lessons.map((l) => l.subject), ...data.groupClasses.map((c) => c.subject)])];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Classes</h1>
          <p className="mt-1 text-sm text-ensena-muted">Your schedule, private lessons, group classes and discovery sessions.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tutor-dashboard/profile?tab=Availability" className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <CalendarClock className="size-4" /> Availability
          </Link>
          <Button onClick={() => setCreateOpen(true)} className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white">
            <Plus className="size-4" /> Group Class
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn("rounded-2xl border p-4", stat.cardClass)}>
              <span className={cn("flex size-9 items-center justify-center rounded-xl", stat.iconClass)}>
                <Icon className="size-4.5" />
              </span>
              <p className="mt-3 text-sm text-ensena-ink">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-ensena-border">
        {viewTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setView(t);
              window.history.replaceState(null, "", `/tutor-dashboard/private-lessons?tab=${encodeURIComponent(t)}`);
            }}
            className={cn("shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium", view === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {view === "Schedule" && <ScheduleView events={events} nowMs={nowMs} />}
        {view === "Lessons" && <LessonsView lessons={data.lessons} nowMs={nowMs} />}
        {view === "Group Classes" && <GroupClassesView classes={data.groupClasses} nowMs={nowMs} onCreate={() => setCreateOpen(true)} />}
        {view === "Discovery Sessions" && <DiscoveryView sessions={data.discovery} nowMs={nowMs} />}
      </div>

      <CreateGroupClassReal open={createOpen} onClose={() => setCreateOpen(false)} approved={data.approved} subjectSuggestions={subjectSuggestions} nowMs={nowMs} />
    </div>
  );
}

// ── Schedule ───────────────────────────────────────────────────────────

function ScheduleView({ events, nowMs }: { events: ScheduleEvent[]; nowMs: number }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const todayISO = platformISODate(nowMs);
  const monday = addDaysToISO(mondayOf(todayISO), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToISO(monday, i));
  const sunday = days[6];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous week" onClick={() => setWeekOffset((w) => w - 1)} className="flex size-9 items-center justify-center rounded-full border border-ensena-border hover:bg-ensena-bg-soft">
            <ChevronLeft className="size-4" />
          </button>
          <button type="button" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)} className="flex size-9 items-center justify-center rounded-full border border-ensena-border hover:bg-ensena-bg-soft">
            <ChevronRight className="size-4" />
          </button>
          <p className="text-sm font-semibold text-ensena-ink">
            {formatShortDate(isoStartMs(monday))} – {formatShortDate(isoStartMs(sunday))}
          </p>
        </div>
        {weekOffset !== 0 && (
          <button type="button" onClick={() => setWeekOffset(0)} className="text-xs font-semibold text-ensena-primary hover:underline">
            Back to this week
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {days.map((iso) => {
          const from = isoStartMs(iso);
          const to = isoStartMs(addDaysToISO(iso, 1));
          const dayEvents = events.filter((e) => e.startMs < to && e.endMs > from);
          const isToday = iso === todayISO;
          return (
            <section key={iso} className={cn("rounded-2xl border bg-ensena-surface p-4", isToday ? "border-ensena-primary/40" : "border-ensena-border")}>
              <h3 className={cn("text-sm font-semibold", isToday ? "text-ensena-primary" : "text-ensena-ink")}>
                {isToday ? "Today · " : ""}
                {dayLabel(from + 12 * 3_600_000)}
              </h3>
              {dayEvents.length === 0 ? (
                <p className="mt-1 text-xs text-ensena-muted">Nothing scheduled.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {dayEvents.map((e) => {
                    const enterable = e.enterHref && (e.status === "Upcoming" || e.status === "Scheduled" || e.status === "Awaiting payment") && canTutorEnter(e.startMs, e.endMs, nowMs);
                    return (
                      <li key={e.key} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-l-4 border-ensena-border p-3", kindStyle[e.kind])}>
                        <div className="w-28 shrink-0 text-xs font-semibold text-ensena-ink">{e.kind === "blocked" ? `${formatTime(Math.max(e.startMs, from))} – ${formatTime(Math.min(e.endMs, to))}` : formatTimeRange(e)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ensena-ink">{e.title}</p>
                          <p className="truncate text-xs text-ensena-muted">{e.subtitle}</p>
                        </div>
                        {e.status && <StatusBadge status={e.status} />}
                        {enterable ? (
                          <Button nativeButton={false} render={<Link href={e.enterHref!} />} className="h-8 rounded-full bg-ensena-primary px-3 text-xs font-semibold text-white">
                            <Video className="size-3.5" /> Enter
                          </Button>
                        ) : e.detailHref ? (
                          <Link href={e.detailHref} className="text-xs font-semibold text-ensena-primary hover:underline">
                            {e.kind === "blocked" ? "Edit" : "Details"}
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ── Private lessons ────────────────────────────────────────────────────

const lessonFilters = ["Upcoming", "Needs completing", "Completed", "Cancelled"] as const;
type LessonFilter = (typeof lessonFilters)[number];

function matchesFilter(l: TeachingLesson, f: LessonFilter, nowMs: number): boolean {
  const d = lessonDisplay(l, nowMs);
  if (f === "Upcoming") return d === "Upcoming" || d === "Awaiting payment";
  return d === f;
}

function LessonsView({ lessons, nowMs }: { lessons: TeachingLesson[]; nowMs: number }) {
  const [filter, setFilter] = useState<LessonFilter>("Upcoming");
  const [query, setQuery] = useState("");
  const actions = useLessonActions();
  const q = query.trim().toLowerCase();
  const list = lessons
    .filter((l) => matchesFilter(l, filter, nowMs))
    .filter((l) => !q || l.studentName.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q) || (l.bookingReference ?? "").toLowerCase().includes(q))
    .sort((a, b) => (filter === "Upcoming" || filter === "Needs completing" ? a.startMs - b.startMs : b.startMs - a.startMs));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {lessonFilters.map((f) => {
            const count = lessons.filter((l) => matchesFilter(l, f, nowMs)).length;
            return (
              <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", filter === f ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted hover:text-ensena-ink")}>
                {f} ({count})
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search student, subject, reference" className="h-9 w-full rounded-full border border-ensena-border pl-9 pr-3 text-sm" />
        </div>
      </div>

      {filter === "Needs completing" && list.length > 0 && (
        <p className="mt-3 rounded-xl bg-sky-50 p-3 text-xs text-sky-900">
          These lessons have ended but were never closed from the classroom. Mark them complete so your student can confirm and your earnings can be released.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {list.length === 0 ? (
          <EmptyState icon={<CalendarDays className="size-8 text-ensena-border" />} title={q ? "No lessons match your search" : `No ${filter.toLowerCase()} lessons`}>
            {filter === "Upcoming" && !q && "When students book private lessons with you, they'll appear here."}
          </EmptyState>
        ) : (
          list.map((l) => <LessonCard key={l.id} lesson={l} nowMs={nowMs} actions={actions} />)
        )}
      </div>
      {actions.modals}
    </div>
  );
}

function LessonCard({ lesson: l, nowMs, actions }: { lesson: TeachingLesson; nowMs: number; actions: ReturnType<typeof useLessonActions> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const display = lessonDisplay(l, nowMs);
  const changeable = (display === "Upcoming" || display === "Awaiting payment") && l.startMs > nowMs;
  const enterable = (display === "Upcoming" || display === "Awaiting payment") && canTutorEnter(l.startMs, l.endMs, nowMs);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PersonAvatar name={l.studentName} image={l.studentImage} className="size-11" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/tutor-dashboard/private-lessons/${l.id}`} className="truncate text-sm font-semibold text-ensena-ink hover:underline">
              {l.subject}
            </Link>
            <StatusBadge status={display} />
          </div>
          <p className="truncate text-xs text-ensena-muted">
            <Link href={`/tutor-dashboard/students/${l.studentId}`} className="hover:underline">
              {l.studentName}
            </Link>
            {l.totalSessions && l.totalSessions > 1 ? ` · Session ${l.sessionNumber} of ${l.totalSessions}` : ""}
          </p>
          <p className="text-xs text-ensena-muted">
            {fullWhen(l.startMs)} · {l.durationMinutes} min · {l.mode}
            {l.price > 0 && ` · ${formatNaira(l.price)}`}
          </p>
          {display === "Cancelled" && l.cancellationReason && <p className="mt-0.5 text-xs text-rose-600">Reason: {l.cancellationReason}</p>}
          {l.confirmation && (
            <p className="mt-0.5 text-xs text-ensena-muted">
              {l.confirmation.status === "Disputed" ? "Student reported a problem — under review" : l.confirmation.escrow === "Released" ? "Payment released" : "Waiting for the student's confirmation"}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {enterable ? (
          <Button nativeButton={false} render={<Link href={`/tutor-dashboard/classroom/private/${l.id}`} />} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
            <Video className="size-3.5" /> Enter Classroom
          </Button>
        ) : display === "Needs completing" ? (
          <Button onClick={() => actions.complete(l)} loading={actions.completingId === l.id} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
            <CheckCircle2 className="size-3.5" /> Mark complete
          </Button>
        ) : changeable ? (
          <span className="text-[11px] text-ensena-muted">{entryOpensHint(entryOpensAt(l.startMs), nowMs)}</span>
        ) : null}
        <Link href={`/tutor-dashboard/messages?student=${l.studentId}`} aria-label={`Message ${l.studentName}`} className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
          <MessageSquare className="size-4" />
        </Link>
        <div className="relative">
          <button type="button" aria-label="More actions" onClick={() => setMenuOpen((v) => !v)} className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
              <Link href={`/tutor-dashboard/private-lessons/${l.id}`} className="block rounded-lg px-3 py-2 text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                View details
              </Link>
              {changeable && (
                <>
                  <button type="button" onClick={() => { setMenuOpen(false); actions.reschedule(l); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                    <CalendarClock className="size-4" /> Reschedule
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); actions.cancel(l); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50">
                    <XCircle className="size-4" /> Cancel lesson
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Group classes ──────────────────────────────────────────────────────

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function cohortLine(days: number[], time: string | null): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const dayText = order.filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ");
  if (!time) return dayText;
  const [h, m] = time.split(":").map(Number);
  return `${dayText} · ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function GroupClassesView({ classes, nowMs, onCreate }: { classes: TeachingGroupClass[]; nowMs: number; onCreate: () => void }) {
  const [show, setShow] = useState<"Active" | "Past">("Active");
  const isPast = (c: TeachingGroupClass) => c.status === "Cancelled" || c.status === "Completed" || c.cohorts.every((k) => k.sessions.every((s) => s.endMs <= nowMs || s.status !== "Scheduled"));
  const list = classes.filter((c) => (show === "Past" ? isPast(c) : !isPast(c)));

  return (
    <div>
      <div className="flex gap-1.5">
        {(["Active", "Past"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setShow(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", show === f ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted hover:text-ensena-ink")}>
            {f} ({classes.filter((c) => (f === "Past" ? isPast(c) : !isPast(c))).length})
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {list.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState icon={<Users2 className="size-8 text-ensena-border" />} title={show === "Active" ? "No active group classes" : "No past group classes"}>
              {show === "Active" && (
                <>
                  Teach several students at once on a fixed schedule.{" "}
                  <button type="button" onClick={onCreate} className="font-semibold text-ensena-primary hover:underline">
                    Create a group class
                  </button>
                </>
              )}
            </EmptyState>
          </div>
        ) : (
          list.map((c) => {
            const cohort = c.cohorts[c.cohorts.length - 1];
            const active = cohort?.roster.filter((r) => r.status === "Active").length ?? 0;
            const next = cohort?.sessions.find((s) => s.status === "Scheduled" && s.endMs > nowMs);
            const done = cohort?.sessions.filter((s) => s.status === "Completed").length ?? 0;
            const pct = cohort?.seatsTotal ? Math.min(100, Math.round((active / cohort.seatsTotal) * 100)) : 0;
            return (
              <div key={c.id} className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/tutor-dashboard/group-classes/${c.slug}`} className="block truncate text-sm font-semibold text-ensena-ink hover:underline">
                      {c.title}
                    </Link>
                    <p className="truncate text-xs text-ensena-muted">{[c.subject, c.academicLevel, c.mode].filter(Boolean).join(" · ")}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                {cohort && (
                  <>
                    <p className="mt-2 text-xs text-ensena-ink">{cohortLine(cohort.days, cohort.time)}</p>
                    <p className="text-xs text-ensena-muted">
                      {done}/{cohort.sessions.length} sessions done · {cohort.price > 0 ? formatNaira(cohort.price) : "Free"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-ensena-muted">
                        {active}/{cohort.seatsTotal} students
                      </span>
                      {next && <span className="text-ensena-ink">Next: {fullWhen(next.startMs)}</span>}
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ensena-border">
                      <div className="h-full rounded-full bg-ensena-success" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
                <div className="mt-3 flex gap-2">
                  <Link href={`/tutor-dashboard/group-classes/${c.slug}`} className="flex h-9 flex-1 items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                    Manage class
                  </Link>
                  {next && c.status === "Published" && canTutorEnter(next.startMs, next.endMs, nowMs) && (
                    <Link href={`/tutor-dashboard/classroom/group/${c.id}`} className="flex h-9 flex-1 items-center justify-center gap-1 rounded-full bg-ensena-primary text-xs font-semibold text-white">
                      <Video className="size-3.5" /> Enter
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Discovery sessions ─────────────────────────────────────────────────

function DiscoveryView({ sessions, nowMs }: { sessions: TeachingDiscovery[]; nowMs: number }) {
  const router = useRouter();
  const [show, setShow] = useState<"Upcoming" | "Past">("Upcoming");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const upcoming = sessions.filter((d) => d.status === "Scheduled" && d.endMs > nowMs).sort((a, b) => a.startMs - b.startMs);
  const past = sessions.filter((d) => !(d.status === "Scheduled" && d.endMs > nowMs)).sort((a, b) => b.startMs - a.startMs);
  const list = show === "Upcoming" ? upcoming : past;

  function complete(d: TeachingDiscovery) {
    setCompletingId(d.id);
    startTransition(async () => {
      const result = await markDiscoveryCompleted(d.id);
      setCompletingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "We couldn't update this session.");
        return;
      }
      toast.success("Discovery session marked complete.");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {(["Upcoming", "Past"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setShow(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium", show === f ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted hover:text-ensena-ink")}>
            {f} ({f === "Upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-ensena-muted">Short intro sessions where a new student meets you before booking regular lessons.</p>
      <div className="mt-4 flex flex-col gap-3">
        {list.length === 0 ? (
          <EmptyState icon={<Compass className="size-8 text-ensena-border" />} title={show === "Upcoming" ? "No upcoming discovery sessions" : "No past discovery sessions"}>
            {show === "Upcoming" && "Turn on Discovery Sessions in your Public Profile so new students can book one."}
          </EmptyState>
        ) : (
          list.map((d) => {
            const needsCompleting = d.status === "Scheduled" && d.endMs <= nowMs;
            const enterable = d.status === "Scheduled" && canTutorEnter(d.startMs, d.endMs, nowMs);
            return (
              <div key={d.id} className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <PersonAvatar name={d.studentName} image={d.studentImage} className="size-11" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-ensena-ink">{d.subject || "Discovery Session"}</p>
                      <StatusBadge status={needsCompleting ? "Needs completing" : d.status} />
                    </div>
                    <p className="truncate text-xs text-ensena-muted">{d.studentName}</p>
                    <p className="text-xs text-ensena-muted">
                      {fullWhen(d.startMs)} · {Math.round((d.endMs - d.startMs) / 60_000)} min
                      {d.bookingReference && ` · ${d.bookingReference}`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {enterable ? (
                    <Button nativeButton={false} render={<Link href={`/tutor-dashboard/classroom/discovery/${d.id}`} />} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
                      <Video className="size-3.5" /> Enter
                    </Button>
                  ) : needsCompleting ? (
                    <Button onClick={() => complete(d)} loading={completingId === d.id} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
                      <CheckCircle2 className="size-3.5" /> Mark complete
                    </Button>
                  ) : d.status === "Cancelled" ? (
                    <Ban className="size-4 text-ensena-muted" />
                  ) : null}
                  {d.studentId && (
                    <>
                      <Link href={`/tutor-dashboard/students/${d.studentId}`} className="flex h-9 items-center rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        Student
                      </Link>
                      <Link href={`/tutor-dashboard/messages?student=${d.studentId}`} aria-label={`Message ${d.studentName}`} className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
                        <MessageSquare className="size-4" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
