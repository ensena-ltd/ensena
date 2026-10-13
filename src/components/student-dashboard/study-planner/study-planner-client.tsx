"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, ClipboardCheck, MoreVertical, Plus, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTodayISO } from "@/hooks/use-today-iso";
import { dayLabel, fullDateLabel } from "@/lib/study-task-helpers";
import { studentStudyTasks as initialStudyTasks, type StudyTask } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const dayChipColors = ["bg-rose-50 text-rose-600", "bg-violet-50 text-violet-600", "bg-amber-50 text-amber-600", "bg-emerald-50 text-emerald-600"];

function TaskRow({ task, onToggle, onDelete }: { task: StudyTask; onToggle: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex items-start gap-3 py-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        onClick={onToggle}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          task.done ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border"
        )}
      >
        {task.done && <span className="text-xs">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", task.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{task.label}</p>
        <div className="mt-1 flex items-center gap-3 text-xs text-ensena-muted">
          <span className="flex items-center gap-1">
            <Video className="size-3.5" /> {task.subject}
          </span>
        </div>
      </div>
      <div className="relative">
        <button type="button" aria-label="Task options" onClick={() => setMenuOpen((v) => !v)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <MoreVertical className="size-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete(); }}
              className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              Delete task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StudyPlannerClient() {
  const todayISO = useTodayISO();
  const [tasks, setTasks] = useState<StudyTask[]>(initialStudyTasks);
  const [dayMenuOpen, setDayMenuOpen] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSubject, setNewSubject] = useState("Mathematics");
  const dayOffsetOptions = useMemo(() => [0, 1, 2, 3, 4, 5, 6].map((offset) => ({ offset, label: dayLabel(todayISO, offset) })), [todayISO]);
  const [newDayLabel, setNewDayLabel] = useState(dayOffsetOptions[0].label);

  // initialStudyTasks is the shared source of truth (also read/written by
  // the dashboard home and the My Classes study-planner tab) — mutate it in
  // place so changes made here stay in sync everywhere else.
  function toggleTask(id: string) {
    const task = initialStudyTasks.find((t) => t.id === id);
    if (!task) return;
    task.done = !task.done;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
  }

  function deleteTask(id: string) {
    const index = initialStudyTasks.findIndex((t) => t.id === id);
    if (index !== -1) initialStudyTasks.splice(index, 1);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function clearDay(dayOffset: number) {
    for (let i = initialStudyTasks.length - 1; i >= 0; i--) {
      if (initialStudyTasks[i].dayOffset === dayOffset) initialStudyTasks.splice(i, 1);
    }
    setTasks((prev) => prev.filter((t) => t.dayOffset !== dayOffset));
    setDayMenuOpen(null);
  }

  function addTask() {
    if (!newLabel.trim()) return;
    const dayOffset = dayOffsetOptions.find((o) => o.label === newDayLabel)?.offset ?? 0;
    const task: StudyTask = { id: `st-${Date.now()}`, label: newLabel.trim(), subject: newSubject, dayOffset, done: false };
    initialStudyTasks.push(task);
    setTasks((prev) => [...prev, task]);
    setNewLabel("");
    setNewDayLabel(dayOffsetOptions[0].label);
    setAddOpen(false);
  }

  const todayTasks = tasks.filter((t) => t.dayOffset === 0);

  const upcomingByDay = useMemo(() => {
    const offsets = [...new Set(tasks.filter((t) => t.dayOffset > 0).map((t) => t.dayOffset))].sort((a, b) => a - b);
    return offsets.map((dayOffset) => ({
      dayOffset,
      label: fullDateLabel(todayISO, dayOffset),
      tasks: tasks.filter((t) => t.dayOffset === dayOffset),
    }));
  }, [tasks, todayISO]);

  return (
    <div>
      <Link href="/student-dashboard/lessons" className="flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        <ArrowLeft className="size-4" /> My Classes
      </Link>

      <div className="mt-3">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Study Planner</h1>
        <p className="mt-1 text-sm text-ensena-muted">Keep track of what you need to study.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-ensena-ink">Today</h2>
                <p className="text-sm text-ensena-muted">{fullDateLabel(todayISO, 0)}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => { setNewDayLabel(dayOffsetOptions[0].label); setAddOpen(true); }}
                className="h-10 rounded-full border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
              >
                <Plus className="size-4" /> Add Study Task
              </Button>
            </div>

            <div className="mt-2 flex flex-col divide-y divide-ensena-border">
              {todayTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />
              ))}
              {todayTasks.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">Nothing to study today. Add a task to get started.</p>}
            </div>
          </div>

          <div className="flex items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-primary/5 p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary">
              <ClipboardCheck className="size-5" />
            </span>
            <div className="text-sm">
              <p className="font-semibold text-ensena-ink">Connected to your classes</p>
              <p className="mt-0.5 text-ensena-muted">Tasks are suggested based on your upcoming classes. You can add, edit or remove tasks anytime.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Upcoming</h2>
          <div className="mt-3 flex flex-col gap-4">
            {upcomingByDay.map(({ dayOffset, label, tasks: dayTasks }, i) => (
              <div key={dayOffset} className="flex gap-3">
                <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", dayChipColors[i % dayChipColors.length])}>
                  <Calendar className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1 border-b border-ensena-border pb-4 last:border-0 last:pb-0">
                  <div className="relative flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ensena-ink">{label}</p>
                    <button
                      type="button"
                      aria-label="Day options"
                      onClick={() => setDayMenuOpen((v) => (v === dayOffset ? null : dayOffset))}
                      className="text-ensena-muted hover:text-ensena-ink"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {dayMenuOpen === dayOffset && (
                      <div className="absolute right-0 top-6 z-20 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => clearDay(dayOffset)}
                          className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Clear all tasks for this day
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {dayTasks.map((task) => (
                      <li key={task.id} className="flex items-center gap-2 text-sm">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={task.done}
                          onClick={() => toggleTask(task.id)}
                          className={cn("flex size-4 shrink-0 items-center justify-center rounded border", task.done ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border")}
                        >
                          {task.done && <span className="text-[10px]">✓</span>}
                        </button>
                        <span className={cn(task.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{task.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-ensena-muted">
                    <Video className="size-3.5" /> {dayTasks[0]?.subject}
                  </p>
                </div>
              </div>
            ))}
            {upcomingByDay.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No upcoming study tasks yet.</p>}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setNewDayLabel(dayOffsetOptions[0].label); setAddOpen(true); }}
        aria-label="Add Task"
        className="fixed bottom-8 right-8 hidden size-14 items-center justify-center rounded-full bg-ensena-primary text-white shadow-lg hover:bg-ensena-primary-hover lg:flex"
      >
        <Plus className="size-6" />
      </button>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Study Task">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">What do you need to study?</span>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Review Algebra notes"
              className="h-11 rounded-xl border border-ensena-border px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="e.g. Mathematics"
              className="h-11 rounded-xl border border-ensena-border px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Date</span>
            <Select value={newDayLabel} onValueChange={(v) => v && setNewDayLabel(v)}>
              <SelectTrigger className="h-11 rounded-xl border-ensena-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayOffsetOptions.map((option) => (
                  <SelectItem key={option.offset} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button onClick={addTask} className="mt-1 h-11 w-full rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white">
            Add Task
          </Button>
        </div>
      </Modal>
    </div>
  );
}
