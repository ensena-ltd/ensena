"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Download, FileText, GraduationCap, Mail, Phone, Search, Trash2, User, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { deleteWaitlistSignup, deleteWaitlistSignups } from "@/lib/actions/admin-waitlist";
import type { WaitlistSignup } from "@/lib/admin-waitlist-server";
import { cn } from "@/lib/utils";

const tabs = ["All Sign-ups", "Student Waitlist", "Tutor Circle"] as const;
type Tab = (typeof tabs)[number];

const sourceBadge: Record<WaitlistSignup["source"], { label: string; className: string }> = {
  student: { label: "Student", className: "bg-blue-50 text-blue-700" },
  tutor: { label: "Tutor Circle", className: "bg-violet-50 text-violet-700" },
};

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(ms);
}

function campaignLabel(source: string): string {
  return source.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const PAGE_SIZE = 20;

const rowKey = (s: WaitlistSignup) => `${s.source}:${s.id}`;

// The export columns, shared by CSV and PDF so both files always match.
function exportTable(rows: WaitlistSignup[], which: "all" | WaitlistSignup["source"], date: (ms: number) => string): { header: string[]; lines: string[][] } {
  const withStudentFields = which !== "tutor";
  const header = ["Name", "Email", "Phone", ...(which === "all" ? ["List"] : []), ...(withStudentFields ? ["Level", "Needs"] : []), "Source", "Signed up"];
  const lines = rows.map((s) => [
    s.name,
    s.email,
    s.phone ?? "",
    ...(which === "all" ? [sourceBadge[s.source].label] : []),
    ...(withStudentFields ? [s.level ?? "", s.needs.join("; ")] : []),
    campaignLabel(s.campaign),
    date(s.createdAtMs),
  ]);
  return { header, lines };
}

function SignupAvatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-muted">
      <User className="size-4" />
    </span>
  );
}

// Quotes a CSV cell, and neutralises values a spreadsheet would run as a formula.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

// Admin › Waitlist: everyone who joined from the Student Waitlist and Tutor
// Circle landing pages, in three tabs (both together, students only, tutors
// only), with search and a confirmed delete.
export function AdminWaitlistClient({ signups, errors }: { signups: WaitlistSignup[]; errors: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("All Sign-ups");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<WaitlistSignup[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  // Which export menu is open (CSV or PDF), if any.
  const [exportOpen, setExportOpen] = useState<false | "csv" | "pdf">(false);

  // ?tab= deep links from the sidebar.
  useEffect(() => {
    const match = tabs.find((t) => t === searchParams.get("tab"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing the tab from the URL on navigation
    setTab(match ?? "All Sign-ups");
    setPage(1);
    setSelected([]);
  }, [searchParams]);

  // Downloads every sign-up in the chosen list (not just the page on screen) as CSV.
  function exportCsv(which: "all" | WaitlistSignup["source"]) {
    setExportOpen(false);
    const rows = live.filter((s) => which === "all" || s.source === which);
    if (rows.length === 0) {
      toast.error("There are no sign-ups to export in that list.");
      return;
    }
    downloadCsv(rows, which, which === "all" ? "all" : which === "student" ? "students" : "tutors");
  }

  function downloadCsv(rows: WaitlistSignup[], which: "all" | WaitlistSignup["source"], fileTag: string) {
    const { header, lines } = exportTable(rows, which, (ms) => new Date(ms).toISOString());
    const csv = [header, ...lines].map((cols) => cols.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ensena-waitlist-${fileTag}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // PDF: same columns as the CSV, as a landscape A4 table. The PDF library
  // is only loaded when someone actually exports.
  async function downloadPdf(rows: WaitlistSignup[], which: "all" | WaitlistSignup["source"], fileTag: string, title: string) {
    setExportOpen(false);
    if (rows.length === 0) {
      toast.error("There are no sign-ups to export in that list.");
      return;
    }
    try {
      const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const { header, lines } = exportTable(rows, which, formatDate);
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(31, 36, 48);
      doc.text(`Ensena ${title}`, 40, 44);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110, 116, 130);
      doc.text(`${rows.length} sign-up${rows.length === 1 ? "" : "s"} · Exported ${formatDate(new Date().getTime())}`, 40, 62);
      autoTable(doc, {
        head: [header],
        body: lines,
        startY: 78,
        margin: { left: 40, right: 40 },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, overflow: "linebreak", textColor: [31, 36, 48] },
        headStyles: { fillColor: [248, 2, 72], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 248, 250] },
        didDrawPage: () => {
          const pageNo = doc.getCurrentPageInfo().pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(138, 143, 156);
          doc.text(`Page ${pageNo}`, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
        },
      });
      doc.save(`ensena-waitlist-${fileTag}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.error("Couldn't create the PDF. Please try again.");
    }
  }

  function exportPdf(which: "all" | WaitlistSignup["source"]) {
    const rows = live.filter((s) => which === "all" || s.source === which);
    const [tag, title] = which === "all" ? ["all", "waitlist: all sign-ups"] : which === "student" ? ["students", "student waitlist"] : ["tutors", "Tutor Circle sign-ups"];
    void downloadPdf(rows, which, tag, title);
  }

  const live = signups.filter((s) => !removedIds.includes(s.id));
  const counts: Record<Tab, number> = {
    "All Sign-ups": live.length,
    "Student Waitlist": live.filter((s) => s.source === "student").length,
    "Tutor Circle": live.filter((s) => s.source === "tutor").length,
  };

  const q = query.trim().toLowerCase();
  const visible = live.filter(
    (s) =>
      (tab === "All Sign-ups" || (tab === "Student Waitlist" ? s.source === "student" : s.source === "tutor")) &&
      (!q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone ?? "").includes(q) || (s.level ?? "").toLowerCase().includes(q))
  );
  const showStudentColumns = tab === "Student Waitlist";

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection (checkboxes): kept across pages and searches within a tab.
  const selectedRows = live.filter((s) => selected.includes(rowKey(s)));
  const pageKeys = pageRows.map(rowKey);
  const pageAllSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.includes(k));
  const pageSomeSelected = pageKeys.some((k) => selected.includes(k));

  function toggleRow(s: WaitlistSignup) {
    const k = rowKey(s);
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function togglePage() {
    setSelected((prev) => (pageAllSelected ? prev.filter((k) => !pageKeys.includes(k)) : [...new Set([...prev, ...pageKeys])]));
  }

  function selectTab(t: Tab) {
    setTab(t);
    setPage(1);
    setSelected([]);
    router.replace(t === "All Sign-ups" ? "/admin/waitlist" : `/admin/waitlist?tab=${encodeURIComponent(t)}`, { scroll: false });
  }

  function confirmDelete() {
    if (!deleting || deleting.length === 0) return;
    const targets = deleting;
    startTransition(async () => {
      if (targets.length === 1) {
        const [target] = targets;
        const result = await deleteWaitlistSignup({ source: target.source, id: target.id });
        if (!result.ok) {
          toast.error(result.message ?? "Couldn't delete this sign-up.");
          return;
        }
        toast.success(`${target.name} was removed from the ${target.source === "student" ? "student waitlist" : "Tutor Circle"}.`);
      } else {
        const result = await deleteWaitlistSignups(targets.map((t) => ({ source: t.source, id: t.id })));
        if (!result.ok) {
          toast.error(result.message ?? "Couldn't delete those sign-ups.");
          router.refresh();
          return;
        }
        toast.success(`${result.deleted ?? targets.length} sign-ups were deleted.`);
      }
      const ids = targets.map((t) => t.id);
      setRemovedIds((prev) => [...prev, ...ids]);
      setSelected((prev) => prev.filter((k) => !targets.some((t) => rowKey(t) === k)));
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Waitlist</h1>
          <p className="mt-1 text-sm text-ensena-muted">Everyone who signed up on the Student Waitlist and Tutor Circle landing pages.</p>
        </div>
        <div className="relative flex gap-2">
          <Button variant="outline" onClick={() => setExportOpen((v) => (v === "csv" ? false : "csv"))} className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium">
            <Download className="size-4" /> Export CSV <ChevronDown className="size-3.5" />
          </Button>
          <Button variant="outline" onClick={() => setExportOpen((v) => (v === "pdf" ? false : "pdf"))} className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium">
            <FileText className="size-4" /> Export PDF <ChevronDown className="size-3.5" />
          </Button>
          {exportOpen && (
            <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
              {[
                { key: "all" as const, label: "All sign-ups", count: counts["All Sign-ups"] },
                { key: "student" as const, label: "Students only", count: counts["Student Waitlist"] },
                { key: "tutor" as const, label: "Tutors only", count: counts["Tutor Circle"] },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => (exportOpen === "pdf" ? exportPdf(o.key) : exportCsv(o.key))}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  {o.label} <span className="text-xs text-ensena-muted">{o.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "All sign-ups", value: counts["All Sign-ups"], icon: Users, tint: "bg-ensena-primary/10 text-ensena-primary" },
          { label: "Student waitlist", value: counts["Student Waitlist"], icon: GraduationCap, tint: "bg-blue-50 text-blue-700" },
          { label: "Tutor Circle", value: counts["Tutor Circle"], icon: Users, tint: "bg-violet-50 text-violet-700" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <span className={cn("flex size-10 items-center justify-center rounded-xl", stat.tint)}>
              <stat.icon className="size-5" />
            </span>
            <div>
              <p className="text-sm text-ensena-muted">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface">
        <div className="flex flex-col gap-3 border-b border-ensena-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTab(t)}
                className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium", tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}
              >
                {t} <span className="text-xs">({counts[t]})</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, email, phone…"
              className="h-10 w-full rounded-full border border-ensena-border bg-ensena-surface pl-9 pr-3 text-sm text-ensena-ink outline-none focus:border-ensena-primary/50"
            />
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ensena-border bg-ensena-primary/5 px-4 py-2.5 text-sm">
            <p className="font-medium text-ensena-ink">
              {selectedRows.length} selected
              <button type="button" onClick={() => setSelected([])} className="ml-3 text-xs font-medium text-ensena-muted hover:text-ensena-ink hover:underline">
                Clear
              </button>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => downloadCsv(selectedRows, tab === "Student Waitlist" ? "student" : tab === "Tutor Circle" ? "tutor" : "all", "selected")}
                className="h-8 rounded-full border-ensena-border px-3 text-xs font-semibold"
              >
                <Download className="size-3.5" /> Export selected
              </Button>
              <Button
                variant="outline"
                onClick={() => void downloadPdf(selectedRows, tab === "Student Waitlist" ? "student" : tab === "Tutor Circle" ? "tutor" : "all", "selected", "waitlist: selected sign-ups")}
                className="h-8 rounded-full border-ensena-border px-3 text-xs font-semibold"
              >
                <FileText className="size-3.5" /> Export PDF
              </Button>
              <Button variant="outline" onClick={() => setDeleting(selectedRows)} className="h-8 rounded-full border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                <Trash2 className="size-3.5" /> Delete selected
              </Button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-ensena-muted">{live.length === 0 ? "No sign-ups yet." : q ? "No sign-ups match your search." : "No sign-ups in this list yet."}</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-ensena-border text-xs uppercase tracking-wide text-ensena-muted">
                  <tr>
                    <th className="w-10 py-3 pl-4 pr-0">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={pageAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = pageSomeSelected && !pageAllSelected;
                        }}
                        onChange={togglePage}
                        className="size-4 cursor-pointer rounded accent-ensena-primary"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Contact</th>
                    {tab === "All Sign-ups" && <th className="px-4 py-3 font-semibold">List</th>}
                    {showStudentColumns && <th className="px-4 py-3 font-semibold">Level &amp; needs</th>}
                    <th className="px-4 py-3 font-semibold">Signed up</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ensena-border">
                  {pageRows.map((s) => (
                    <tr key={`${s.source}-${s.id}`} className={cn("align-top", selected.includes(rowKey(s)) && "bg-ensena-primary/5")}>
                      <td className="w-10 py-3 pl-4 pr-0">
                        <input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.includes(rowKey(s))} onChange={() => toggleRow(s)} className="mt-2 size-4 cursor-pointer rounded accent-ensena-primary" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <SignupAvatar />
                          <div className="min-w-0">
                            <p className="font-medium text-ensena-ink">{s.name}</p>
                            <p className="text-xs text-ensena-muted">{campaignLabel(s.campaign)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${s.email}`} className="block text-ensena-ink hover:text-ensena-primary hover:underline">
                          {s.email}
                        </a>
                        {s.phone && <p className="text-xs text-ensena-muted">{s.phone}</p>}
                      </td>
                      {tab === "All Sign-ups" && (
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", sourceBadge[s.source].className)}>{sourceBadge[s.source].label}</span>
                        </td>
                      )}
                      {showStudentColumns && (
                        <td className="px-4 py-3">
                          {s.source === "student" ? (
                            <>
                              <p className="text-ensena-ink">{s.level}</p>
                              {s.needs.length > 0 && <p className="text-xs text-ensena-muted">{s.needs.join(", ")}</p>}
                            </>
                          ) : (
                            <span className="text-ensena-muted">—</span>
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap px-4 py-3 text-ensena-muted">{formatDate(s.createdAtMs)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" onClick={() => setDeleting([s])} className="h-8 rounded-full border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <label className="flex items-center gap-2.5 border-b border-ensena-border px-4 py-2.5 text-xs font-medium text-ensena-muted md:hidden">
              <input
                type="checkbox"
                checked={pageAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = pageSomeSelected && !pageAllSelected;
                }}
                onChange={togglePage}
                className="size-4 rounded accent-ensena-primary"
              />
              Select all on this page
            </label>
            <ul className="divide-y divide-ensena-border md:hidden">
              {pageRows.map((s) => (
                <li key={`${s.source}-${s.id}`} className={cn("flex flex-col gap-2 p-4", selected.includes(rowKey(s)) && "bg-ensena-primary/5")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <input type="checkbox" aria-label={`Select ${s.name}`} checked={selected.includes(rowKey(s))} onChange={() => toggleRow(s)} className="size-4 shrink-0 rounded accent-ensena-primary" />
                      <SignupAvatar />
                      <div className="min-w-0">
                        <p className="font-medium text-ensena-ink">{s.name}</p>
                        <p className="text-xs text-ensena-muted">{formatDate(s.createdAtMs)}</p>
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", sourceBadge[s.source].className)}>{sourceBadge[s.source].label}</span>
                  </div>
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 break-all text-sm text-ensena-ink">
                    <Mail className="size-3.5 shrink-0 text-ensena-muted" /> {s.email}
                  </a>
                  {s.phone && (
                    <p className="flex items-center gap-1.5 text-sm text-ensena-ink">
                      <Phone className="size-3.5 shrink-0 text-ensena-muted" /> {s.phone}
                    </p>
                  )}
                  {showStudentColumns && (
                    <p className="text-sm text-ensena-muted">
                      {s.level}
                      {s.needs.length > 0 ? ` · ${s.needs.join(", ")}` : ""}
                    </p>
                  )}
                  <Button variant="outline" onClick={() => setDeleting([s])} className="mt-1 h-9 w-full rounded-full border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="size-4" /> Delete
                  </Button>
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-ensena-border p-4 text-sm text-ensena-muted sm:flex-row">
              <p>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)} of {visible.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page" className="size-9 rounded-full border-ensena-border p-0">
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-20 text-center font-medium text-ensena-ink">
                  Page {currentPage} of {pageCount}
                </span>
                <Button variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page" className="size-9 rounded-full border-ensena-border p-0">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal open={deleting !== null} onClose={() => !pending && setDeleting(null)} title={deleting && deleting.length > 1 ? `Delete ${deleting.length} sign-ups?` : "Delete sign-up?"}>
        {deleting && deleting.length > 0 && (
          <div className="flex flex-col gap-4 text-sm">
            {deleting.length === 1 ? (
              <p className="text-ensena-muted">
                <span className="font-semibold text-ensena-ink">{deleting[0].name}</span> ({deleting[0].email}) will be permanently removed from the{" "}
                {deleting[0].source === "student" ? "student waitlist" : "Tutor Circle"}. This can&apos;t be undone.
              </p>
            ) : (
              <p className="text-ensena-muted">
                <span className="font-semibold text-ensena-ink">{deleting.length} sign-ups</span> will be permanently removed
                {(() => {
                  const students = deleting.filter((d) => d.source === "student").length;
                  const tutors = deleting.length - students;
                  return ` (${[students ? `${students} from the student waitlist` : "", tutors ? `${tutors} from the Tutor Circle` : ""].filter(Boolean).join(", ")})`;
                })()}
                . This can&apos;t be undone.
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" disabled={pending} onClick={() => setDeleting(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
                Cancel
              </Button>
              <Button onClick={confirmDelete} loading={pending} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
