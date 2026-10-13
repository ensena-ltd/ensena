"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Search, ShieldCheck } from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { logAdminAction } from "@/lib/admin-audit-log";
import { sendMessage } from "@/lib/admin-communications-store";
import { currentActorLabel } from "@/lib/admin-session";
import { platformUserStatusLabel, platformUserStatusStyles, platformUsers, type PlatformUser, type PlatformUserRole } from "@/lib/admin-users-data";
import { cn } from "@/lib/utils";

type TypeTab = "All Users" | "Students" | "Tutors";
const typeTabs: TypeTab[] = ["All Users", "Students", "Tutors"];

function matchesTab(u: PlatformUser, tab: TypeTab): boolean {
  if (tab === "All Users") return true;
  if (tab === "Students") return u.role === "Student";
  return u.role === "Tutor";
}

const roleLabel: Record<PlatformUserRole, string> = { Student: "Student", Tutor: "Tutor", Counsellor: "Counsellor", Admin: "Admin" };

export function AdminUserDirectoryClient() {
  const [tab, setTab] = useState<TypeTab>("All Users");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("All States");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [dateFilter, setDateFilter] = useState("Any Time");

  const [contactTarget, setContactTarget] = useState<PlatformUser | null>(null);
  const [channel, setChannel] = useState<"Email" | "In-App">("Email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const states = ["All States", ...Array.from(new Set(platformUsers.map((u) => u.state)))];
  const q = query.trim().toLowerCase();

  const filtered = platformUsers
    .filter((u) => u.role === "Student" || u.role === "Tutor")
    .filter((u) => matchesTab(u, tab))
    .filter((u) => stateFilter === "All States" || u.state === stateFilter)
    .filter((u) => statusFilter === "All Statuses" || platformUserStatusLabel[u.status] === statusFilter)
    .filter((u) => {
      if (dateFilter === "Any Time") return true;
      // joined is a display string like "January 2024" — only "This Year" is
      // reliably computable from that format without inventing exact dates.
      if (dateFilter === "This Year") return u.joined.includes("2026") || u.joined.includes("2025");
      return true;
    })
    .filter((u) => {
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    });

  function openContact(u: PlatformUser) {
    setContactTarget(u);
    setChannel("Email");
    setSubject("");
    setBody("");
  }

  function submitContact() {
    if (!contactTarget || !subject.trim() || !body.trim()) return;
    sendMessage({
      sentBy: currentActorLabel(),
      audienceLabel: `${contactTarget.name} (${roleLabel[contactTarget.role]})`,
      recipientCount: 1,
      channels: [channel],
      subject: subject.trim(),
      body: body.trim(),
    });
    logAdminAction("Sent message", currentActorLabel(), `${contactTarget.name} via ${channel}`);
    flash(`Message sent to ${contactTarget.name}.`);
    setContactTarget(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">User Directory</h1>
          <p className="mt-1 text-sm text-ensena-muted">Find and contact students and tutors. Visibility of email/phone is governed by the View Email / View Phone Number permissions under Settings → Permissions.</p>
        </div>
        <div className="relative min-w-[260px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, phone…" className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm">
            {typeTabs.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium", tab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>{t}</button>
            ))}
          </div>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option>All Statuses</option>
            <option>Active</option>
            <option>Restricted</option>
            <option>Banned</option>
            <option>Pending</option>
          </select>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="h-10 rounded-full border border-ensena-border px-3 text-sm">
            <option>Any Time</option>
            <option>This Year</option>
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Location</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Joined</th>
                <th className="py-2 pr-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={u.image} alt={u.name} fill sizes="28px" className="object-cover" /></span>
                      <span className="font-medium text-ensena-ink">{u.name}</span>
                      {u.role === "Tutor" ? (
                        <VerifiedTutorBadge tutorName={u.name} className="size-3.5" />
                      ) : (
                        u.verified && <ShieldCheck className="size-3.5 text-ensena-primary" aria-label="Verified account" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">{roleLabel[u.role]}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{u.email}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{u.phone}</td>
                  <td className="py-3 pr-4 text-ensena-muted">{u.state}, {u.country}</td>
                  <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", platformUserStatusStyles[u.status])}>{platformUserStatusLabel[u.status]}</span></td>
                  <td className="py-3 pr-4 text-ensena-muted">{u.joined}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button type="button" onClick={() => openContact(u)} className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"><Mail className="size-3.5" /> Contact</button>
                      <Link href={`/admin/users/${u.id}`} className="inline-flex h-8 items-center justify-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">View</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-ensena-muted">No users match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ensena-muted">Showing {filtered.length} of {platformUsers.filter((u) => u.role === "Student" || u.role === "Tutor").length} users</p>
      </div>

      <Modal open={!!contactTarget} onClose={() => setContactTarget(null)} title={`Contact ${contactTarget?.name ?? ""}`}>
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {(["Email", "In-App"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium", channel === c ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-ink")}>{c === "Email" ? "Email" : "In-App Message"}</button>
            ))}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Message</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="rounded-lg border border-ensena-border p-2.5 text-sm" />
          </label>
          <Button onClick={submitContact} disabled={!subject.trim() || !body.trim()} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">Send</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
