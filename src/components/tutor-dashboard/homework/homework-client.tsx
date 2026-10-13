"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Paperclip, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  homeworkStatusStyles,
  initialHomework,
  type HomeworkItem,
  type HomeworkStatus,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const filterTabs: (HomeworkStatus | "All")[] = ["All", "Draft", "Scheduled", "Submitted", "Pending Review", "Reviewed"];

export function HomeworkClient() {
  const [items, setItems] = useState<HomeworkItem[]>(initialHomework);
  const [filter, setFilter] = useState<(typeof filterTabs)[number]>("All");
  const [query, setQuery] = useState("");
  const [grading, setGrading] = useState<HomeworkItem | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  const filtered = useMemo(() => {
    return items.filter((h) => {
      const matchesFilter = filter === "All" || h.status === filter;
      const matchesQuery = query.trim() === "" || h.student.toLowerCase().includes(query.toLowerCase()) || h.title.toLowerCase().includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    });
  }, [items, filter, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: items.length };
    for (const tab of filterTabs) {
      if (tab === "All") continue;
      map[tab] = items.filter((h) => h.status === tab).length;
    }
    return map;
  }, [items]);

  function openGrading(item: HomeworkItem) {
    setGrading(item);
    setGrade(item.grade ?? "");
    setFeedback(item.feedback ?? "");
  }

  function submitGrade() {
    if (!grading) return;
    setItems((prev) =>
      prev.map((h) => (h.id === grading.id ? { ...h, status: "Reviewed", grade: grade || "N/A", feedback } : h))
    );
    setGrading(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Homework</h1>
          <p className="mt-1 text-sm text-ensena-muted">Review and grade assignments across all your students.</p>
        </div>
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
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium",
                  filter === tab ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "text-ensena-muted hover:bg-ensena-bg-soft"
                )}
              >
                {tab}
                <span className="text-xs text-ensena-muted">{counts[tab]}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search student or title…"
              className="h-10 w-64 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-2.5">
          {filtered.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-3.5">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{h.title}</p>
                <p className="text-xs text-ensena-muted">
                  {h.student} · {h.subject} · Due {h.deadline}
                </p>
                {h.attachments.length > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-ensena-primary">
                    <Paperclip className="size-3" /> {h.attachments.join(", ")}
                  </p>
                )}
                {h.feedback && <p className="mt-1 text-xs text-ensena-muted">&ldquo;{h.feedback}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-2">
                {h.grade && <span className="text-sm font-semibold text-ensena-ink">{h.grade}</span>}
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", homeworkStatusStyles[h.status])}>
                  {h.status}
                </span>
                {(h.status === "Submitted" || h.status === "Pending Review") && (
                  <Button onClick={() => openGrading(h)} className="h-8 rounded-full bg-ensena-primary px-3.5 text-xs font-semibold text-white">
                    Review
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ClipboardList className="size-8 text-ensena-border" />
            <p className="text-sm font-medium text-ensena-ink">No homework found</p>
            <p className="text-xs text-ensena-muted">Try a different filter or search term.</p>
          </div>
        )}
      </div>

      <Modal open={!!grading} onClose={() => setGrading(null)} title="Grade Assignment">
        {grading && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-ensena-ink">{grading.title}</p>
              <p className="text-xs text-ensena-muted">{grading.student} · {grading.subject}</p>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Grade</span>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. A, 85%"
                className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Feedback</span>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder="Write feedback for the student…"
                className="rounded-lg border border-ensena-border px-3 py-2 text-sm"
              />
            </label>
            <Button
              onClick={submitGrade}
              className="mt-2 h-10 w-full rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to text-sm font-semibold text-white"
            >
              <Send className="size-4" /> Send Feedback
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
