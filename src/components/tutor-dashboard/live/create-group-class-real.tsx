"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createGroupClass } from "@/lib/actions/tutor-teaching";
import { addDaysToISO, dayOfWeekISO } from "@/lib/booking-slots";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

import { platformISODate } from "./teaching-shared";

const WEEKDAYS = [
  { dow: 1, label: "Mon" },
  { dow: 2, label: "Tue" },
  { dow: 3, label: "Wed" },
  { dow: 4, label: "Thu" },
  { dow: 5, label: "Fri" },
  { dow: 6, label: "Sat" },
  { dow: 0, label: "Sun" },
];
const DURATIONS = [30, 45, 60, 75, 90, 120];
const fieldClass = "h-10 rounded-lg border border-ensena-border px-3 text-sm text-ensena-ink";

export function CreateGroupClassReal({
  open,
  onClose,
  approved,
  subjectSuggestions,
  nowMs,
}: {
  open: boolean;
  onClose: () => void;
  approved: boolean;
  subjectSuggestions: string[];
  nowMs: number;
}) {
  const router = useRouter();
  const tomorrow = addDaysToISO(platformISODate(nowMs), 1);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(subjectSuggestions[0] ?? "");
  const [level, setLevel] = useState("");
  const [mode, setMode] = useState("Online");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("10");
  const [startDate, setStartDate] = useState(tomorrow);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState(60);
  const [weeks, setWeeks] = useState("4");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);

  const sessionCount = useMemo(() => {
    const w = Number(weeks);
    if (!startDate || !days.length || !Number.isFinite(w) || w < 1) return 0;
    let n = 0;
    for (let i = 0; i < w * 7; i++) if (days.includes(dayOfWeekISO(addDaysToISO(startDate, i)))) n++;
    return n;
  }, [startDate, days, weeks]);

  function toggleDay(dow: number) {
    setDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  async function submit(publish: boolean) {
    setSaving(publish ? "publish" : "draft");
    const result = await createGroupClass({
      title,
      subject,
      academicLevel: level,
      mode,
      description,
      learningOutcomes: outcomes.split("\n"),
      price: Number(price) || 0,
      seats: Number(seats),
      startDate,
      days,
      time,
      durationMinutes: duration,
      weeks: Number(weeks),
      publish,
    });
    setSaving(null);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't create the class.");
      return;
    }
    toast.success(publish ? "Class published — students can now find it." : "Class saved as a draft. Publish it when you're ready.");
    onClose();
    router.push(`/tutor-dashboard/group-classes/${result.slug}`);
  }

  return (
    <Modal open={open} onClose={() => !saving && onClose()} title="Create a group class">
      <form
        className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(approved);
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
          Class title
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="e.g. WAEC Mathematics Crash Course" className={fieldClass} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value.slice(0, 80))} list="group-class-subjects" className={fieldClass} />
            <datalist id="group-class-subjects">
              {subjectSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Level / class
            <input value={level} onChange={(e) => setLevel(e.target.value.slice(0, 60))} placeholder="e.g. SS3" className={fieldClass} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
          What the class covers
          <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 3000))} rows={3} className="rounded-lg border border-ensena-border p-3 text-sm text-ensena-ink" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
          Learning outcomes (one per line)
          <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} rows={3} placeholder={"Solve quadratic equations\nAnswer WAEC theory questions with confidence"} className="rounded-lg border border-ensena-border p-3 text-sm text-ensena-ink" />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Price per student (₦)
            <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = free" className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Seats
            <input type="number" min={2} max={100} value={seats} onChange={(e) => setSeats(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)} className={fieldClass}>
              <option>Online</option>
              <option>Physical</option>
              <option>Hybrid</option>
            </select>
          </label>
        </div>

        <div>
          <p className="text-xs font-medium text-ensena-muted">Days</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WEEKDAYS.map((d) => (
              <button
                key={d.dow}
                type="button"
                aria-pressed={days.includes(d.dow)}
                onClick={() => toggleDay(d.dow)}
                className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", days.includes(d.dow) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink")}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Starts
            <input type="date" min={tomorrow} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Time (WAT)
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Length
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={fieldClass}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-ensena-muted">
            Weeks
            <input type="number" min={1} max={26} value={weeks} onChange={(e) => setWeeks(e.target.value)} className={fieldClass} />
          </label>
        </div>

        <p className="rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-ink">
          {sessionCount > 0
            ? `${sessionCount} sessions over ${weeks} ${Number(weeks) === 1 ? "week" : "weeks"} · ${Number(price) > 0 ? `${formatNaira(Number(price))} per student` : "Free"} · up to ${seats || 0} students`
            : "Pick the days of the week to see how many sessions this creates."}
        </p>
        {!approved && <p className="text-xs text-amber-700">You can save drafts now and publish once your tutor application is approved.</p>}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" onClick={() => void submit(false)} loading={saving === "draft"} disabled={saving !== null} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
            Save as draft
          </Button>
          {approved && (
            <Button type="submit" loading={saving === "publish"} disabled={saving !== null} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white">
              Publish class
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
