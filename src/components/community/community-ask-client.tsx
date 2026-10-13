"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { academicLevels } from "@/lib/data";
import { createCommunityPost } from "@/lib/community-store";
import { CATEGORY_TO_POST_TYPES, type CommunityCategory } from "@/lib/community-data";
import { activeExams } from "@/lib/exams-data";
import { subjectOptions } from "@/lib/tutors";
import { cn } from "@/lib/utils";

const askCategories: Exclude<CommunityCategory, "All">[] = ["Questions", "Study Tips", "Exams", "Subjects", "Career & Education", "General"];

// Real Enseña identity, not a Community-only account — see the matching
// note in community-data.ts. There's no real cross-page session on public
// pages (the public Header doesn't track login state either), so this page
// is only reachable once the visitor has already been prompted to sign in
// from the feed; a real auth integration would supply the actual name/role
// here instead.
export function CommunityAskClient({ authorName, authorRole }: { authorName: string; authorRole: "Student" | "Tutor" }) {
  const router = useRouter();
  const [category, setCategory] = useState<Exclude<CommunityCategory, "All">>("Questions");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [exam, setExam] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim() !== "" && body.trim() !== "" && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const post = await createCommunityPost({
        authorName,
        authorRole,
        title: title.trim(),
        body: body.trim(),
        type: CATEGORY_TO_POST_TYPES[category][0],
        subject: subject || undefined,
        academicLevel: academicLevel || undefined,
        exam: exam || undefined,
      });
      router.push(`/community/post/${post.id}`);
    } catch {
      setError("We couldn't post this right now. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Ask the Community</h1>
      <p className="mt-1 text-sm text-ensena-muted">What do you need help with?</p>

      <div className="mt-6">
        <p className="text-sm font-semibold text-ensena-ink">Category</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {askCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                category === c ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ensena-ink">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How do I understand quadratic equations?"
          className="h-11 rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
      </label>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Subject</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
            <option value="">Optional</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Academic Level</span>
          <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
            <option value="">Optional</option>
            {academicLevels.map((l) => (
              <option key={l.label} value={l.label}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Exam</span>
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-2 text-sm">
            <option value="">Optional</option>
            {activeExams().map((e) => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-5 flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ensena-ink">Your question</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Explain what you're struggling with…"
          className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
      </label>

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <Button onClick={handleSubmit} disabled={!canSubmit} className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:opacity-50">
        {submitting ? "Posting…" : "Post Question"}
      </Button>
    </div>
  );
}
