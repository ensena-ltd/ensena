"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSearch,
  Headphones,
  Lightbulb,
  MoreVertical,
  RotateCcw,
  Search,
  XCircle,
} from "lucide-react";

import { adminVerificationStyles, type AdminTutor, type AdminVerificationStatus } from "@/lib/admin-data";
import { useAdminTutors } from "@/hooks/use-admin-tutors";
import { verificationRowFor } from "@/lib/admin-tutor-verification-data";
import { cn } from "@/lib/utils";

type MainTab = "Pending Verification" | "Verified" | "Rejected" | "Resubmission Required";
const mainTabs: MainTab[] = ["Pending Verification", "Verified", "Rejected", "Resubmission Required"];
const sortOptions = ["Newest", "Oldest", "Name (A–Z)"] as const;

function matchesTab(t: AdminTutor, tab: MainTab): boolean {
  if (tab === "Pending Verification") return t.verification === "Pending";
  if (tab === "Verified") return t.verification === "Verified";
  if (tab === "Rejected") return t.verification === "Rejected";
  return t.verification === "Resubmission Required";
}

export function AdminTutorVerificationClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = (mainTabs as string[]).includes(tabParam ?? "") ? (tabParam as MainTab) : "Pending Verification";

  const tutors = useAdminTutors();
  const [tab, setTab] = useState<MainTab>(initialTab);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof sortOptions)[number]>("Newest");
  const [showFilters, setShowFilters] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const subjects = ["All Subjects", ...Array.from(new Set(tutors.flatMap((t) => t.subjects)))];

  const counts = {
    pending: tutors.filter((t) => t.verification === "Pending").length,
    verified: tutors.filter((t) => t.verification === "Verified").length,
    resubmission: tutors.filter((t) => t.verification === "Resubmission Required").length,
    rejected: tutors.filter((t) => t.verification === "Rejected").length,
  };

  const summaryCards = [
    { key: "Pending Verification" as MainTab, label: "Pending Verification", value: counts.pending, sub: "Needs review", icon: Clock, tint: "bg-orange-100 text-orange-600" },
    { key: "Verified" as MainTab, label: "Verified Tutors", value: counts.verified, sub: "Approved", icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-600" },
    { key: "Resubmission Required" as MainTab, label: "Resubmission Required", value: counts.resubmission, sub: "Need more information", icon: RotateCcw, tint: "bg-amber-100 text-amber-600" },
    { key: "Rejected" as MainTab, label: "Rejected Tutors", value: counts.rejected, sub: "Applications rejected", icon: XCircle, tint: "bg-rose-100 text-rose-600" },
  ];

  function changeTab(t: MainTab) {
    setTab(t);
    setPage(1);
    setMenuId(null);
  }

  let filtered = tutors.filter((t) => {
    const matchesTabFilter = matchesTab(t, tab);
    const matchesSubject = subjectFilter === "All Subjects" || t.subjects.includes(subjectFilter);
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      verificationRowFor(t).tutorId.toLowerCase().includes(q);
    return matchesTabFilter && matchesSubject && matchesQuery;
  });
  filtered = [...filtered].sort((a, b) => {
    if (sort === "Name (A–Z)") return a.name.localeCompare(b.name);
    const da = new Date(a.joined).getTime() || 0;
    const db = new Date(b.joined).getTime() || 0;
    return sort === "Newest" ? db - da : da - db;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const verificationStatusStyleFor = (t: AdminTutor): { dot: string; label: AdminVerificationStatus } => ({
    dot:
      t.verification === "Verified" ? "bg-emerald-500" :
      t.verification === "Rejected" ? "bg-rose-500" :
      t.verification === "Resubmission Required" ? "bg-amber-500" : "bg-orange-500",
    label: t.verification,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Tutor Verification</h1>
          <p className="mt-1 text-sm text-ensena-muted">Review and verify tutors before they can teach on Enseña.</p>
        </div>
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
                placeholder="Search by name, email or tutor ID…"
                className="h-11 w-full rounded-xl border border-ensena-border pl-11 pr-4 text-sm"
              />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as (typeof sortOptions)[number])} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {sortOptions.map((s) => <option key={s}>Sort by: {s}</option>)}
            </select>
            <button type="button" onClick={() => setShowFilters((v) => !v)} className="flex h-11 items-center gap-1.5 rounded-xl border border-dashed border-ensena-primary px-4 text-sm font-medium text-ensena-primary">
              <FileSearch className="size-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
                {subjects.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Tutor</th>
                  <th className="py-2 pr-4 font-medium">Subjects</th>
                  <th className="py-2 pr-4 font-medium">Exam Expertise</th>
                  <th className="py-2 pr-4 font-medium">Submitted</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((t) => {
                  const row = verificationRowFor(t);
                  const sty = verificationStatusStyleFor(t);
                  return (
                    <tr key={t.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/verification/${t.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                          <span className="relative size-9 shrink-0 overflow-hidden rounded-full"><Image src={row.image} alt={t.name} fill sizes="36px" className="object-cover" /></span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ensena-ink">{t.name}</p>
                            <p className="truncate text-xs text-ensena-muted">{t.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-ensena-muted">{t.subjects.join(", ")}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{row.examExpertise}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{row.submittedLabel}</td>
                      <td className="py-3 pr-4">
                        <span className={cn("flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", adminVerificationStyles[t.verification])}>
                          <span className={cn("size-1.5 rounded-full", sty.dot)} /> {sty.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/verification/${t.id}`} className="flex h-8 shrink-0 items-center justify-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                            Review
                          </Link>
                          <div className="relative">
                            <button type="button" aria-label="More options" onClick={() => setMenuId((cur) => (cur === t.id ? null : t.id))} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                              <MoreVertical className="size-4" />
                            </button>
                            {menuId === t.id && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />
                                <div className="absolute right-0 top-9 z-30 w-44 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                                  <Link href={`/admin/verification/${t.id}`} onClick={() => setMenuId(null)} className="block rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Profile</Link>
                                  <Link href={`/admin/users/usr-${t.id}`} onClick={() => setMenuId(null)} className="block rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View Account</Link>
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
                  <tr><td colSpan={6} className="py-10 text-center text-ensena-muted">No tutors in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-4 text-xs text-ensena-muted">
              <p>Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, filtered.length)} of {filtered.length} tutors</p>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronLeft className="size-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className={cn("flex size-8 items-center justify-center rounded-full text-xs font-medium", n === currentPage ? "bg-ensena-primary text-white" : "text-ensena-ink hover:bg-ensena-bg-soft")}>{n}</button>
                ))}
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted disabled:opacity-40 hover:bg-ensena-bg-soft">
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><ClipboardCheck className="size-4 text-ensena-primary" /> Verification Process</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {[
                { step: 1, title: "Review Profile", desc: "Check tutor's profile information and teaching details." },
                { step: 2, title: "Inspect Documents", desc: "Verify all submitted documents are valid and clear." },
                { step: 3, title: "Make a Decision", desc: "Approve, request more info or reject the application." },
              ].map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-bold text-ensena-primary">{s.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{s.title}</p>
                    <p className="text-xs text-ensena-muted">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
              <Lightbulb className="size-4 text-ensena-primary" /> Quick Tips
            </h2>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-4 text-xs text-ensena-ink">
              <li>Ensure all documents are authentic and readable.</li>
              <li>Check that qualifications match the subjects.</li>
              <li>Use &quot;Request Resubmission&quot; if information is unclear.</li>
              <li>Approved tutors will be marked as Verified automatically.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink"><Headphones className="size-4 text-ensena-primary" /> Need Help?</h2>
            <p className="mt-2 text-xs text-ensena-muted">If you&apos;re unsure about a document or need assistance, contact our support team.</p>
            <Link href="/admin/support" className="mt-3 flex h-10 w-full items-center justify-center rounded-full border border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">Contact Support</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
