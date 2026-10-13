"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { addDaysToISO, dayOfWeekISO } from "@/lib/booking-slots";
import type { LearningSession, StudentLearningSnapshot, StudyTaskRow } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import { formatTime, kindBadge, kindLabel, platformISODate, weekBounds } from "./learning-utils";
import { useLiveNow, useStudyTasks } from "./live-shared";

type View = "Week" | "Month";

const shortDay = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(Date.parse(`${iso}T12:00:00Z`));
const dayNum = (iso: string) => Number(iso.slice(8));
const longDay = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(Date.parse(`${iso}T12:00:00Z`));
const rangeLabel = (from: string, to: string) => {
  const f = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${f.format(Date.parse(`${from}T12:00:00Z`))} – ${f.format(Date.parse(`${to}T12:00:00Z`))}, ${to.slice(0, 4)}`;
};

/** The student's real study tasks and classes, by week or month. */
export function StudyPlannerReal({ data }: { data: StudentLearningSnapshot }) {
  const me = useStudentIdentity();
  const nowMs = useLiveNow(data.generatedAtMs);
  const todayISO = platformISODate(nowMs);
  const { tasks, toggle, add, remove } = useStudyTasks(data.studyTasks);
  const [view, setView] = useState<View>("Week");
  const [anchor, setAnchor] = useState(todayISO);
  const [selectedDay, setSelectedDay] = useState<string>(todayISO);

  const sessions = data.sessions.filter((s) => s.status !== "cancelled");
  const sessionsOn = (iso: string) => sessions.filter((s) => platformISODate(s.startMs) === iso);
  const tasksOn = (iso: string) => tasks.filter((t) => t.dueDate === iso);
  const overdue = tasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < todayISO);
  const someday = tasks.filter((t) => t.dueDate === null);

  const week = weekBounds(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysToISO(week.start, i));
  const weekTasks = tasks.filter((t) => t.dueDate !== null && t.dueDate >= week.start && t.dueDate <= week.end);
  const weekDone = weekTasks.filter((t) => t.done).length;

  const monthStart = `${anchor.slice(0, 7)}-01`;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.parse(`${monthStart}T12:00:00Z`));
  const leading = (dayOfWeekISO(monthStart) + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0)).getUTCDate();

  function shift(direction: -1 | 1) {
    if (view === "Week") setAnchor(addDaysToISO(anchor, direction * 7));
    else {
      const y = Number(anchor.slice(0, 4));
      const m = Number(anchor.slice(5, 7)) - 1 + direction;
      setAnchor(new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10));
    }
  }

  return (
    <div>
      <Link href="/student-dashboard/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> My Classes
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Study Planner</h1>
          <p className="mt-1 text-sm text-ensena-muted">Your classes and study tasks in one calendar.</p>
        </div>
        <div className="flex rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm">
          {(["Week", "Month"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-full px-4 py-1.5 font-medium", view === v ? "bg-ensena-primary text-white" : "text-ensena-muted hover:text-ensena-ink")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <section className="min-w-0 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous" onClick={() => shift(-1)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next" onClick={() => shift(1)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                <ChevronRight className="size-4" />
              </button>
              <h2 className="ml-1 font-heading text-base font-semibold text-ensena-ink">{view === "Week" ? rangeLabel(week.start, week.end) : monthLabel}</h2>
            </div>
            {anchor !== todayISO && (
              <button type="button" onClick={() => { setAnchor(todayISO); setSelectedDay(todayISO); }} className="text-sm font-semibold text-ensena-primary hover:underline">
                Today
              </button>
            )}
          </div>
          {view === "Week" && weekTasks.length > 0 && (
            <p className="mt-1 text-xs text-ensena-muted">
              {weekDone} of {weekTasks.length} tasks done this week
            </p>
          )}

          {view === "Week" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-7">
              {weekDays.map((iso) => {
                const daySessions = sessionsOn(iso);
                const dayTasks = tasksOn(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDay(iso)}
                    className={cn(
                      "flex min-h-28 flex-col gap-1.5 rounded-xl border p-2 text-left",
                      selectedDay === iso ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft",
                      iso < todayISO && "opacity-70"
                    )}
                  >
                    <span className={cn("text-xs font-semibold", iso === todayISO ? "text-ensena-primary" : "text-ensena-muted")}>
                      {shortDay(iso)} {dayNum(iso)}
                    </span>
                    {daySessions.map((s) => (
                      <span key={s.id} className={cn("truncate rounded-md px-1.5 py-1 text-[11px] font-medium", kindBadge[s.kind])}>
                        {formatTime(s.startMs)} {s.title}
                      </span>
                    ))}
                    {dayTasks.map((t) => (
                      <span key={t.id} className={cn("truncate rounded-md bg-ensena-bg-soft px-1.5 py-1 text-[11px]", t.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>
                        {t.label}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ensena-muted">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {Array.from({ length: leading }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => addDaysToISO(monthStart, i)).map((iso) => {
                  const count = sessionsOn(iso).length;
                  const open = tasksOn(iso).filter((t) => !t.done).length;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDay(iso)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs",
                        selectedDay === iso ? "bg-ensena-primary text-white" : iso === todayISO ? "font-semibold text-ensena-primary ring-1 ring-ensena-primary/40" : "text-ensena-ink hover:bg-ensena-bg-soft"
                      )}
                    >
                      {dayNum(iso)}
                      <span className="flex gap-0.5">
                        {count > 0 && <span className={cn("size-1.5 rounded-full", selectedDay === iso ? "bg-white" : "bg-ensena-primary")} />}
                        {open > 0 && <span className={cn("size-1.5 rounded-full", selectedDay === iso ? "bg-white/70" : "bg-amber-500")} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 flex items-center gap-3 text-[11px] text-ensena-muted">
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-ensena-primary" /> Classes</span>
                <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500" /> Open tasks</span>
              </p>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <DayPanel
            iso={selectedDay}
            isToday={selectedDay === todayISO}
            isPast={selectedDay < todayISO}
            sessions={sessionsOn(selectedDay)}
            tasks={tasksOn(selectedDay)}
            subjects={me.subjects}
            onToggle={toggle}
            onRemove={remove}
            onAdd={(label, subject) => add(label, selectedDay, subject)}
          />
          {overdue.length > 0 && (
            <TaskGroup title="Overdue" tone="text-amber-700" tasks={overdue} onToggle={toggle} onRemove={remove} />
          )}
          {someday.length > 0 && <TaskGroup title="No due date" tasks={someday} onToggle={toggle} onRemove={remove} />}
        </aside>
      </div>
    </div>
  );
}

function TaskLine({ task, onToggle, onRemove }: { task: StudyTaskRow; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  const temp = task.id.startsWith("temp-");
  return (
    <li className="group flex items-start gap-2">
      <input type="checkbox" checked={task.done} disabled={temp} onChange={() => onToggle(task.id)} aria-label={task.label} className="mt-0.5 size-4 shrink-0 rounded border-ensena-border accent-ensena-primary" />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", task.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{task.label}</p>
        {(task.subject || task.dueDate) && (
          <p className="text-xs text-ensena-muted">{[task.subject, task.dueDate ? longDay(task.dueDate) : null].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      {!temp && (
        <button type="button" aria-label={`Delete ${task.label}`} onClick={() => onRemove(task.id)} className="shrink-0 rounded p-0.5 text-ensena-muted opacity-0 hover:text-rose-600 focus:opacity-100 group-hover:opacity-100">
          <Trash2 className="size-3.5" />
        </button>
      )}
    </li>
  );
}

function TaskGroup({ title, tone, tasks, onToggle, onRemove }: { title: string; tone?: string; tasks: StudyTaskRow[]; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className={cn("text-xs font-semibold uppercase tracking-wide", tone ?? "text-ensena-muted")}>{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5">
        {tasks.map((t) => (
          <TaskLine key={t.id} task={t} onToggle={onToggle} onRemove={onRemove} />
        ))}
      </ul>
    </section>
  );
}

function DayPanel({
  iso,
  isToday,
  isPast,
  sessions,
  tasks,
  subjects,
  onToggle,
  onRemove,
  onAdd,
}: {
  iso: string;
  isToday: boolean;
  isPast: boolean;
  sessions: LearningSession[];
  tasks: StudyTaskRow[];
  subjects: string[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (label: string, subject: string | null) => Promise<boolean>;
}) {
  const [label, setLabel] = useState("");
  const [subject, setSubject] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <section className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <h2 className="font-heading text-base font-semibold text-ensena-ink">{isToday ? "Today" : longDay(iso)}</h2>
      {sessions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/student-dashboard/lessons?view=${s.id}`} className="flex items-center gap-2 rounded-xl border border-ensena-border p-2.5 hover:bg-ensena-bg-soft">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", kindBadge[s.kind])}>{kindLabel[s.kind]}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ensena-ink">{s.title}</span>
                <span className="shrink-0 text-xs text-ensena-muted">{formatTime(s.startMs)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 flex flex-col gap-2.5">
        {tasks.map((t) => (
          <TaskLine key={t.id} task={t} onToggle={onToggle} onRemove={onRemove} />
        ))}
      </ul>
      {sessions.length === 0 && tasks.length === 0 && <p className="mt-2 text-sm text-ensena-muted">Nothing planned{isToday ? " today" : " for this day"}.</p>}
      {!isPast && (
        <form
          className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim()) return;
            startTransition(async () => {
              if (await onAdd(label, subject || null)) setLabel("");
            });
          }}
        >
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
            placeholder={`Add a task for ${isToday ? "today" : shortDay(iso)}…`}
            aria-label="New study task"
            className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3.5 text-sm text-ensena-ink outline-none placeholder:text-ensena-muted focus:border-ensena-primary/50"
          />
          <div className="flex gap-2">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className="h-9 min-w-0 flex-1 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink">
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <Button type="submit" loading={pending} disabled={!label.trim()} className="h-9 rounded-full bg-ensena-primary px-3.5 text-xs font-semibold text-white">
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
