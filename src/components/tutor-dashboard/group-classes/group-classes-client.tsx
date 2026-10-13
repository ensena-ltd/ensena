"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Globe,
  Hash,
  MoreVertical,
  Plus,
  Search,
  Settings,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { CreateGroupClassModal } from "@/components/tutor-dashboard/group-classes/create-group-class-modal";
import { buildBookingReference, isValidBookingReference } from "@/lib/booking-reference";
import { useTodayISO } from "@/hooks/use-today-iso";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useGroupClassSubmissions } from "@/hooks/use-group-class-submissions";
import { formatNaira } from "@/lib/format";
import { submissionToMyGroupClass } from "@/lib/group-class-submission-store";
import {
  buildGroupClassCohorts,
  dashboardTutor,
  initialMyGroupClasses,
  toISO,
  type MyGroupClass,
  type MyGroupClassCohort,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function splitSchedule(schedule: string): { days: string; time: string } {
  const [days, time] = schedule.split(" · ");
  return { days: days ?? schedule, time: time ?? "" };
}

function formatDateRange(cohort: MyGroupClassCohort): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weeks = Math.round((new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime()) / (7 * 86_400_000));
  return `${fmt(cohort.startDate)} – ${new Date(cohort.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${weeks} weeks)`;
}

const groupClassTabs = ["Active", "Completed"] as const;
type GroupClassTab = (typeof groupClassTabs)[number];

// Group classes tracked with real cohort data (Classes > Group Classes) —
// classes still going through the old Draft/Submitted verification
// workflow (used elsewhere, e.g. admin) simply don't have cohort data and
// aren't shown here, matching the simplified MVP design.
export function GroupClassesClient() {
  const todayISO = useTodayISO();
  const cohortData = useMemo(() => buildGroupClassCohorts(todayISO), [todayISO]);

  const submissions = useGroupClassSubmissions();
  // submissionToMyGroupClass reads real enrollment counts (via
  // extraSeatsFilled) as a side effect of being called, not from
  // `submissions` itself — so this memo also has to depend on the
  // enrollments store, or a new enrollment would never trigger a recompute
  // and the seat count shown here would silently go stale.
  const enrollments = useGroupClassEnrollments();
  const mySubmissions = useMemo(
    () => submissions.filter((s) => s.tutorName === dashboardTutor.name),
    [submissions]
  );
  const classes = useMemo<MyGroupClass[]>(
    () => [...initialMyGroupClasses, ...mySubmissions.map(submissionToMyGroupClass)],
    [mySubmissions, enrollments]
  );
  const pendingSubmissions = useMemo(
    () => mySubmissions.filter((s) => s.status === "Pending Review" || s.status === "Changes Requested" || s.status === "Rejected"),
    [mySubmissions]
  );
  const [activeTab, setActiveTab] = useState<GroupClassTab>("Active");
  const [cohortOverrides, setCohortOverrides] = useState<Record<string, MyGroupClassCohort>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Full" | "Open">("All");
  const [sortBy, setSortBy] = useState<"Next Class" | "Name">("Next Class");
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleCohortFor, setScheduleCohortFor] = useState<MyGroupClass | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  // Completed classes get their own tab (below) rather than flowing through
  // the Active list's cohort machinery — a class that already finished has
  // no "current"/"next" cohort to track, so it's tracked by status alone.
  const completedClasses = useMemo(() => classes.filter((c) => c.status === "Completed"), [classes]);
  const activeSourceClasses = useMemo(() => classes.filter((c) => c.status !== "Completed"), [classes]);

  const withCohorts = useMemo(() => {
    return activeSourceClasses.flatMap((c) => {
      const base = cohortData[c.id] ?? (c.currentCohort ? { currentCohort: c.currentCohort, nextCohort: c.nextCohort ?? null } : undefined);
      if (!base) return [];
      const nextCohort = cohortOverrides[c.id] ?? base.nextCohort;
      return [{ ...c, currentCohort: base.currentCohort, nextCohort }];
    });
  }, [activeSourceClasses, cohortData, cohortOverrides]);

  const filtered = useMemo(() => {
    let list = withCohorts.filter((c) => {
      const matchesQuery = query.trim() === "" || c.title.toLowerCase().includes(query.toLowerCase()) || c.subject.toLowerCase().includes(query.toLowerCase());
      const isFull = c.currentCohort!.seatsFilled >= c.currentCohort!.seatsTotal;
      const matchesStatus = statusFilter === "All" || (statusFilter === "Full" ? isFull : !isFull);
      return matchesQuery && matchesStatus;
    });
    list = [...list];
    if (sortBy === "Name") list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => new Date(a.currentCohort!.startDate).getTime() - new Date(b.currentCohort!.startDate).getTime());
    return list;
  }, [withCohorts, query, statusFilter, sortBy]);

  // Schedule Next Cohort form state
  const [cohortStart, setCohortStart] = useState("");
  const [cohortEnd, setCohortEnd] = useState("");
  const [cohortMax, setCohortMax] = useState(10);

  function openScheduleCohort(cls: MyGroupClass) {
    setScheduleCohortFor(cls);
    setCohortStart("");
    setCohortEnd("");
    setCohortMax(cls.currentCohort?.seatsTotal ?? 10);
    setOpenMenuId(null);
  }

  function confirmScheduleCohort() {
    if (!scheduleCohortFor || !cohortStart || !cohortEnd) return;
    setCohortOverrides((prev) => ({
      ...prev,
      [scheduleCohortFor.id]: { startDate: toISO(new Date(cohortStart)), endDate: toISO(new Date(cohortEnd)), seatsFilled: 0, seatsTotal: cohortMax },
    }));
    setScheduleCohortFor(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Group Classes</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your active group classes, current and upcoming cohorts.</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
        >
          <Plus className="size-4" /> Create Group Class
        </Button>
      </div>

      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groupClassTabs.map((tab) => {
          const count = tab === "Active" ? withCohorts.length : completedClasses.length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
                activeTab === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
              )}
            >
              {tab} <span className="text-xs text-ensena-muted">({count})</span>
            </button>
          );
        })}
      </div>

      {activeTab === "Completed" ? (
        <div className="mt-5">
          {completedClasses.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface py-16 text-center">
              <CheckCircle2 className="size-8 text-ensena-border" />
              <p className="text-sm font-medium text-ensena-ink">No completed group classes yet</p>
              <p className="text-xs text-ensena-muted">Classes you&apos;ve already finished teaching will show up here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0 divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
              {completedClasses.map((cls) => (
                <div key={cls.id} className="flex flex-wrap items-center gap-4 p-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cls.color}1A`, color: cls.color }}>
                    <Users className="size-5" />
                  </span>
                  <div className="min-w-[160px] flex-1">
                    <p className="text-sm font-semibold text-ensena-ink">{cls.title}</p>
                    <p className="text-xs text-ensena-muted">{cls.subject} · {cls.schedule}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ensena-muted">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700">
                        <CheckCircle2 className="size-3" /> Completed
                      </span>
                      <span>{cls.students.length} students</span>
                      <span>·</span>
                      <span>{formatNaira(cls.revenue)} earned</span>
                      <span>·</span>
                      <span>{cls.attendanceRate}% attendance</span>
                    </div>
                  </div>
                  <Link
                    href={`/tutor-dashboard/group-classes/${slugify(cls.title)}`}
                    className="rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    View Class
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <>
      {pendingSubmissions.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {pendingSubmissions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{s.title}</p>
                <p className="text-xs text-ensena-muted">
                  Submitted {s.submittedAt}
                  {s.status === "Rejected" && s.rejectionReason ? ` · ${s.rejectionReason}` : ""}
                  {s.status === "Changes Requested" && s.changeRequestNote ? ` · ${s.changeRequestNote}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                  s.status === "Pending Review" && "bg-amber-100 text-amber-700",
                  s.status === "Changes Requested" && "bg-blue-100 text-blue-700",
                  s.status === "Rejected" && "bg-rose-100 text-rose-700"
                )}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search group classes…"
            className="h-11 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="Full">Full</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
          <option value="Next Class">Sort by: Next Class</option>
          <option value="Name">Sort by: Name</option>
        </select>
        <Link
          href="/tutor-dashboard/private-lessons?tab=Schedule"
          aria-label="View calendar"
          className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Calendar className="size-4" />
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface py-16 text-center">
          <Users className="size-8 text-ensena-border" />
          <p className="text-sm font-medium text-ensena-ink">No group classes found</p>
          <p className="text-xs text-ensena-muted">Try a different filter or search term.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {filtered.map((cls) => {
            const { days, time } = splitSchedule(cls.schedule.includes("·") ? cls.schedule : `${cls.schedule} · `);
            const current = cls.currentCohort!;
            const next = cls.nextCohort;
            const currentPct = Math.round((current.seatsFilled / current.seatsTotal) * 100);
            const currentFull = current.seatsFilled >= current.seatsTotal;
            const nextPct = next ? Math.round((next.seatsFilled / next.seatsTotal) * 100) : 0;
            const roster = cls.students.slice(0, current.seatsFilled);
            const belowMinimum = cls.minStudents != null && current.seatsFilled < cls.minStudents;

            return (
              <div key={cls.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_1fr_1fr_180px]">
                  {/* Class info */}
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${cls.color}1A`, color: cls.color }}>
                        <Users className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-heading text-base font-semibold text-ensena-ink">{cls.title}</h2>
                        <p className="text-sm font-medium" style={{ color: cls.color }}>{cls.subject}</p>
                        <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", currentFull ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                          <span className={cn("size-1.5 rounded-full", currentFull ? "bg-rose-500" : "bg-emerald-500")} /> {currentFull ? "Full" : "Active"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1.5 text-xs text-ensena-muted">
                      <span className="flex items-center gap-1.5"><Calendar className="size-3.5 shrink-0" /> {days}</span>
                      <span className="flex items-center gap-1.5"><Clock className="size-3.5 shrink-0" /> {time}</span>
                      <span className="flex items-center gap-1.5"><Globe className="size-3.5 shrink-0" /> Online</span>
                      <span className="flex items-center gap-1.5"><Coins className="size-3.5 shrink-0" /> {formatNaira(cls.price)} / session</span>
                      <span className="flex items-center gap-1.5"><Users className="size-3.5 shrink-0" /> Max {current.seatsTotal} students</span>
                      <span className="flex items-center gap-1.5 font-mono"><Hash className="size-3.5 shrink-0" /> {isValidBookingReference(cls.id) ? cls.id : buildBookingReference("class", cls.id)}</span>
                    </div>
                  </div>

                  {/* Current cohort */}
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ensena-ink">Current Cohort</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", currentFull ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                        {currentFull ? "Full" : "In Progress"}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ensena-muted">{formatDateRange(current)}</p>
                    <p className="mt-1 text-xs text-ensena-muted">{current.seatsFilled} / {current.seatsTotal} students enrolled</p>
                    {belowMinimum && (
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                        <AlertTriangle className="size-3.5 shrink-0" /> Below minimum: {cls.minStudents} required
                      </p>
                    )}
                    {roster.length > 0 && (
                      <div className="mt-2 flex items-center -space-x-1.5">
                        {roster.slice(0, 5).map((s) => (
                          <span key={s.name} className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-ensena-primary/10 text-[9px] font-semibold text-ensena-primary">
                            {initials(s.name)}
                          </span>
                        ))}
                        {roster.length > 5 && (
                          <span className="flex size-6 items-center justify-center rounded-full border-2 border-white bg-ensena-bg-soft text-[9px] font-semibold text-ensena-ink">
                            +{roster.length - 5}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                        <div className={cn("h-full rounded-full", currentFull ? "bg-rose-500" : "bg-emerald-500")} style={{ width: `${currentPct}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-ensena-muted">{currentPct}% full</span>
                    </div>
                    <Link
                      href={`/tutor-dashboard/group-classes/${slugify(cls.title)}`}
                      className="mt-2.5 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      View Cohort Details
                    </Link>
                  </div>

                  {/* Next cohort */}
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ensena-ink">Next Cohort</p>
                      {next && (
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", nextPct < 20 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700")}>
                          {nextPct < 20 ? "Open for Enrollment" : "Starts Soon"}
                        </span>
                      )}
                    </div>
                    {next ? (
                      <>
                        <p className="mt-1.5 text-xs text-ensena-muted">{formatDateRange(next)}</p>
                        <p className="mt-1 text-xs text-ensena-muted">{next.seatsFilled} / {next.seatsTotal} students enrolled</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${nextPct}%` }} />
                          </div>
                          <span className="text-[11px] font-medium text-ensena-muted">{nextPct}% full</span>
                        </div>
                        <Link
                          href={`/tutor-dashboard/group-classes/${slugify(cls.title)}`}
                          className="mt-2.5 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                        >
                          View Next Cohort
                        </Link>
                      </>
                    ) : (
                      <>
                        <span className="mt-1.5 inline-block rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-semibold text-ensena-muted">Not Scheduled</span>
                        <p className="mt-2 text-xs text-ensena-muted">No next cohort scheduled yet. Create the next cohort to keep your class running.</p>
                        <button
                          type="button"
                          onClick={() => openScheduleCohort(cls)}
                          className="mt-2.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/15"
                        >
                          <Plus className="size-3.5" /> Schedule Next Cohort
                        </button>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 lg:items-stretch">
                    <p className="hidden text-sm font-semibold text-ensena-ink lg:block">Actions</p>
                    <Link
                      href={`/tutor-dashboard/group-classes/${slugify(cls.title)}`}
                      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5"
                    >
                      <Settings className="size-3.5" /> Manage Class
                    </Link>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/tutor-dashboard/classroom/group/${cls.id}`} />}
                      className="h-9 rounded-full border border-ensena-border bg-ensena-surface text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      <Video className="size-3.5" /> Enter Classroom
                    </Button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === cls.id ? null : cls.id)}
                        className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                      >
                        <MoreVertical className="size-3.5" /> More
                      </button>
                      {openMenuId === cls.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} aria-hidden="true" />
                          <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                            {!next && (
                              <button type="button" onClick={() => openScheduleCohort(cls)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                                <Plus className="size-3.5" /> Schedule Next Cohort
                              </button>
                            )}
                            <Link href={`/tutor-dashboard/group-classes/${slugify(cls.title)}`} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                              <Users className="size-3.5" /> View Students
                            </Link>
                            <Link href="/tutor-dashboard/earnings" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                              <Coins className="size-3.5" /> View Earnings
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-ensena-muted">
            Showing 1 to {filtered.length} of {filtered.length} group classes
          </p>
        </div>
      )}
      </>
      )}

      {/* Create Group Class modal */}
      <CreateGroupClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        tutorName={dashboardTutor.name}
        tutorImage={dashboardTutor.image}
        onSubmitted={flash}
      />

      {/* Schedule Next Cohort modal */}
      <Modal open={!!scheduleCohortFor} onClose={() => setScheduleCohortFor(null)} title="Schedule Next Cohort" widthClassName="max-w-xl">
        {scheduleCohortFor && (
          <div className="flex flex-col gap-3">
            <p className="-mt-1 text-xs text-ensena-muted">
              {scheduleCohortFor.title} · {scheduleCohortFor.schedule}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Start date</span>
                <input type="date" value={cohortStart} onChange={(e) => setCohortStart(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">End date</span>
                <input type="date" value={cohortEnd} min={cohortStart} onChange={(e) => setCohortEnd(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Maximum students</span>
              <input type="number" min={2} value={cohortMax} onChange={(e) => setCohortMax(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <p className="text-xs text-ensena-muted">Days of the week, class time and price per session stay the same as this class&apos;s existing schedule.</p>
            <Button
              onClick={confirmScheduleCohort}
              disabled={!cohortStart || !cohortEnd}
              className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-50"
            >
              Schedule Cohort
            </Button>
          </div>
        )}
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
