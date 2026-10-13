"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Atom,
  Beaker,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  Cpu,
  FlaskConical,
  Gavel,
  GraduationCap,
  Landmark,
  Leaf,
  Pencil,
  Search,
  ShieldCheck,
  Sprout,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  coursesForDepartment,
  departmentById,
  departmentsForFaculty,
  faculties,
  facultyById,
  undergraduateLevels,
} from "@/lib/academic-taxonomy-data";
import { cn } from "@/lib/utils";

const facultyIcons: Record<string, LucideIcon> = {
  "fac-engineering": Cpu,
  "fac-medicine": Stethoscope,
  "fac-sciences": FlaskConical,
  "fac-social-sciences": Users,
  "fac-arts": BookOpen,
  "fac-law": Gavel,
  "fac-education": GraduationCap,
  "fac-business": Briefcase,
  "fac-computing": Atom,
  "fac-agriculture": Sprout,
  "fac-environmental": Leaf,
  "fac-pharmacy": Beaker,
};

const DEPARTMENT_PREVIEW_COUNT = 8;
const COURSE_PREVIEW_COUNT = 6;

export function UndergraduateFlow() {
  const router = useRouter();

  const [directSearch, setDirectSearch] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [courseQuery, setCourseQuery] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [learningType, setLearningType] = useState<"Private" | "Group Classes">("Private");

  function runDirectSearch() {
    if (!directSearch.trim()) return;
    router.push(`/find-teachers?q=${encodeURIComponent(directSearch.trim())}&level=Undergraduate`);
  }

  function changeField() {
    setFacultyId(null);
    setDepartmentId(null);
    setLevel(null);
    setCourseId(null);
    setShowAllDepartments(false);
  }

  const visibleFaculties = faculties
    .filter((f) => f.active && f.label.toLowerCase().includes(fieldQuery.toLowerCase()))
    .sort((a, b) => a.order - b.order);

  const departments = facultyId ? departmentsForFaculty(facultyId) : [];
  const visibleDepartments = showAllDepartments ? departments : departments.slice(0, DEPARTMENT_PREVIEW_COUNT);

  const departmentCourses = departmentId ? coursesForDepartment(departmentId, level ?? undefined) : [];
  const filteredCourses = courseQuery.trim()
    ? departmentCourses.filter((c) => c.label.toLowerCase().includes(courseQuery.toLowerCase()))
    : departmentCourses;
  const visibleCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, COURSE_PREVIEW_COUNT);

  const canSubmit = !!facultyId && !!departmentId && !!level;

  function goToResults() {
    const params = new URLSearchParams({ academicLevel: "undergraduate" });
    if (facultyId) params.set("facultyId", facultyId);
    if (departmentId) params.set("departmentId", departmentId);
    if (level) params.set("courseLevel", level);
    if (courseId) params.set("courseId", courseId);
    if (learningType === "Group Classes") params.set("type", "group");
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink sm:text-3xl">Find the Right Academic Support for Your Degree</h1>
        <p className="mt-2 max-w-xl text-sm text-ensena-muted sm:text-base">
          Find qualified tutors who understand your course, department and academic level.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ensena-success">
          <ShieldCheck className="size-4" /> All tutors are verified
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:flex-row sm:items-center">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
          <Search className="size-4.5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ensena-ink">Already know what you need help with?</p>
          <p className="text-xs text-ensena-muted">Search for a course or subject directly.</p>
        </div>
        <div className="flex flex-1 gap-2">
          <Input
            value={directSearch}
            onChange={(e) => setDirectSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runDirectSearch()}
            placeholder="Search for a course or subject (e.g. Statistics, Accounting, Data Structures)"
            className="h-11 rounded-xl border-ensena-border"
          />
          <button
            type="button"
            onClick={runDirectSearch}
            className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary/90"
          >
            Search
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ensena-ink">1. What are you studying?</h2>
                <p className="text-xs text-ensena-muted">Choose your academic field</p>
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ensena-muted" />
                <Input value={fieldQuery} onChange={(e) => setFieldQuery(e.target.value)} placeholder="Search your field" className="h-9 w-48 rounded-full border-ensena-border pl-8 text-sm" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {visibleFaculties.map((f) => {
                const Icon = facultyIcons[f.id] ?? Landmark;
                const selected = facultyId === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFacultyId(f.id);
                      setDepartmentId(null);
                      setLevel(null);
                      setCourseId(null);
                      setShowAllDepartments(false);
                    }}
                    className={cn(
                      "relative flex min-h-[92px] flex-col items-start justify-center gap-1.5 rounded-2xl border p-3.5 text-left transition-all",
                      selected ? "border-ensena-primary bg-ensena-primary/5 ring-1 ring-ensena-primary/30" : "border-ensena-border bg-ensena-surface hover:border-ensena-primary/30"
                    )}
                  >
                    {selected && (
                      <span className="absolute right-2.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-ensena-primary text-white">
                        <Check className="size-2.5" />
                      </span>
                    )}
                    <Icon className="size-4.5 text-ensena-primary" strokeWidth={1.75} />
                    <span className="text-sm font-semibold leading-tight text-ensena-ink">{f.label}</span>
                  </button>
                );
              })}
              {visibleFaculties.length === 0 && <p className="col-span-full text-sm text-ensena-muted">No fields match &quot;{fieldQuery}&quot;.</p>}
            </div>
          </section>

          {facultyId && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-ensena-ink">2. Choose your department</h2>
                  <p className="text-xs text-ensena-muted">Based on {facultyById(facultyId)?.label}</p>
                </div>
                <button type="button" onClick={changeField} className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  <Pencil className="size-3" /> Change field
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleDepartments.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDepartmentId(d.id);
                      setLevel(null);
                      setCourseId(null);
                    }}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      departmentId === d.id ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
                {!showAllDepartments && departments.length > DEPARTMENT_PREVIEW_COUNT && (
                  <button type="button" onClick={() => setShowAllDepartments(true)} className="flex items-center gap-1 rounded-full border border-ensena-border px-3.5 py-2 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                    More <ChevronDown className="size-3.5" />
                  </button>
                )}
                {departments.length === 0 && <p className="text-sm text-ensena-muted">No departments configured for this field yet.</p>}
              </div>
            </section>
          )}

          {departmentId && (
            <section>
              <h2 className="text-sm font-semibold text-ensena-ink">3. What&apos;s your level?</h2>
              <p className="text-xs text-ensena-muted">Select your current academic level</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(departmentById(departmentId)?.levels ?? undergraduateLevels).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => { setLevel(lvl); setCourseId(null); }}
                    className={cn(
                      "min-h-12 rounded-full border px-5 text-sm font-semibold transition-all",
                      level === lvl ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border bg-ensena-surface text-ensena-ink hover:bg-ensena-bg-soft"
                    )}
                  >
                    {lvl === "Other" ? "Not sure / Other" : lvl}
                  </button>
                ))}
              </div>
            </section>
          )}

          {departmentId && level && (
            <section>
              <h2 className="text-sm font-semibold text-ensena-ink">4. What course or subject do you need help with?</h2>
              <p className="text-xs text-ensena-muted">Search or select your course</p>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <Input
                  value={courseQuery}
                  onChange={(e) => setCourseQuery(e.target.value)}
                  placeholder="Search your course (e.g. Data Structures, Fluid Mechanics)"
                  className="h-11 rounded-xl border-ensena-border pl-9"
                />
              </div>
              {departmentCourses.length > 0 ? (
                <>
                  <p className="mt-3 text-xs font-medium text-ensena-muted">
                    Popular for {departmentById(departmentId)?.label} · {level}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {visibleCourses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setCourseId(c.id); setCourseQuery(c.label); }}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                          courseId === c.id ? "border-ensena-primary bg-ensena-primary/10 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                    {!showAllCourses && filteredCourses.length > COURSE_PREVIEW_COUNT && (
                      <button type="button" onClick={() => setShowAllCourses(true)} className="flex items-center gap-1 rounded-full border border-ensena-border px-3.5 py-1.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        View more <ChevronDown className="size-3.5" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-xs text-ensena-muted">No specific courses listed yet for this department/level. You can still continue and we&apos;ll show relevant tutors.</p>
              )}
            </section>
          )}

          {departmentId && level && (
            <section>
              <h2 className="text-sm font-semibold text-ensena-ink">5. How do you want to learn?</h2>
              <p className="text-xs text-ensena-muted">Choose the learning format that works best for you</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    { value: "Private" as const, icon: User, title: "Private Lessons", desc: "One-on-one sessions with a tutor", sub: "Personalized help just for you" },
                    { value: "Group Classes" as const, icon: Users, title: "Group Classes", desc: "Learn with other students", sub: "Interactive and affordable" },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLearningType(opt.value)}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                      learningType === opt.value ? "border-ensena-primary bg-ensena-primary/5 ring-1 ring-ensena-primary/20" : "border-ensena-border bg-ensena-surface hover:border-ensena-primary/30"
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", learningType === opt.value ? "bg-ensena-primary/15 text-ensena-primary" : "bg-ensena-bg-soft text-ensena-muted")}>
                      <opt.icon className="size-4.5" />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ensena-ink">{opt.title}</span>
                        {learningType === opt.value && (
                          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white"><Check className="size-2.5" /></span>
                        )}
                      </span>
                      <span className="block text-xs text-ensena-muted">{opt.desc}</span>
                      <span className="block text-xs text-ensena-muted">{opt.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={goToResults}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-ensena-primary text-base font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              Continue to find tutors <ArrowRight className="size-4" />
            </button>
            <p className="mt-2 text-center text-xs text-ensena-muted">You can change your selections anytime.</p>
          </div>
        </div>
    </div>
  );
}
