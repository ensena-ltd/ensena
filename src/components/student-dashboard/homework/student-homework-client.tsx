"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  studentHomeworkList,
  studentHomeworkStatusStyles,
  type StudentHomeworkDetail,
} from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const filterTabs = ["All", "Pending", "Submitted", "Graded", "Late"] as const;

export function StudentHomeworkClient() {
  const [items, setItems] = useState<StudentHomeworkDetail[]>(studentHomeworkList);
  const [filter, setFilter] = useState<(typeof filterTabs)[number]>("All");
  const [query, setQuery] = useState("");
  const [submittingItem, setSubmittingItem] = useState<StudentHomeworkDetail | null>(null);
  const [fileName, setFileName] = useState("");

  const filtered = useMemo(() => {
    return items.filter((h) => {
      const matchesFilter = filter === "All" || h.status === filter;
      const matchesQuery = query.trim() === "" || h.title.toLowerCase().includes(query.toLowerCase()) || h.subject.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [items, filter, query]);

  function submit() {
    if (!submittingItem) return;
    setItems((prev) => prev.map((h) => (h.id === submittingItem.id ? { ...h, status: "Submitted" } : h)));
    setSubmittingItem(null);
    setFileName("");
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Homework</h1>
        <p className="mt-1 text-sm text-ensena-muted">Track and submit assignments from all your tutors.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium",
                  filter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
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
              placeholder="Search homework…"
              className="h-10 w-60 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-3">
          {filtered.map((h) => (
            <li key={h.id} className="rounded-xl border border-ensena-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{h.title}</p>
                  <p className="text-xs text-ensena-muted">{h.subject} · {h.tutor} · Due {h.due}</p>
                </div>
                <div className="flex items-center gap-2">
                  {h.grade && <span className="text-sm font-semibold text-ensena-ink">{h.grade}</span>}
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", studentHomeworkStatusStyles[h.status])}>{h.status}</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-ensena-muted">{h.instructions}</p>
              {h.feedback && (
                <div className="mt-2 rounded-lg bg-ensena-success/10 p-2.5 text-xs text-ensena-ink">
                  <span className="font-semibold">Tutor feedback:</span> {h.feedback}
                </div>
              )}
              {h.status === "Pending" && (
                <Button onClick={() => setSubmittingItem(h)} className="mt-3 h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
                  <Upload className="size-3.5" /> Submit Homework
                </Button>
              )}
            </li>
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No homework matches this filter.</p>}
        </ul>
      </div>

      <Modal open={!!submittingItem} onClose={() => setSubmittingItem(null)} title="Submit Homework">
        {submittingItem && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ensena-muted">{submittingItem.title} · {submittingItem.subject}</p>
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-ensena-border text-sm text-ensena-muted">
              <Upload className="size-5" />
              {fileName || "Click to upload your file"}
              <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
            </label>
            <Button onClick={submit} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              <CheckCircle2 className="size-4" /> Submit
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
