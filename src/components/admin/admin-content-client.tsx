"use client";

import { useState } from "react";
import { Image as ImageIcon, ListChecks, Plus, School, Trash2 } from "lucide-react";

import { contentAcademicLevels, contentBanners, contentFaqs, contentSubjects } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

const tabs = ["Banners", "FAQs", "Subjects", "Academic Levels"] as const;
type Tab = (typeof tabs)[number];

export function AdminContentClient() {
  const [tab, setTab] = useState<Tab>("Banners");
  const [banners, setBanners] = useState(contentBanners);
  const [faqs, setFaqs] = useState(contentFaqs);
  const [addFaqOpen, setAddFaqOpen] = useState(false);
  const [newFaq, setNewFaq] = useState("");
  const [subjects, setSubjects] = useState(contentSubjects);
  const [addSubjectOpen, setAddSubjectOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");

  function toggleBanner(title: string) {
    setBanners((prev) => prev.map((b) => (b.title === title ? { ...b, active: !b.active } : b)));
  }

  function deleteFaq(faq: string) {
    setFaqs((prev) => prev.filter((f) => f !== faq));
  }

  function addFaq() {
    if (!newFaq.trim()) return;
    setFaqs((prev) => [...prev, newFaq.trim()]);
    setNewFaq("");
    setAddFaqOpen(false);
  }

  function addSubject() {
    if (!newSubject.trim() || subjects.includes(newSubject.trim())) return;
    setSubjects((prev) => [...prev, newSubject.trim()]);
    setNewSubject("");
    setAddSubjectOpen(false);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Content Management</h1>
        <p className="mt-1 text-sm text-ensena-muted">Homepage banners, FAQs, subjects, and academic levels.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 font-medium",
              tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        {tab === "Banners" && (
          <ul className="flex flex-col gap-2.5">
            {banners.map((b) => (
              <li key={b.title} className="flex items-center justify-between rounded-xl border border-ensena-border p-3.5 text-sm">
                <span className="flex items-center gap-2 text-ensena-ink"><ImageIcon className="size-4 text-ensena-muted" /> {b.title}</span>
                <button
                  type="button"
                  onClick={() => toggleBanner(b.title)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    b.active ? "bg-emerald-100 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted"
                  )}
                >
                  {b.active ? "Active" : "Inactive"}
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "FAQs" && (
          <ul className="flex flex-col gap-2.5">
            {faqs.map((f) => (
              <li key={f} className="flex items-center justify-between rounded-xl border border-ensena-border p-3.5 text-sm">
                <span className="flex items-center gap-2 text-ensena-ink"><ListChecks className="size-4 text-ensena-muted" /> {f}</span>
                <button type="button" aria-label="Delete FAQ" onClick={() => deleteFaq(f)} className="text-ensena-muted hover:text-rose-600"><Trash2 className="size-4" /></button>
              </li>
            ))}
            <li>
              {addFaqOpen ? (
                <div className="flex items-center gap-2 rounded-xl border border-ensena-border p-3.5">
                  <input
                    autoFocus
                    value={newFaq}
                    onChange={(e) => setNewFaq(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFaq()}
                    placeholder="New FAQ question"
                    className="h-9 flex-1 rounded-lg border border-ensena-border px-3 text-sm"
                  />
                  <button type="button" onClick={addFaq} className="rounded-full bg-ensena-primary px-3 py-1.5 text-xs font-semibold text-white">Add</button>
                  <button type="button" onClick={() => { setAddFaqOpen(false); setNewFaq(""); }} className="text-xs font-medium text-ensena-muted">Cancel</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddFaqOpen(true)} className="flex items-center gap-1.5 rounded-xl border border-dashed border-ensena-border p-3.5 text-sm text-ensena-primary">
                  <Plus className="size-4" /> Add FAQ
                </button>
              )}
            </li>
          </ul>
        )}

        {tab === "Subjects" && (
          <div className="flex flex-wrap items-center gap-2">
            {subjects.map((s) => (
              <span key={s} className="rounded-full border border-ensena-border px-3 py-1.5 text-sm text-ensena-ink">{s}</span>
            ))}
            {addSubjectOpen ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  placeholder="New subject"
                  className="h-9 rounded-full border border-ensena-border px-3 text-sm"
                />
                <button type="button" onClick={addSubject} className="rounded-full bg-ensena-primary px-3 py-1.5 text-xs font-semibold text-white">Add</button>
                <button type="button" onClick={() => { setAddSubjectOpen(false); setNewSubject(""); }} className="text-xs font-medium text-ensena-muted">Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddSubjectOpen(true)} className="flex items-center gap-1 rounded-full border border-dashed border-ensena-border px-3 py-1.5 text-sm text-ensena-primary">
                <Plus className="size-3.5" /> Add Subject
              </button>
            )}
          </div>
        )}

        {tab === "Academic Levels" && (
          <ul className="flex flex-col gap-2.5">
            {contentAcademicLevels.map((l) => (
              <li key={l} className="flex items-center gap-2 rounded-xl border border-ensena-border p-3.5 text-sm text-ensena-ink">
                <School className="size-4 text-ensena-muted" /> {l}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
