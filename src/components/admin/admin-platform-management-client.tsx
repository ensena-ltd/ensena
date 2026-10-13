"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { logAdminAction } from "@/lib/admin-audit-log";
import {
  academicLevelUsageCount,
  groupClassCategoryUsageCount,
  initialAcademicLevels,
  initialGroupClassCategories,
  initialSubjects,
  subjectUsageCount,
  type ManagedAcademicLevel,
  type ManagedGroupClassCategory,
  type ManagedSubject,
} from "@/lib/admin-platform-management-data";
import { exams as initialExams, type Exam } from "@/lib/exams-data";
import { currentActorLabel } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

const tabs = ["Subjects", "Academic Levels", "Exams", "Group Class Categories"] as const;
type Tab = (typeof tabs)[number];

const singularLabel: Record<Tab, string> = {
  Subjects: "Subject",
  "Academic Levels": "Academic Level",
  Exams: "Exam",
  "Group Class Categories": "Group Class Category",
};

function StatusToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-emerald-100 text-emerald-700" : "bg-ensena-bg-soft text-ensena-muted")}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export function AdminPlatformManagementClient() {
  const [tab, setTab] = useState<Tab>("Subjects");
  const [subjects, setSubjects] = useState<ManagedSubject[]>(initialSubjects);
  const [levels, setLevels] = useState<ManagedAcademicLevel[]>(initialAcademicLevels);
  const [categories, setCategories] = useState<ManagedGroupClassCategory[]>(initialGroupClassCategories);
  const [exams, setExams] = useState<Exam[]>(initialExams);

  const [modal, setModal] = useState<{ tab: Tab; editingId: string | null } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function openAdd(t: Tab) {
    setNameInput("");
    setDescriptionInput("");
    setModal({ tab: t, editingId: null });
  }

  function openEdit(t: Tab, id: string) {
    if (t === "Subjects") setNameInput(subjects.find((s) => s.id === id)?.name ?? "");
    if (t === "Academic Levels") setNameInput(levels.find((l) => l.id === id)?.name ?? "");
    if (t === "Exams") setNameInput(exams.find((e) => e.id === id)?.name ?? "");
    if (t === "Group Class Categories") {
      const c = categories.find((c) => c.id === id);
      setNameInput(c?.name ?? "");
      setDescriptionInput(c?.description ?? "");
    }
    setModal({ tab: t, editingId: id });
  }

  function save() {
    if (!modal || !nameInput.trim()) return;
    const name = nameInput.trim();
    const isEdit = !!modal.editingId;
    const newId = `${modal.tab.slice(0, 3).toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    if (modal.tab === "Subjects") {
      setSubjects((prev) => (isEdit ? prev.map((s) => (s.id === modal.editingId ? { ...s, name } : s)) : [...prev, { id: newId, name, status: "Active" }]));
    } else if (modal.tab === "Academic Levels") {
      setLevels((prev) => (isEdit ? prev.map((l) => (l.id === modal.editingId ? { ...l, name } : l)) : [...prev, { id: newId, name, status: "Active" }]));
    } else if (modal.tab === "Exams") {
      setExams((prev) => (isEdit ? prev.map((e) => (e.id === modal.editingId ? { ...e, name } : e)) : [...prev, { id: newId, name, slug: name.replace(/\s+/g, "-"), icon: prev[0]?.icon ?? initialExams[0].icon, active: true, order: prev.length + 1, relatedLevelTags: [], relatedSubjects: [] }]));
    } else if (modal.tab === "Group Class Categories") {
      const description = descriptionInput.trim();
      setCategories((prev) =>
        isEdit
          ? prev.map((c) => (c.id === modal.editingId ? { ...c, name, description } : c))
          : [...prev, { id: newId, name, description, status: "Active", matchKeywords: [] }]
      );
    }
    flash(`${singularLabel[modal.tab]} ${isEdit ? "updated" : "added"}.`);
    logAdminAction(`${isEdit ? "Updated" : "Added"} ${singularLabel[modal.tab].toLowerCase()}`, currentActorLabel(), name);
    setModal(null);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Platform Management</h1>
        <p className="mt-1 text-sm text-ensena-muted">Manage the subjects, academic levels, exams and group class categories used across Ensena. Deactivate instead of deleting to keep historical records intact.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>{t}</button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-ensena-muted">
            {tab === "Exams"
              ? "Shared with Academic Programs → Exams: the same list, edited from either place."
              : tab === "Academic Levels"
                ? "K-12 levels only. University/Masters/PhD levels are managed under Academic Programs."
                : null}
          </p>
          <Button onClick={() => openAdd(tab)} className="h-9 shrink-0 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
            <Plus className="size-3.5" /> Add {singularLabel[tab]}
          </Button>
        </div>

        {tab === "Subjects" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Subject</th><th className="py-2 font-medium">Usage</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium" /></tr></thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{s.name}</td>
                  <td className="py-2.5 text-ensena-muted">{subjectUsageCount(s.name)}</td>
                  <td className="py-2.5"><StatusToggle active={s.status === "Active"} onToggle={() => setSubjects((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)))} /></td>
                  <td className="py-2.5 text-right"><button type="button" onClick={() => openEdit("Subjects", s.id)} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Academic Levels" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Level</th><th className="py-2 font-medium">Usage</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium" /></tr></thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{l.name}</td>
                  <td className="py-2.5 text-ensena-muted">{academicLevelUsageCount(l.name)}</td>
                  <td className="py-2.5"><StatusToggle active={l.status === "Active"} onToggle={() => setLevels((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)))} /></td>
                  <td className="py-2.5 text-right"><button type="button" onClick={() => openEdit("Academic Levels", l.id)} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Exams" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Exam</th><th className="py-2 font-medium">URL slug</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium" /></tr></thead>
            <tbody>
              {[...exams].sort((a, b) => a.order - b.order).map((e) => (
                <tr key={e.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{e.name}</td>
                  <td className="py-2.5 font-mono text-xs text-ensena-muted">?exam={e.slug}</td>
                  <td className="py-2.5"><StatusToggle active={e.active} onToggle={() => setExams((prev) => prev.map((x) => (x.id === e.id ? { ...x, active: !x.active } : x)))} /></td>
                  <td className="py-2.5 text-right"><button type="button" onClick={() => openEdit("Exams", e.id)} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Group Class Categories" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Category</th><th className="py-2 font-medium">Description</th><th className="py-2 font-medium">Usage</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium" /></tr></thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{c.name}</td>
                  <td className="py-2.5 text-xs text-ensena-muted">{c.description}</td>
                  <td className="py-2.5 text-ensena-muted">{groupClassCategoryUsageCount(c)}</td>
                  <td className="py-2.5"><StatusToggle active={c.status === "Active"} onToggle={() => setCategories((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" } : x)))} /></td>
                  <td className="py-2.5 text-right"><button type="button" onClick={() => openEdit("Group Class Categories", c.id)} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Link href="/admin/academic-programs" className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ensena-primary hover:underline">
        Manage Faculties, Departments &amp; Courses (University/Masters/PhD) <ExternalLink className="size-3.5" />
      </Link>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`${modal?.editingId ? "Edit" : "Add"} ${modal ? singularLabel[modal.tab] : ""}`}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Name</span>
            <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          {modal?.tab === "Group Class Categories" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Description</span>
              <textarea value={descriptionInput} onChange={(e) => setDescriptionInput(e.target.value)} rows={2} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
            </label>
          )}
          <Button onClick={save} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Save</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
