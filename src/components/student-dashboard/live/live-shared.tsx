"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useNowMs } from "@/hooks/use-now-ms";
import { addStudyTask, deleteStudyTask, setStudyTaskDone, submitTutorReview } from "@/lib/actions/student-learning";
import type { CompletedLesson, StudyTaskRow } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

/**
 * Live clock for the real dashboard pages. useNowMs() starts at 0 until
 * mount (SSR-safe); falling back to the server's own snapshot time keeps
 * the first render meaningful instead of treating every class as "ended".
 */
export function useLiveNow(generatedAtMs: number): number {
  const nowMs = useNowMs();
  return nowMs || generatedAtMs;
}

/**
 * Study tasks with optimistic updates. Props are re-seeded whenever the
 * server sends a fresh list (each action revalidates the dashboard).
 */
export function useStudyTasks(initial: StudyTaskRow[]) {
  const [source, setSource] = useState(initial);
  const [tasks, setTasks] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setTasks(initial);
  }

  async function toggle(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    const result = await setStudyTaskDone(id, !task.done);
    if (!result.ok) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: task.done } : t)));
      toast.error(result.message ?? "Couldn't update that task.");
    }
  }

  async function add(label: string, dueDate: string | null, subject?: string | null): Promise<boolean> {
    const tempId = `temp-${Date.now()}`;
    setTasks((prev) => [...prev, { id: tempId, label: label.trim(), subject: subject ?? null, dueDate, done: false }]);
    const result = await addStudyTask({ label, dueDate, subject });
    if (!result.ok || !result.id) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      toast.error(result.message ?? "Couldn't add that task.");
      return false;
    }
    setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...t, id: result.id! } : t)));
    return true;
  }

  async function remove(id: string) {
    const before = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const result = await deleteStudyTask(id);
    if (!result.ok) {
      setTasks(before);
      toast.error(result.message ?? "Couldn't delete that task.");
    }
  }

  return { tasks, toggle, add, remove };
}

export function PersonAvatar({ name, image, className, grayscale }: { name: string; image: string | null; className?: string; grayscale?: boolean }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary", grayscale && "grayscale", className ?? "size-10")}>
      {image ? <Image src={image} alt={name} fill sizes="64px" className="object-cover" /> : (name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function TaskCheckboxList({
  tasks,
  onToggle,
  onRemove,
  empty,
}: {
  tasks: StudyTaskRow[];
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
  empty: string;
}) {
  if (tasks.length === 0) return <p className="text-sm text-ensena-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <li key={task.id} className="group flex items-start gap-2">
          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={task.done}
              disabled={task.id.startsWith("temp-")}
              onChange={() => onToggle(task.id)}
              className="mt-0.5 size-4 shrink-0 rounded border-ensena-border accent-ensena-primary"
            />
            <span className={task.done ? "text-ensena-muted line-through" : "text-ensena-ink"}>{task.label}</span>
          </label>
          {onRemove && !task.id.startsWith("temp-") && (
            <button
              type="button"
              aria-label={`Delete ${task.label}`}
              onClick={() => onRemove(task.id)}
              className="shrink-0 rounded p-0.5 text-ensena-muted opacity-0 transition-opacity hover:text-rose-600 focus:opacity-100 group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AddTaskForm({ onAdd, defaultDue, showDate }: { onAdd: (label: string, dueDate: string | null) => Promise<boolean>; defaultDue: string; showDate?: boolean }) {
  const [label, setLabel] = useState("");
  const [due, setDue] = useState(defaultDue);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        startTransition(async () => {
          if (await onAdd(label, due || null)) setLabel("");
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add a study task…"
        aria-label="New study task"
        maxLength={200}
        className="h-9 min-w-0 flex-1 basis-40 rounded-full border border-ensena-border bg-ensena-surface px-3.5 text-sm text-ensena-ink outline-none placeholder:text-ensena-muted focus:border-ensena-primary/50"
      />
      {showDate && (
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
          className="h-9 rounded-full border border-ensena-border bg-ensena-surface px-3 text-sm text-ensena-ink outline-none"
        />
      )}
      <Button type="submit" loading={pending} disabled={!label.trim()} className="h-9 rounded-full bg-ensena-primary px-3.5 text-xs font-semibold text-white">
        <Plus className="size-3.5" /> Add
      </Button>
    </form>
  );
}

export function ReviewModal({ lesson, onClose }: { lesson: CompletedLesson | null; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  function close() {
    setRating(0);
    setHover(0);
    setComment("");
    onClose();
  }

  function submit() {
    if (!lesson || rating === 0) return;
    startTransition(async () => {
      const result = await submitTutorReview({ bookingId: lesson.id, bookingType: lesson.bookingType, rating, comment });
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't save your review.");
        return;
      }
      toast.success(`Thanks! Your review for ${lesson.tutorName} is live.`);
      close();
      router.refresh();
    });
  }

  return (
    <Modal open={!!lesson} onClose={close} title="Review your lesson">
      {lesson && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <PersonAvatar name={lesson.tutorName} image={lesson.tutorImage} className="size-11" />
            <div>
              <p className="text-sm font-semibold text-ensena-ink">{lesson.subject}</p>
              <p className="text-xs text-ensena-muted">with {lesson.tutorName}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-ensena-ink">How was it?</p>
            <div className="mt-1.5 flex gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                  <Star className={cn("size-7", n <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Tell other students about your lesson (optional)</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={submit} loading={pending} disabled={rating === 0} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            Submit review
          </Button>
        </div>
      )}
    </Modal>
  );
}
