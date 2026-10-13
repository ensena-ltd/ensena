"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Book,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  FileSearch,
  Headphones,
  Lightbulb,
  Megaphone,
  MoreVertical,
  Search,
  Video,
  XCircle,
} from "lucide-react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useGroupClassEnrollments } from "@/hooks/use-group-class-enrollments";
import { useGroupClassSubmissions } from "@/hooks/use-group-class-submissions";
import {
  approvalCategoryFor,
  examFor,
  groupClassStatusStyles,
  initialGroupClasses,
  type GroupClassApprovalCategory,
  type GroupClassRow,
} from "@/lib/admin-group-classes-data";
import { cancelSubmission, getGroupClassSubmissions, submissionToGroupClassRow } from "@/lib/group-class-submission-store";
import { formatNaira } from "@/lib/format";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

type MainTab = "All Group Classes" | "Pending Approval" | "Approved" | "Rejected";
const mainTabs: MainTab[] = ["All Group Classes", "Pending Approval", "Approved", "Rejected"];

function matchesTab(c: GroupClassRow, tab: MainTab): boolean {
  if (tab === "All Group Classes") return true;
  return approvalCategoryFor(c.status) === (tab as GroupClassApprovalCategory);
}

export function AdminGroupClassesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (mainTabs as string[]).includes(tabParam ?? "") ? (tabParam as MainTab) : "All Group Classes";

  const [legacyClasses, setLegacyClasses] = useState<GroupClassRow[]>(initialGroupClasses);
  const submissions = useGroupClassSubmissions();
  // submissionToGroupClassRow reads real enrollment counts (extraSeatsFilled)
  // as a side effect of being called — this memo has to depend on the
  // enrollments store too, or a new enrollment would never trigger a
  // recompute and admin would see a stale seat count.
  const enrollments = useGroupClassEnrollments();
  const classes = useMemo(
    () => [...legacyClasses, ...submissions.map(submissionToGroupClassRow)],
    [legacyClasses, submissions, enrollments]
  );
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("All Levels");
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [examFilter, setExamFilter] = useState("All Exams");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [showFilters, setShowFilters] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [msgTutorFor, setMsgTutorFor] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function updateClass(id: string, patch: Partial<GroupClassRow>) {
    setLegacyClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function changeTab(t: MainTab) {
    setTab(t);
    setPage(1);
    setRowMenuId(null);
  }

  const levels = ["All Levels", ...Array.from(new Set(classes.map((c) => c.academicLevel)))];
  const subjects = ["All Subjects", ...Array.from(new Set(classes.map((c) => c.subject)))];
  const exams = ["All Exams", ...Array.from(new Set(classes.map((c) => examFor(c.academicLevel)).filter((e) => e !== "—")))];
  const statuses = ["All Statuses", ...Array.from(new Set(classes.map((c) => c.status)))];

  const counts = {
    total: classes.length,
    pending: classes.filter((c) => approvalCategoryFor(c.status) === "Pending Approval").length,
    approved: classes.filter((c) => approvalCategoryFor(c.status) === "Approved").length,
    rejected: classes.filter((c) => approvalCategoryFor(c.status) === "Rejected").length,
  };

  const summaryCards = [
    { key: "All Group Classes" as MainTab, label: "Total Classes", value: counts.total, sub: "All group classes", icon: Book, tint: "bg-rose-100 text-rose-600" },
    { key: "Pending Approval" as MainTab, label: "Pending Approval", value: counts.pending, sub: "Needs review", icon: Clock, tint: "bg-orange-100 text-orange-600" },
    { key: "Approved" as MainTab, label: "Approved", value: counts.approved, sub: "Live classes", icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-600" },
    { key: "Rejected" as MainTab, label: "Rejected", value: counts.rejected, sub: "Not approved", icon: XCircle, tint: "bg-rose-100 text-rose-600" },
  ];

  const filtered = classes.filter((c) => {
    const matchesTabFilter = matchesTab(c, tab);
    const matchesLevel = levelFilter === "All Levels" || c.academicLevel === levelFilter;
    const matchesSubject = subjectFilter === "All Subjects" || c.subject === subjectFilter;
    const matchesExam = examFilter === "All Exams" || examFor(c.academicLevel) === examFilter;
    const matchesStatus = statusFilter === "All Statuses" || c.status === statusFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = q === "" || c.title.toLowerCase().includes(q) || c.tutor.toLowerCase().includes(q) || c.classCode.toLowerCase().includes(q);
    return matchesTabFilter && matchesLevel && matchesSubject && matchesExam && matchesStatus && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  function scheduleLabel(c: GroupClassRow): string {
    const day = c.scheduleDays.split(",")[0];
    return `${day} · ${c.scheduleTime.split(" - ")[0]}`;
  }

  function rowAction(c: GroupClassRow): { label: string; href: string } {
    const category = approvalCategoryFor(c.status);
    return { label: category === "Pending Approval" ? "Review" : "View", href: `/admin/group-classes/${c.id}/review` };
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Group Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">Review and manage group classes submitted by tutors.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => changeTab(card.key)}
            className={cn(
              "rounded-2xl border bg-white p-4 text-left transition-colors hover:border-ensena-primary/40",
              tab === card.key ? "border-ensena-primary" : "border-ensena-border"
            )}
          >
            <div className={cn("flex size-10 items-center justify-center rounded-full", card.tint)}>
              <card.icon className="size-4.5" />
            </div>
            <p className="mt-3 text-xl font-semibold text-ensena-ink">{card.value.toLocaleString()}</p>
            <p className="text-xs text-ensena-muted">{card.label}</p>
            <p className="text-xs text-ensena-muted">{card.sub}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {mainTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeTab(t)}
                className={cn(
                  "shrink-0 border-b-2 pb-2.5 pt-1 transition-colors",
                  tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Search by class name, tutor or class ID…"
                className="h-11 w-full rounded-xl border border-ensena-border pl-11 pr-4 text-sm"
              />
            </div>
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {levels.map((l) => <option key={l}>{l}</option>)}
            </select>
            <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={examFilter} onChange={(e) => { setExamFilter(e.target.value); setPage(1); }} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {exams.map((e) => <option key={e}>{e}</option>)}
            </select>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-ensena-primary px-4 text-sm font-medium text-ensena-primary">
              <FileSearch className="size-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
                {statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Class</th>
                  <th className="py-2 pr-4 font-medium">Tutor</th>
                  <th className="py-2 pr-4 font-medium">Level</th>
                  <th className="py-2 pr-4 font-medium">Exam</th>
                  <th className="py-2 pr-4 font-medium">Price</th>
                  <th className="py-2 pr-4 font-medium">Students</th>
                  <th className="py-2 pr-4 font-medium">Schedule</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((c) => {
                  const action = rowAction(c);
                  return (
                    <tr key={c.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={action.href} className="block hover:opacity-80">
                          <p className="font-medium text-ensena-ink">{c.title}</p>
                          <p className="text-xs text-ensena-muted">ID: {c.classCode}</p>
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-full"><Image src={c.tutorImage} alt={c.tutor} fill sizes="32px" className="object-cover" /></span>
                          <div>
                            <p className="text-ensena-ink">{c.tutor}</p>
                            {isTutorVerifiedByName(c.tutor) && (
                              <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                                <VerifiedTutorBadge tutorName={c.tutor} className="size-3 text-emerald-600" /> Verified
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ensena-muted">{c.academicLevel}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{examFor(c.academicLevel)}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{formatNaira(c.pricePerSession)}<span className="text-xs"> / session</span></td>
                      <td className="py-3 pr-4 text-ensena-muted">
                        {c.studentsEnrolled} / {c.maxStudents}
                        {c.minStudents != null && c.studentsEnrolled < c.minStudents && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                            <AlertTriangle className="size-3" /> Below min ({c.minStudents})
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-ensena-muted">{scheduleLabel(c)}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", groupClassStatusStyles[c.status])}>{c.status}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Link
                            href={action.href}
                            className={cn(
                              "flex h-8 shrink-0 items-center justify-center rounded-full px-3 text-xs font-semibold",
                              action.label === "Review" ? "border border-ensena-primary text-ensena-primary hover:bg-ensena-primary/5" : "border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                            )}
                          >
                            {action.label}
                          </Link>
                          <div className="relative">
                            <button type="button" aria-label="More options" onClick={() => setRowMenuId((cur) => (cur === c.id ? null : c.id))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                              <MoreVertical className="size-4" />
                            </button>
                            {rowMenuId === c.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setRowMenuId(null)} />
                                <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                                  {c.status === "Live" && (
                                    <button type="button" onClick={() => { router.push(`/admin/classroom-join/${c.id}`); setRowMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-success hover:bg-ensena-success/10">
                                      <Video className="size-3.5" /> Join Live Class
                                    </button>
                                  )}
                                  {c.status === "Live" && (
                                    <button type="button" onClick={() => { router.push(`/admin/group-classes/${c.id}/observe`); setRowMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                                      <Video className="size-3.5" /> Observe
                                    </button>
                                  )}
                                  <button type="button" onClick={() => { setMsgTutorFor(c.id); setRowMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                                    <Edit3 className="size-3.5" /> Message Tutor
                                  </button>
                                  {approvalCategoryFor(c.status) === "Approved" && (
                                    <button type="button" onClick={() => { router.push(`/admin/group-classes/${c.id}/promote`); setRowMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-primary hover:bg-ensena-primary/5">
                                      <Megaphone className="size-3.5" /> Promote Class
                                    </button>
                                  )}
                                  {approvalCategoryFor(c.status) === "Approved" && c.status !== "Cancelled" && (
                                    <button type="button" onClick={() => { setCancellingId(c.id); setRowMenuId(null); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50">
                                      <Ban className="size-3.5" /> Suspend Class
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-ensena-muted">No group classes in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-4">
              <p className="text-xs text-ensena-muted">Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} classes</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className={cn("flex size-8 items-center justify-center rounded-full text-xs font-medium", n === currentPage ? "bg-ensena-primary text-white" : "text-ensena-ink hover:bg-ensena-bg-soft")}>{n}</button>
                ))}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronRight className="size-3.5" />
                </button>
                <span className="text-xs text-ensena-muted">{perPage} per page</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">What happens next?</h2>
            <ul className="mt-4 flex flex-col gap-4">
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="size-3.5" /></span>
                <div><p className="text-sm font-semibold text-ensena-ink">Approve Class</p><p className="text-xs text-ensena-muted">Class becomes visible to students.</p></div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Edit3 className="size-3.5" /></span>
                <div><p className="text-sm font-semibold text-ensena-ink">Request Changes</p><p className="text-xs text-ensena-muted">Tutor updates and resubmits.</p></div>
              </li>
              <li className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><XCircle className="size-3.5" /></span>
                <div><p className="text-sm font-semibold text-ensena-ink">Reject Class</p><p className="text-xs text-ensena-muted">Tutor receives your feedback.</p></div>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
              <Lightbulb className="size-4 text-ensena-primary" /> Quick Tips
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-4 text-xs text-ensena-ink">
              <li>Review class details carefully before approving.</li>
              <li>Ensure pricing, schedule and level are appropriate.</li>
              <li>Approved classes appear instantly to eligible students.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><Headphones className="size-4 text-ensena-primary" /> Need Help?</h2>
            <p className="mt-2 text-xs text-ensena-muted">If you need assistance reviewing group classes, contact our support team.</p>
            <Link href="/admin/support" className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">Contact Support</Link>
          </div>
        </div>
      </div>

      <Modal open={!!cancellingId} onClose={() => setCancellingId(null)} title="Suspend Class">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This cancels the class. Every real, actively enrolled student is refunded in full and notified automatically. This action is logged.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancellingId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Keep Class</Button>
            <Button
              onClick={() => {
                if (cancellingId) {
                  if (getGroupClassSubmissions().some((s) => s.id === cancellingId)) {
                    cancelSubmission(cancellingId);
                  } else {
                    updateClass(cancellingId, { status: "Cancelled" });
                  }
                }
                flash("Class suspended. Enrolled students have been refunded and notified.");
                setCancellingId(null);
              }}
              className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Suspend Class
            </Button>
          </div>
        </div>
      </Modal>

      <AdminMsgTutorModal open={!!msgTutorFor} onClose={() => setMsgTutorFor(null)} recipientName={classes.find((c) => c.id === msgTutorFor)?.tutor ?? "Tutor"} />

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
