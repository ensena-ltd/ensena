"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAccountStatusVersion } from "@/hooks/use-account-status";
import { useAdminTutors } from "@/hooks/use-admin-tutors";
import { useReviews } from "@/hooks/use-reviews";
import { getAccountStatus, setAccountStatus, type AccountStatus } from "@/lib/account-status-store";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";
import { adminTutorStatusStyles, adminVerificationStyles } from "@/lib/admin-data";
import { currentActorLabel } from "@/lib/admin-session";
import { sendMessage } from "@/lib/admin-communications-store";
import { setTutorVerification } from "@/lib/tutor-verification-store";
import { splitEarnings } from "@/lib/commission";
import { downloadCsv } from "@/lib/csv";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusFilter = AccountStatus | "All";
type VerificationFilter = "All" | "Verified" | "Pending" | "Rejected";

const statusTabs: StatusFilter[] = ["All", "Active", "Suspended", "Banned"];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AdminTutorsClient() {
  const searchParams = useSearchParams();
  const verificationParam = searchParams.get("verification");
  const initialVerification: VerificationFilter = verificationParam === "Pending" || verificationParam === "Verified" || verificationParam === "Rejected" ? verificationParam : "All";

  const tutors = useAdminTutors();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>(initialVerification);
  const [subjectFilter, setSubjectFilter] = useState("All Subjects");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceSubject, setAnnounceSubject] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  function sendAnnouncement() {
    if (!announceSubject.trim() || !announceBody.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: `${checked.size} selected tutor${checked.size === 1 ? "" : "s"}`,
      recipientCount: checked.size,
      channels: ["In-App", "Email"],
      subject: announceSubject,
      body: announceBody,
    });
    flash(`Announcement sent to ${checked.size} tutor${checked.size === 1 ? "" : "s"}.`);
    setAnnounceOpen(false);
    setAnnounceSubject("");
    setAnnounceBody("");
    setChecked(new Set());
  }
  const router = useRouter();
  useAccountStatusVersion(); // re-render whenever any tutor's real status changes
  useReviews(); // re-render whenever a review is submitted/removed, so ratings below stay live

  const allSubjects = ["All Subjects", ...Array.from(new Set(tutors.flatMap((t) => t.subjects)))];

  const filtered = tutors.filter((t) => {
    const effectiveStatus = getAccountStatus("tutor", t.id).status;
    const matchesStatus = statusFilter === "All" || effectiveStatus === statusFilter;
    const matchesVerification = verificationFilter === "All" || t.verification === verificationFilter;
    const matchesSubject = subjectFilter === "All Subjects" || t.subjects.includes(subjectFilter);
    const q = query.trim().toLowerCase();
    const matchesQuery = q === "" || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    return matchesStatus && matchesVerification && matchesSubject && matchesQuery;
  });

  const totalRevenue = tutors.reduce((s, t) => s + t.earnings, 0);
  const liveRatings = tutors.map((t) => computeEffectiveTutorRating(t.name, t.rating, t.reviews));
  const avgRating = liveRatings.filter((r) => r.rating > 0).reduce((s, r, _, arr) => s + r.rating / arr.length, 0);

  const stats = [
    { label: "Total Tutors", value: tutors.length.toLocaleString() },
    { label: "Verified Tutors", value: tutors.filter((t) => t.verification === "Verified").length },
    { label: "Pending Verification", value: tutors.filter((t) => t.verification === "Pending").length },
    { label: "Currently Teaching", value: Math.round(tutors.filter((t) => getAccountStatus("tutor", t.id).status === "Active").length * 0.6) },
    { label: "Total Revenue (Lifetime)", value: formatNaira(totalRevenue) },
    { label: "Avg. Rating", value: avgRating.toFixed(2) },
  ];

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function toggleCheck(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openTutor(id: string, e: React.MouseEvent) {
    const href = `/admin/tutors/${id}`;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Tutors</h1>
        <p className="mt-1 text-sm text-ensena-muted">Manage and monitor all tutors on Ensena.</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-3.5">
            <p className="text-[11px] text-ensena-muted">{s.label}</p>
            <p className="text-lg font-semibold text-ensena-ink">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tutors by name, email, phone or ID…"
              className="h-10 w-72 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {statusTabs.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as VerificationFilter)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {["All", "Verified", "Pending", "Rejected"].map((v) => <option key={v}>{v}</option>)}
          </select>
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="h-9 rounded-full border border-ensena-border px-3 text-xs">
            {allSubjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button type="button" onClick={() => downloadCsv([["ID", "Name", "Email", "Subjects", "Rating", "Lessons", "Earnings", "Status", "Verification"], ...filtered.map((t) => [t.id, t.name, t.email, t.subjects.join("; "), computeEffectiveTutorRating(t.name, t.rating, t.reviews).rating, t.lessonsCompleted, t.earnings, getAccountStatus("tutor", t.id).status, t.verification])], "ensena-tutors.csv")} className="ml-auto flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Download className="size-3.5" /> Export
          </button>
        </div>

        {checked.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-xs">
            <span className="font-medium text-ensena-ink">{checked.size} selected</span>
            <button type="button" onClick={() => { checked.forEach((id) => setTutorVerification(id, "Verified")); flash("Selected tutors verified."); setChecked(new Set()); }} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-success hover:bg-ensena-success/10">Verify Selected</button>
            <button type="button" onClick={() => { checked.forEach((id) => setAccountStatus("tutor", id, "Suspended", "Bulk admin action", currentActorLabel())); flash("Selected tutors suspended."); setChecked(new Set()); }} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-amber-600 hover:bg-amber-50">Suspend Selected</button>
            <button type="button" onClick={() => setAnnounceOpen(true)} className="rounded-full border border-ensena-border bg-ensena-surface px-2.5 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft">Send Announcement</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="w-8 py-2 pr-2">
                  <input type="checkbox" checked={checked.size === filtered.length && filtered.length > 0} onChange={() => setChecked((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id))))} className="size-3.5 rounded border-ensena-border" />
                </th>
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 font-medium">Subjects</th>
                <th className="py-2 pr-4 font-medium">Rating</th>
                <th className="py-2 pr-4 font-medium">Lessons</th>
                <th className="py-2 pr-4 font-medium">Earnings</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Verification</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft" onClick={(e) => openTutor(t.id, e)}>
                  <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checked.has(t.id)} onChange={() => toggleCheck(t.id)} className="size-3.5 rounded border-ensena-border" />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(t.name)}</span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ensena-ink">{t.name}</p>
                        <p className="truncate text-xs text-ensena-muted">ID: {t.id.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {t.subjects.slice(0, 2).map((s) => <span key={s} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] text-ensena-ink">{s}</span>)}
                      {t.subjects.length > 2 && <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] text-ensena-muted">+{t.subjects.length - 2}</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-ink">
                    {(() => { const r = computeEffectiveTutorRating(t.name, t.rating, t.reviews); return r.rating > 0 ? <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {r.rating} <span className="text-xs text-ensena-muted">({r.reviews})</span></span> : "N/A"; })()}
                  </td>
                  <td className="py-3 pr-4 text-ensena-ink">{t.lessonsCompleted}</td>
                  <td className="py-3 pr-4 text-ensena-ink">{formatNaira(splitEarnings(t.earnings).net)}</td>
                  <td className="py-3 pr-4">{(() => { const s = getAccountStatus("tutor", t.id).status; return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", adminTutorStatusStyles[s])}>{s}</span>; })()}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", adminVerificationStyles[t.verification])}>{t.verification}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No tutors match this filter.</p>}
        </div>
      </div>

      <Modal open={announceOpen} onClose={() => setAnnounceOpen(false)} title="Send Announcement">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Sends to {checked.size} selected tutor{checked.size === 1 ? "" : "s"} via the real messaging/communications log.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={announceSubject} onChange={(e) => setAnnounceSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={announceBody} onChange={(e) => setAnnounceBody(e.target.value)} rows={4} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button
            onClick={sendAnnouncement}
            disabled={!announceSubject.trim() || !announceBody.trim()}
            className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Announcement
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
