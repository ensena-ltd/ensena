"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAdminSession } from "@/hooks/use-admin-session";
import { fileManualSupportTicket } from "@/lib/actions/support";
import { initialAdminStudents } from "@/lib/admin-data";
import { getPlatformUsers } from "@/lib/admin-platform-users-store";
import { submitSupportRequest } from "@/lib/support-store";
import { SUPPORT_CONTEXT_CONFIG, type SupportChannel, type SupportContext, type SupportPriority, type SupportUserRole } from "@/lib/support-data";
import type { SupportDirectoryEntry, SupportStaffOption } from "@/lib/support-server";
import { getAdminTutors } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

type RequesterMode = "existing" | "external" | "self";
const STAFF_ROLES = ["Customer Support", "Student Support", "Tutor Support", "Platform Admin", "Super Admin"];
const channelOptions: SupportChannel[] = ["Phone", "WhatsApp", "In Person", "Email", "Other"];
const priorityOptions: SupportPriority[] = ["Low", "Normal", "High", "Urgent"];

interface DirectoryMatch {
  id: string;
  name: string;
  email: string;
  role: SupportUserRole;
}

// Enseña's real Support system, extended for the case a call/WhatsApp/
// in-person complaint needs to become a real ticket while staff are still
// talking to the person — not a second ticketing system. Every path here
// ends at the exact same submitSupportRequest()/SupportRequest record the
// self-service "Contact Support" form already writes to, just with
// source: "Manual" and a channel/filedByStaffName attached, so it opens
// into the identical detail page.
// `live` = real users to search and real staff to assign; the ticket is then
// created in the database. Without it this files into the browser demo store.
export function AdminSupportNewClient({ live }: { live?: { directory: SupportDirectoryEntry[]; staff: SupportStaffOption[] } } = {}) {
  const router = useRouter();
  const session = useAdminSession();

  const [mode, setMode] = useState<RequesterMode>("existing");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DirectoryMatch | null>(null);
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [externalPhone, setExternalPhone] = useState("");
  const [externalRole, setExternalRole] = useState<SupportUserRole>("Guest");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<SupportChannel>("Phone");
  const [priority, setPriority] = useState<SupportPriority>("Normal");
  const [assignedStaff, setAssignedStaff] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directory: DirectoryMatch[] = useMemo(() => live ? live.directory : [
    ...initialAdminStudents.map((s) => ({ id: s.name, name: s.name, email: s.email, role: "Student" as const })),
    ...getAdminTutors().map((t) => ({ id: t.name, name: t.name, email: t.email, role: "Tutor" as const })),
  ], [live]);
  const needle = query.trim().toLowerCase();
  const matches = needle.length === 0 ? [] : directory.filter((d) => d.name.toLowerCase().includes(needle) || d.email.toLowerCase().includes(needle)).slice(0, 6);

  const staffOptions: { id: string; name: string }[] = useMemo(
    () => live ? live.staff : getPlatformUsers().filter((u) => STAFF_ROLES.includes(u.role)).map((u) => ({ id: u.name, name: u.name })),
    [live]
  );

  // The category list follows the same real, shared system every other
  // Support surface uses (SUPPORT_CONTEXT_CONFIG) — a Student requester sees
  // student categories, a Tutor requester sees tutor categories, and an
  // unmatched/prospective caller sees the general public list. No second
  // category system invented for manual tickets.
  const requesterRole: SupportUserRole = mode === "self" ? "Admin" : mode === "existing" ? (selected?.role ?? "Guest") : externalRole;
  const context: SupportContext = requesterRole === "Student" ? "student" : requesterRole === "Tutor" ? "tutor" : requesterRole === "Admin" ? "platform-staff" : "public";
  const categories = SUPPORT_CONTEXT_CONFIG[context].categories;

  const requesterName = mode === "self" ? session.name : mode === "existing" ? selected?.name : externalName.trim();
  const requesterEmail = mode === "self" ? session.email : mode === "existing" ? selected?.email : externalEmail.trim() || undefined;

  const canSubmit = Boolean(requesterName) && subject.trim() !== "" && category !== "" && message.trim() !== "" && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !requesterName) return;
    setSubmitting(true);
    setError(null);
    if (live) {
      const result = await fileManualSupportTicket({
        mode,
        requesterId: selected?.id,
        externalName,
        externalEmail,
        externalPhone,
        externalRole,
        category,
        subject,
        message,
        channel,
        priority,
        assignedStaffId: assignedStaff || undefined,
      });
      if (!result.ok) {
        setError(result.message);
        setSubmitting(false);
        return;
      }
      router.push(`/admin/support/${result.id}`);
      return;
    }
    try {
      const request = await submitSupportRequest({
        userName: requesterName,
        userEmail: requesterEmail,
        userPhone: mode === "external" ? externalPhone.trim() || undefined : undefined,
        userRole: requesterRole,
        isExistingUser: mode !== "external",
        context,
        category,
        subject: subject.trim(),
        message: message.trim(),
        source: mode === "self" ? "Ticket" : "Manual",
        channel: mode === "self" ? undefined : channel,
        filedByStaffName: mode === "self" ? undefined : session.name,
        priority,
        assignedStaff: assignedStaff || undefined,
      });
      router.push(`/admin/support/${request.id}`);
    } catch {
      setError("We couldn't create this ticket. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" onClick={() => router.back()} className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Support
      </button>

      <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink sm:text-2xl">New Ticket</h1>
      <p className="mt-1 text-sm text-ensena-muted">File a ticket on behalf of a caller, or report an issue yourself.</p>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <p className="text-sm font-semibold text-ensena-ink">Requester</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {([
            { key: "existing" as const, label: "Existing Enseña user" },
            { key: "external" as const, label: "Not an existing user" },
            { key: "self" as const, label: "I'm reporting my own issue" },
          ]).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => { setMode(opt.key); setSelected(null); setQuery(""); setCategory(""); }}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold",
                mode === opt.key ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {mode === "existing" && (
          <div className="mt-4">
            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><UserRound className="size-4" /></span>
                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">{selected.name} <span className="font-normal text-ensena-muted">· {selected.role}</span></p>
                    <p className="text-xs text-ensena-muted">{selected.email}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-xs font-medium text-ensena-primary hover:underline">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
                />
                {matches.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-ensena-border bg-ensena-surface p-1.5 shadow-sm">
                    {matches.map((m) => (
                      <button
                        key={`${m.role}-${m.id}`}
                        type="button"
                        onClick={() => { setSelected(m); setQuery(""); setCategory(""); }}
                        className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ensena-bg-soft"
                      >
                        <span className="font-medium text-ensena-ink">{m.name}</span>
                        <span className="text-xs text-ensena-muted">{m.role} · {m.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {query.trim() !== "" && matches.length === 0 && (
                  <p className="mt-1.5 text-xs text-ensena-muted">No matching user found. Switch to &quot;Not an existing user&quot; instead.</p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === "external" && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Full name</span>
              <input value={externalName} onChange={(e) => setExternalName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Email</span>
              <input type="email" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Phone</span>
              <input value={externalPhone} onChange={(e) => setExternalPhone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Contact type</span>
              <select value={externalRole} onChange={(e) => setExternalRole(e.target.value as SupportUserRole)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                <option value="Guest">Prospective / Guest</option>
                <option value="Student">Student (no account yet)</option>
                <option value="Tutor">Tutor (no account yet)</option>
              </select>
            </label>
          </div>
        )}

        {mode === "self" && (
          <p className="mt-4 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">Filing as <span className="font-semibold">{session.name}</span> (internal escalation).</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary of the issue" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>

        <div className="mt-3">
          <p className="text-xs font-medium text-ensena-muted">Category</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  category === c ? "border-ensena-primary bg-ensena-primary/5 text-ensena-primary" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {mode !== "self" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Channel</span>
              <select value={channel} onChange={(e) => setChannel(e.target.value as SupportChannel)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
                {channelOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as SupportPriority)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Assign to</span>
            <select value={assignedStaff} onChange={(e) => setAssignedStaff(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              <option value="">Unassigned</option>
              {staffOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ensena-muted">{mode === "self" ? "Describe the issue" : "Record what the caller said"}</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder={mode === "self" ? "What's going on?" : "e.g. Student says payment was deducted but the tutor never joined the scheduled lesson."}
            className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
          />
        </label>
      </div>

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create Ticket"}
      </Button>
    </div>
  );
}
