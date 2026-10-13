"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  faculties as initialFaculties,
  departments as initialDepartments,
  courses as initialCourses,
  researchFields as initialResearchFields,
  researchServices as initialResearchServices,
  researchAreas as initialResearchAreas,
  undergraduateLevels,
  type Faculty,
  type Department,
  type Course,
  type ResearchField,
  type ResearchArea,
  type MastersPhdService,
  type MastersPhdLevel,
} from "@/lib/academic-taxonomy-data";
import { exams as initialExams, type Exam } from "@/lib/exams-data";
import { cn } from "@/lib/utils";

const tabs = ["Faculties", "Departments", "Courses", "Fields", "Services", "Research Areas", "Exams"] as const;
type Tab = (typeof tabs)[number];

const singularLabel: Record<Tab, string> = {
  Faculties: "Faculty",
  Departments: "Department",
  Courses: "Course",
  Fields: "Field",
  Services: "Service",
  "Research Areas": "Research Area",
  Exams: "Exam",
};

function reorder<T extends { order: number }>(list: T[], id: string, direction: -1 | 1, getId: (item: T) => string): T[] {
  const sorted = [...list].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((item) => getId(item) === id);
  const swapWith = idx + direction;
  if (idx < 0 || swapWith < 0 || swapWith >= sorted.length) return list;
  const a = sorted[idx];
  const b = sorted[swapWith];
  return list.map((item) => {
    if (getId(item) === getId(a)) return { ...item, order: b.order };
    if (getId(item) === getId(b)) return { ...item, order: a.order };
    return item;
  });
}

function Toolbar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex justify-end">
      <Button onClick={onAdd} className="h-9 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary/90">
        <Plus className="size-3.5" /> Add
      </Button>
    </div>
  );
}

function RowActions({
  active,
  onToggleActive,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  active: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onMoveUp} aria-label="Move up" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><ArrowUp className="size-3.5" /></button>
      <button type="button" onClick={onMoveDown} aria-label="Move down" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><ArrowDown className="size-3.5" /></button>
      <button type="button" onClick={onEdit} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button>
      <button
        type="button"
        onClick={onToggleActive}
        className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}
      >
        {active ? "Active" : "Inactive"}
      </button>
      <button type="button" onClick={onDelete} aria-label="Delete" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button>
    </div>
  );
}

export function AcademicProgramsClient() {
  const [tab, setTab] = useState<Tab>("Faculties");

  const [facultiesState, setFacultiesState] = useState<Faculty[]>(initialFaculties);
  const [departmentsState, setDepartmentsState] = useState<Department[]>(initialDepartments);
  const [coursesState, setCoursesState] = useState<Course[]>(initialCourses);
  const [fieldsState, setFieldsState] = useState<ResearchField[]>(initialResearchFields);
  const [servicesState, setServicesState] = useState<MastersPhdService[]>(initialResearchServices);
  const [areasState, setAreasState] = useState<ResearchArea[]>(initialResearchAreas);
  const [examsState, setExamsState] = useState<Exam[]>(initialExams);

  const [modal, setModal] = useState<{ type: Tab; editingId: string | null } | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [facultyIdInput, setFacultyIdInput] = useState("");
  const [departmentIdInput, setDepartmentIdInput] = useState("");
  const [fieldIdInput, setFieldIdInput] = useState("");
  const [levelsInput, setLevelsInput] = useState<string[]>([]);
  const [forLevelsInput, setForLevelsInput] = useState<MastersPhdLevel[]>([]);

  const [toast, setToast] = useState<string | null>(null);
  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function openAdd(type: Tab) {
    setLabelInput("");
    setFacultyIdInput(facultiesState[0]?.id ?? "");
    setDepartmentIdInput(departmentsState[0]?.id ?? "");
    setFieldIdInput(fieldsState[0]?.id ?? "");
    setLevelsInput([]);
    setForLevelsInput([]);
    setModal({ type, editingId: null });
  }

  function openEdit(type: Tab, id: string) {
    if (type === "Faculties") {
      const f = facultiesState.find((x) => x.id === id);
      if (f) setLabelInput(f.label);
    } else if (type === "Departments") {
      const d = departmentsState.find((x) => x.id === id);
      if (d) { setLabelInput(d.label); setFacultyIdInput(d.facultyId); setLevelsInput(d.levels); }
    } else if (type === "Courses") {
      const c = coursesState.find((x) => x.id === id);
      if (c) { setLabelInput(c.label); setDepartmentIdInput(c.departmentId); setLevelsInput(c.levels); }
    } else if (type === "Fields") {
      const f = fieldsState.find((x) => x.id === id);
      if (f) setLabelInput(f.label);
    } else if (type === "Services") {
      const s = servicesState.find((x) => x.id === id);
      if (s) { setLabelInput(s.label); setForLevelsInput(s.forLevels); }
    } else if (type === "Research Areas") {
      const a = areasState.find((x) => x.id === id);
      if (a) { setLabelInput(a.label); setFieldIdInput(a.fieldId); }
    } else if (type === "Exams") {
      const e = examsState.find((x) => x.id === id);
      if (e) setLabelInput(e.name);
    }
    setModal({ type, editingId: id });
  }

  function idPrefixFor(type: Tab): string {
    return { Faculties: "fac", Departments: "dep", Courses: "crs", Fields: "field", Services: "svc", "Research Areas": "area", Exams: "exam" }[type];
  }

  function saveModal() {
    if (!modal || !labelInput.trim()) return;
    const label = labelInput.trim();
    const isEdit = !!modal.editingId;
    const newId = `${idPrefixFor(modal.type)}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

    if (modal.type === "Faculties") {
      setFacultiesState((prev) =>
        isEdit
          ? prev.map((f) => (f.id === modal.editingId ? { ...f, label } : f))
          : [...prev, { id: newId, label, active: true, order: prev.length + 1 }]
      );
    } else if (modal.type === "Departments") {
      setDepartmentsState((prev) =>
        isEdit
          ? prev.map((d) => (d.id === modal.editingId ? { ...d, label, facultyId: facultyIdInput, levels: levelsInput } : d))
          : [...prev, { id: newId, label, facultyId: facultyIdInput, levels: levelsInput, active: true, order: prev.length + 1 }]
      );
    } else if (modal.type === "Courses") {
      setCoursesState((prev) =>
        isEdit
          ? prev.map((c) => (c.id === modal.editingId ? { ...c, label, departmentId: departmentIdInput, levels: levelsInput } : c))
          : [...prev, { id: newId, label, departmentId: departmentIdInput, levels: levelsInput, active: true, order: prev.length + 1 }]
      );
    } else if (modal.type === "Fields") {
      setFieldsState((prev) =>
        isEdit
          ? prev.map((f) => (f.id === modal.editingId ? { ...f, label } : f))
          : [...prev, { id: newId, label, active: true, order: prev.length + 1 }]
      );
    } else if (modal.type === "Services") {
      setServicesState((prev) =>
        isEdit
          ? prev.map((s) => (s.id === modal.editingId ? { ...s, label, forLevels: forLevelsInput } : s))
          : [...prev, { id: newId, label, forLevels: forLevelsInput, active: true, order: prev.length + 1 }]
      );
    } else if (modal.type === "Research Areas") {
      setAreasState((prev) =>
        isEdit
          ? prev.map((a) => (a.id === modal.editingId ? { ...a, label, fieldId: fieldIdInput } : a))
          : [...prev, { id: newId, label, fieldId: fieldIdInput, active: true }]
      );
    } else if (modal.type === "Exams") {
      const slug = label.replace(/\s*\/\s*/g, "-").replace(/\s+/g, "-");
      setExamsState((prev) =>
        isEdit
          ? prev.map((e) => (e.id === modal.editingId ? { ...e, name: label } : e))
          : [...prev, { id: newId, name: label, slug, icon: prev[0]?.icon ?? initialExams[0].icon, active: true, order: prev.length + 1, relatedLevelTags: [], relatedSubjects: [] }]
      );
    }
    flash(`${singularLabel[modal.type]} ${isEdit ? "updated" : "created"}.`);
    setModal(null);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Academic Programs</h1>
        <p className="mt-1 text-sm text-ensena-muted">
          Manage the Faculty/Department/Course taxonomy, Masters/PhD Fields/Services/Research Areas, and Exam categories used across Ensena&apos;s browsing flows.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("rounded-full px-3.5 py-1.5 font-medium transition-colors", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <Toolbar onAdd={() => openAdd(tab)} />

        {tab === "Faculties" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Faculty</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...facultiesState].sort((a, b) => a.order - b.order).map((f) => (
                <tr key={f.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{f.label}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={f.active}
                      onToggleActive={() => setFacultiesState((prev) => prev.map((x) => (x.id === f.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Faculties", f.id)}
                      onDelete={() => setFacultiesState((prev) => prev.filter((x) => x.id !== f.id))}
                      onMoveUp={() => setFacultiesState((prev) => reorder(prev, f.id, -1, (x) => x.id))}
                      onMoveDown={() => setFacultiesState((prev) => reorder(prev, f.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Departments" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Department</th><th className="py-2 font-medium">Faculty</th><th className="py-2 font-medium">Levels</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...departmentsState].sort((a, b) => a.order - b.order).map((d) => (
                <tr key={d.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{d.label}</td>
                  <td className="py-2.5 text-ensena-muted">{facultiesState.find((f) => f.id === d.facultyId)?.label ?? "—"}</td>
                  <td className="py-2.5 text-xs text-ensena-muted">{d.levels.join(", ")}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={d.active}
                      onToggleActive={() => setDepartmentsState((prev) => prev.map((x) => (x.id === d.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Departments", d.id)}
                      onDelete={() => setDepartmentsState((prev) => prev.filter((x) => x.id !== d.id))}
                      onMoveUp={() => setDepartmentsState((prev) => reorder(prev, d.id, -1, (x) => x.id))}
                      onMoveDown={() => setDepartmentsState((prev) => reorder(prev, d.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Courses" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Course</th><th className="py-2 font-medium">Department</th><th className="py-2 font-medium">Levels</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...coursesState].sort((a, b) => a.order - b.order).map((c) => (
                <tr key={c.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{c.label}</td>
                  <td className="py-2.5 text-ensena-muted">{departmentsState.find((d) => d.id === c.departmentId)?.label ?? "—"}</td>
                  <td className="py-2.5 text-xs text-ensena-muted">{c.levels.join(", ")}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={c.active}
                      onToggleActive={() => setCoursesState((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Courses", c.id)}
                      onDelete={() => setCoursesState((prev) => prev.filter((x) => x.id !== c.id))}
                      onMoveUp={() => setCoursesState((prev) => reorder(prev, c.id, -1, (x) => x.id))}
                      onMoveDown={() => setCoursesState((prev) => reorder(prev, c.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Fields" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Field</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...fieldsState].sort((a, b) => a.order - b.order).map((f) => (
                <tr key={f.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{f.label}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={f.active}
                      onToggleActive={() => setFieldsState((prev) => prev.map((x) => (x.id === f.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Fields", f.id)}
                      onDelete={() => setFieldsState((prev) => prev.filter((x) => x.id !== f.id))}
                      onMoveUp={() => setFieldsState((prev) => reorder(prev, f.id, -1, (x) => x.id))}
                      onMoveDown={() => setFieldsState((prev) => reorder(prev, f.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Services" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Service</th><th className="py-2 font-medium">Applies to</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...servicesState].sort((a, b) => a.order - b.order).map((s) => (
                <tr key={s.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{s.label}</td>
                  <td className="py-2.5 text-xs text-ensena-muted">{s.forLevels.join(", ")}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={s.active}
                      onToggleActive={() => setServicesState((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Services", s.id)}
                      onDelete={() => setServicesState((prev) => prev.filter((x) => x.id !== s.id))}
                      onMoveUp={() => setServicesState((prev) => reorder(prev, s.id, -1, (x) => x.id))}
                      onMoveDown={() => setServicesState((prev) => reorder(prev, s.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Research Areas" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Research Area</th><th className="py-2 font-medium">Field</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {areasState.map((a) => (
                <tr key={a.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{a.label}</td>
                  <td className="py-2.5 text-ensena-muted">{fieldsState.find((f) => f.id === a.fieldId)?.label ?? "—"}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit("Research Areas", a.id)} aria-label="Edit" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"><Pencil className="size-3.5" /></button>
                      <button
                        type="button"
                        onClick={() => setAreasState((prev) => prev.map((x) => (x.id === a.id ? { ...x, active: !x.active } : x)))}
                        className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", a.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}
                      >
                        {a.active ? "Active" : "Inactive"}
                      </button>
                      <button type="button" onClick={() => setAreasState((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Delete" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "Exams" && (
          <table className="mt-3 w-full text-left text-sm">
            <thead><tr className="border-b border-ensena-border text-xs text-ensena-muted"><th className="py-2 font-medium">Exam</th><th className="py-2 font-medium">URL slug</th><th className="py-2 font-medium">Actions</th></tr></thead>
            <tbody>
              {[...examsState].sort((a, b) => a.order - b.order).map((e) => (
                <tr key={e.id} className="border-b border-ensena-border last:border-0">
                  <td className="py-2.5 text-ensena-ink">{e.name}</td>
                  <td className="py-2.5 text-xs text-ensena-muted">?exam={e.slug}</td>
                  <td className="py-2.5">
                    <RowActions
                      active={e.active}
                      onToggleActive={() => setExamsState((prev) => prev.map((x) => (x.id === e.id ? { ...x, active: !x.active } : x)))}
                      onEdit={() => openEdit("Exams", e.id)}
                      onDelete={() => setExamsState((prev) => prev.filter((x) => x.id !== e.id))}
                      onMoveUp={() => setExamsState((prev) => reorder(prev, e.id, -1, (x) => x.id))}
                      onMoveDown={() => setExamsState((prev) => reorder(prev, e.id, 1, (x) => x.id))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`${modal?.editingId ? "Edit" : "Add"} ${modal ? singularLabel[modal.type] : ""}`}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Label</span>
            <input value={labelInput} onChange={(e) => setLabelInput(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>

          {modal?.type === "Departments" && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Faculty</span>
                <select value={facultyIdInput} onChange={(e) => setFacultyIdInput(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                  {facultiesState.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </label>
              <div>
                <span className="text-xs font-medium text-ensena-muted">Levels offered</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {undergraduateLevels.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelsInput((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]))}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium", levelsInput.includes(lvl) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {modal?.type === "Courses" && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Department</span>
                <select value={departmentIdInput} onChange={(e) => setDepartmentIdInput(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                  {departmentsState.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              <div>
                <span className="text-xs font-medium text-ensena-muted">Levels this course applies to</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(departmentsState.find((d) => d.id === departmentIdInput)?.levels ?? undergraduateLevels).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setLevelsInput((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]))}
                      className={cn("rounded-full border px-3 py-1 text-xs font-medium", levelsInput.includes(lvl) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {modal?.type === "Services" && (
            <div>
              <span className="text-xs font-medium text-ensena-muted">Applies to</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(["Masters", "PhD"] as MastersPhdLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setForLevelsInput((prev) => (prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl]))}
                    className={cn("rounded-full border px-3 py-1 text-xs font-medium", forLevelsInput.includes(lvl) ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-muted")}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {modal?.type === "Research Areas" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Field</span>
              <select value={fieldIdInput} onChange={(e) => setFieldIdInput(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {fieldsState.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
          )}

          <Button onClick={saveModal} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary/90">
            Save
          </Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
