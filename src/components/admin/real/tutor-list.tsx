"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, FileText, RotateCcw, Search, XCircle } from "lucide-react";

import { formatDate, PersonAvatar, TutorStatusBadge } from "@/components/admin/real/admin-ui";
import type { AdminTutorRecord } from "@/lib/admin-registrations";
import { tutorDocumentTypes, type TutorApplicationStatus } from "@/lib/tutor-application";
import { cn } from "@/lib/utils";

type Tab = "all" | TutorApplicationStatus;

// Real tutors from Supabase. mode="verification" is the Tutor Verification
// queue (Needs Verification / Verified / Resubmission Required / Rejected);
// mode="tutors" is the full Tutors list (adds an "All" tab).
export function TutorList({ tutors, mode }: { tutors: AdminTutorRecord[]; mode: "verification" | "tutors" }) {
  const searchParams = useSearchParams();
  const tabs: { key: Tab; label: string }[] = [
    ...(mode === "tutors" ? [{ key: "all" as Tab, label: "All Tutors" }] : []),
    { key: "pending", label: "Needs Verification" },
    { key: "approved", label: "Verified" },
    { key: "resubmission_required", label: "Resubmission Required" },
    { key: "rejected", label: "Rejected" },
  ];
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.key === tabParam) ? tabParam! : mode === "tutors" ? "all" : "pending");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");

  const counts: Record<TutorApplicationStatus, number> = { pending: 0, approved: 0, rejected: 0, resubmission_required: 0 };
  tutors.forEach((t) => counts[t.status]++);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tutors.filter(
      (t) =>
        (tab === "all" || t.status === tab) &&
        (!q || [t.fullName, t.email, t.phone, t.application.country, ...t.application.subjects].some((v) => v.toLowerCase().includes(q)))
    );
    return list.sort((a, b) =>
      sort === "name" ? a.fullName.localeCompare(b.fullName) : sort === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)
    );
  }, [tutors, tab, query, sort]);

  const cards = [
    { key: "pending" as const, label: "Needs Verification", sub: "Waiting for review", icon: Clock, tint: "bg-orange-100 text-orange-600" },
    { key: "approved" as const, label: "Verified", sub: "Approved tutors", icon: CheckCircle2, tint: "bg-emerald-100 text-emerald-600" },
    { key: "resubmission_required" as const, label: "Resubmission Required", sub: "Asked to fix details", icon: RotateCcw, tint: "bg-amber-100 text-amber-600" },
    { key: "rejected" as const, label: "Rejected", sub: "Applications rejected", icon: XCircle, tint: "bg-rose-100 text-rose-600" },
  ];
  const basePath = mode === "verification" ? "/admin/verification" : "/admin/tutors";
  const requiredDocs = tutorDocumentTypes.filter((d) => d.required).length;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{mode === "verification" ? "Tutor Verification" : "Tutors"}</h1>
      <p className="mt-1 text-sm text-ensena-muted">
        {mode === "verification" ? "Review and verify tutors before they can teach on Ensena." : `${tutors.length} registered tutor${tutors.length === 1 ? "" : "s"}.`}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setTab(c.key)}
            className={cn("flex items-center gap-3 rounded-2xl border bg-ensena-surface p-4 text-left transition-colors", tab === c.key ? "border-ensena-primary" : "border-ensena-border hover:bg-ensena-bg-soft")}
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", c.tint)}><c.icon className="size-5" /></span>
            <span>
              <span className="block font-heading text-xl font-semibold text-ensena-ink">{counts[c.key]}</span>
              <span className="block text-xs font-medium text-ensena-ink">{c.label}</span>
              <span className="block text-[11px] text-ensena-muted">{c.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface">
        <div className="flex flex-wrap items-center gap-2 border-b border-ensena-border px-4 pt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn("-mb-px border-b-2 px-2 pb-2.5 text-sm font-medium", tab === t.key ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
            >
              {t.label} <span className="text-xs">({t.key === "all" ? tutors.length : counts[t.key]})</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone, country or subject" className="h-10 w-full rounded-xl border border-ensena-border pl-9 pr-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-10 rounded-xl border border-ensena-border px-3 text-sm">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 pb-8 pt-2 text-center text-sm text-ensena-muted">No tutors here yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-y border-ensena-border bg-ensena-bg-soft text-xs text-ensena-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tutor</th>
                  <th className="px-4 py-2.5 font-medium">Subjects</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium">Documents</th>
                  <th className="px-4 py-2.5 font-medium">Registered</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const requiredIn = tutorDocumentTypes.filter((d) => d.required && t.documents.some((x) => x.type === d.type && x.status !== "rejected")).length;
                  return (
                    <tr key={t.id} className="border-b border-ensena-border last:border-b-0 hover:bg-ensena-bg-soft/60">
                      <td className="px-4 py-3">
                        <Link href={`${basePath}/${t.id}`} className="flex items-center gap-3">
                          <PersonAvatar name={t.fullName} url={t.avatarUrl} size={36} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ensena-ink">{t.fullName}</span>
                            <span className="block truncate text-xs text-ensena-muted">{t.email}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-ensena-ink">{t.application.subjects.slice(0, 3).join(", ") || "—"}{t.application.subjects.length > 3 && ` +${t.application.subjects.length - 3}`}</td>
                      <td className="px-4 py-3 text-xs text-ensena-ink">{[t.application.stateCity, t.application.country].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className={cn("inline-flex items-center gap-1 font-medium", requiredIn === requiredDocs ? "text-ensena-success" : "text-amber-600")}>
                          <FileText className="size-3.5" /> {t.documents.length} uploaded · {requiredIn}/{requiredDocs} required
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ensena-muted">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3"><TutorStatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`${basePath}/${t.id}`} className="inline-flex h-8 items-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                          {t.status === "pending" ? "Review" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
