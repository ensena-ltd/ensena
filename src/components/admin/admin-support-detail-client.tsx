"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bold,
  ChevronDown,
  ChevronLeft,
  Italic,
  Link as LinkIcon,
  List,
  Mail,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Ticket as TicketIcon,
  Underline,
} from "lucide-react";

import { supportPriorityStyles, supportStatusStyles } from "@/components/support/support-conversation";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useSupportRequests } from "@/hooks/use-support-requests";
import { initialAdminStudents } from "@/lib/admin-data";
import { getPlatformUsers } from "@/lib/admin-platform-users-store";
import { resolveRelatedRecord } from "@/lib/support-related-record";
import { assignSupportRequestTo, setSupportPriority, setSupportStatus, staffReplyToSupportRequest } from "@/lib/actions/support";
import { addSupportReply, assignSupportRequest, updateSupportPriority, updateSupportStatus } from "@/lib/support-store";
import type { AdminSupportExtras, SupportStaffOption } from "@/lib/support-server";
import { uploadSupportFiles } from "@/lib/support-uploads";
import type { SupportAttachment, SupportPriority, SupportRequest, SupportStatus } from "@/lib/support-data";
import { getAdminTutors } from "@/lib/tutor-verification-store";
import { cn } from "@/lib/utils";

const STAFF_ROLES = ["Customer Support", "Student Support", "Tutor Support", "Platform Admin", "Super Admin"];
const STATUS_OPTIONS: SupportStatus[] = ["Open", "In Progress", "Waiting for User", "Resolved", "Closed"];
const PRIORITY_OPTIONS: SupportPriority[] = ["Low", "Normal", "High", "Urgent"];

const SOURCE_STYLES = {
  Ticket: { icon: TicketIcon, className: "bg-blue-50 text-blue-600" },
  Email: { icon: Mail, className: "bg-rose-50 text-rose-600" },
  "Live Chat": { icon: MessageCircle, className: "bg-emerald-50 text-emerald-600" },
  Report: { icon: AlertTriangle, className: "bg-amber-50 text-amber-600" },
  Manual: { icon: Phone, className: "bg-purple-50 text-purple-600" },
} as const;

type Tab = "Conversation" | "Details" | "Related Information" | "Activity";
const tabs: Tab[] = ["Conversation", "Details", "Related Information", "Activity"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ name, size = "size-9" }: { name: string; size?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary", size)}>{initials(name)}</span>;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="text-ensena-muted">{label}</span>
      <span className="text-right font-medium text-ensena-ink">{value}</span>
    </div>
  );
}

export interface AdminSupportLive {
  request: SupportRequest | null;
  extras: AdminSupportExtras;
  staff: SupportStaffOption[];
}

// `live` = the request loaded from the database, with real staff to assign;
// every action then goes through the support server actions. Without it the
// page falls back to the browser demo store.
export function AdminSupportDetailClient({ id, live }: { id: string; live?: AdminSupportLive }) {
  const session = useAdminSession();
  const router = useRouter();
  const requests = useSupportRequests();
  const request = live ? live.request : requests.find((r) => r.id === id);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("Conversation");
  const [composerMode, setComposerMode] = useState<"reply" | "internal">("reply");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<(SupportAttachment & { file: File })[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const demoStaff = useMemo(() => getPlatformUsers().filter((u) => STAFF_ROLES.includes(u.role)).map((u) => ({ id: u.name, name: u.name, role: u.role })), []);
  const staffOptions = live ? live.staff : demoStaff;
  const assignedId = live ? (staffOptions.find((s) => s.name === request?.assignedStaff)?.id ?? "") : (request?.assignedStaff ?? "");

  // Runs a server action, then reloads the page data; demo mode runs the
  // local store function instead.
  function run(action: () => Promise<{ ok: boolean; message?: string }>, demo: () => void) {
    setActionError(null);
    if (!live) return demo();
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setActionError(result.message ?? "That didn't work. Please try again.");
      router.refresh();
    });
  }
  function changeStatus(status: SupportStatus) {
    run(() => setSupportStatus(id, status), () => updateSupportStatus(id, status, session.name));
  }
  function changePriority(priority: SupportPriority) {
    run(() => setSupportPriority(id, priority), () => updateSupportPriority(id, priority, session.name));
  }

  if (!request) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This support request could not be found.</p>
        <Link href="/admin/support" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Support</Link>
      </div>
    );
  }

  const related = live
    ? request.relatedRecordLabel
      ? { type: request.relatedRecordType!, id: request.relatedRecordId ?? "", label: request.relatedRecordLabel, lines: request.relatedRecordId ? [{ label: "Reference", value: request.relatedRecordId }] : [] }
      : undefined
    : resolveRelatedRecord(request.relatedRecordType ?? null, request.relatedRecordId ?? null, request.relatedRecordLabel ?? null);
  const tutorMatch = live ? undefined : getAdminTutors().find((t) => t.name === request.userName);
  const studentMatch = live ? undefined : initialAdminStudents.find((s) => s.name === request.userName);
  // "View User Profile" only resolves for requesters that exist in the
  // admin Students/Tutors rosters — a seeded demo requester with no such
  // record falls back to the relevant list rather than a dead link.
  const userProfileHref = live ? live.extras.requesterProfileHref : tutorMatch ? `/admin/tutors/${tutorMatch.id}` : studentMatch ? `/admin/students/${studentMatch.id}` : request.userRole === "Tutor" ? "/admin/tutors" : request.userRole === "Student" ? "/admin/students" : undefined;
  const accountStatus = live ? (live.extras.requesterAccountStatus ?? (request.userRole === "Guest" ? "No account" : "—")) : tutorMatch ? tutorMatch.verification : studentMatch ? studentMatch.status : request.userRole === "Admin" ? "Staff" : "—";
  const relatedHref =
    request.relatedRecordType === "booking" ? "/admin/bookings"
      : request.relatedRecordType === "group-class" ? "/admin/group-classes"
        : request.relatedRecordType === "payout" && request.relatedRecordId ? `/admin/payments/payouts/${request.relatedRecordId}`
          : request.relatedRecordType === "counselling" && request.relatedRecordId ? `/admin/counsellors/${request.relatedRecordId}`
            : undefined;

  const SourceIcon = SOURCE_STYLES[request.source].icon;

  function insertMarker(marker: string) {
    setMessage((m) => `${m}${marker}text${marker}`);
    textareaRef.current?.focus();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachments((prev) => [...prev, { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, dataUrl: reader.result as string, file }]);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSend() {
    if (!message.trim() && attachments.length === 0) return;
    const text = message.trim();
    const internal = composerMode === "internal";
    if (!live) {
      addSupportReply(request!.id, "staff", session.name, text, { isInternal: internal, attachments: attachments.length ? attachments.map(({ name, size, dataUrl }) => ({ name, size, dataUrl })) : undefined });
      setMessage("");
      setAttachments([]);
      return;
    }
    setActionError(null);
    startTransition(async () => {
      try {
        const uploaded = attachments.length ? await uploadSupportFiles(attachments.map((a) => a.file)) : [];
        const result = await staffReplyToSupportRequest(id, text, { internal, attachments: uploaded });
        if (!result.ok) {
          setActionError(result.message);
          return;
        }
        setMessage("");
        setAttachments([]);
        router.refresh();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Your reply couldn't be sent.");
      }
    });
  }

  function handleAssign(staffId: string) {
    const staffName = staffOptions.find((s) => s.id === staffId)?.name ?? "";
    run(() => assignSupportRequestTo(id, staffId), () => assignSupportRequest(request!.id, staffName, session.name));
    setAssignOpen(false);
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-ensena-muted">
        <Link href="/admin/support" className="hover:text-ensena-ink">Support</Link>
        <span>›</span>
        <span className="font-mono text-ensena-ink">{request.id}</span>
      </div>

      <Link href="/admin/support" className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-ensena-border px-3.5 py-1.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
        <ChevronLeft className="size-4" /> Back to Support
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", SOURCE_STYLES[request.source].className)}>
            <SourceIcon className="size-5" />
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{request.subject}</h1>
            <p className="mt-0.5 text-xs text-ensena-muted">{request.id} · Created {formatDateTime(request.createdAtISO)} · via {request.source}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ensena-muted">Priority</p>
            <span className={cn("mt-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", supportPriorityStyles[request.priority])}>{request.priority}</span>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ensena-muted">Status</p>
            <span className={cn("mt-0.5 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", supportStatusStyles[request.status])}>{request.status}</span>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ensena-muted">Assigned To</p>
            <p className="mt-0.5 text-sm font-medium text-ensena-ink">{request.assignedStaff ?? "Unassigned"}</p>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setAssignOpen((v) => !v)} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
              Assign
            </button>
            {assignOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAssignOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-20 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
                  {staffOptions.map((s) => (
                    <button key={s.id} type="button" onClick={() => handleAssign(s.id)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ensena-bg-soft">
                      <Avatar name={s.name} size="size-7" />
                      <span>
                        <span className="block font-medium text-ensena-ink">{s.name}</span>
                        <span className="block text-xs text-ensena-muted">{s.role === "Customer Support" ? "Support Specialist" : s.role}</span>
                      </span>
                    </button>
                  ))}
                  <button type="button" onClick={() => handleAssign("")} className="mt-1 flex w-full items-center rounded-xl px-2.5 py-2 text-left text-sm text-ensena-muted hover:bg-ensena-bg-soft">
                    Unassigned
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="More actions" className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft">
              <MoreVertical className="size-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-11 z-20 w-48 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
                  <button type="button" onClick={() => { changeStatus("Resolved"); setMenuOpen(false); }} className="flex w-full items-center rounded-xl px-2.5 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                    Mark Resolved
                  </button>
                  <button type="button" onClick={() => { changeStatus("Closed"); setMenuOpen(false); }} className="flex w-full items-center rounded-xl px-2.5 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                    Close Ticket
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div>
          <div className="flex gap-1 border-b border-ensena-border">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "border-b-2 px-3.5 py-2.5 text-sm font-medium",
                  tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Conversation" && (
            <div className="mt-4 flex flex-col gap-4">
              {request.conversation.map((m) => (
                <div key={m.id} className={cn("flex gap-3 rounded-2xl border p-4", m.isInternal ? "border-amber-200 bg-amber-50" : "border-ensena-border bg-ensena-surface")}>
                  <Avatar name={m.authorName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                        {m.authorName}
                        <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">
                          {m.isInternal ? "Internal Note" : m.author === "staff" ? "Support Team" : request.userRole}
                        </span>
                      </p>
                      <p className="text-xs text-ensena-muted">{formatDateTime(m.atISO)}</p>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-ensena-ink">{m.text}</p>
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {m.attachments.map((a) =>
                          a.dataUrl ? (
                            <a key={a.name} href={a.dataUrl} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-2 rounded-lg border border-ensena-border bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink hover:underline">
                              <Paperclip className="size-3.5 shrink-0" /> {a.name} <span className="text-ensena-muted">({a.size})</span>
                            </a>
                          ) : (
                            <span key={a.name} className="flex w-fit items-center gap-2 rounded-lg border border-ensena-border bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">
                              <Paperclip className="size-3.5 shrink-0" /> {a.name} <span className="text-ensena-muted">({a.size})</span>
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <div className="flex gap-1 border-b border-ensena-border pb-2">
                  <button type="button" onClick={() => setComposerMode("reply")} className={cn("rounded-t-lg px-3 py-1.5 text-sm font-semibold", composerMode === "reply" ? "border-b-2 border-ensena-primary text-ensena-primary" : "text-ensena-muted")}>
                    Reply to User
                  </button>
                  <button type="button" onClick={() => setComposerMode("internal")} className={cn("rounded-t-lg px-3 py-1.5 text-sm font-semibold", composerMode === "internal" ? "border-b-2 border-amber-500 text-amber-600" : "text-ensena-muted")}>
                    Internal Note
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1 border-b border-ensena-border pb-2 text-ensena-muted">
                  <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs">Paragraph <ChevronDown className="size-3" /></span>
                  <span className="mx-1 h-4 w-px bg-ensena-border" />
                  <button type="button" title="Bold" onClick={() => insertMarker("**")} className="flex size-7 items-center justify-center rounded-lg hover:bg-ensena-bg-soft"><Bold className="size-3.5" /></button>
                  <button type="button" title="Italic" onClick={() => insertMarker("_")} className="flex size-7 items-center justify-center rounded-lg hover:bg-ensena-bg-soft"><Italic className="size-3.5" /></button>
                  <button type="button" title="Underline" onClick={() => insertMarker("__")} className="flex size-7 items-center justify-center rounded-lg hover:bg-ensena-bg-soft"><Underline className="size-3.5" /></button>
                  <span className="mx-1 h-4 w-px bg-ensena-border" />
                  <span className="flex size-7 items-center justify-center rounded-lg text-ensena-border"><List className="size-3.5" /></span>
                  <span className="flex size-7 items-center justify-center rounded-lg text-ensena-border"><LinkIcon className="size-3.5" /></span>
                  <span className="flex size-7 items-center justify-center rounded-lg text-ensena-border"><Smile className="size-3.5" /></span>
                </div>

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder={composerMode === "internal" ? "Add a note visible only to staff…" : "Type your reply here…"}
                  className="mt-2 w-full resize-none rounded-xl border-none p-1 text-sm outline-none"
                />

                {attachments.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {attachments.map((a) => (
                      <span key={a.name} className="flex items-center gap-1.5 rounded-lg bg-ensena-bg-soft px-2 py-1 text-xs text-ensena-ink">
                        <Paperclip className="size-3 shrink-0" /> {a.name}
                      </span>
                    ))}
                  </div>
                )}

                {actionError && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{actionError}</p>}
                <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="hidden" />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-ensena-muted hover:text-ensena-ink">
                    <Paperclip className="size-3.5" /> Attach Files
                  </button>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setMessage(""); setAttachments([]); }} className="h-9 rounded-full border border-ensena-border px-4 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={pending || (!message.trim() && attachments.length === 0)}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white disabled:opacity-50",
                        composerMode === "internal" ? "bg-amber-500 hover:bg-amber-600" : "bg-ensena-primary hover:bg-ensena-primary-hover"
                      )}
                    >
                      <Send className="size-3.5" /> {composerMode === "internal" ? "Add Note" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "Details" && (
            <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 divide-y divide-ensena-border">
              <InfoRow label="Request ID" value={request.id} />
              <InfoRow label="Source" value={request.source} />
              <InfoRow label="Category" value={request.category} />
              {request.subcategory && <InfoRow label="Subcategory" value={request.subcategory} />}
              <InfoRow label="Context" value={request.context} />
              <InfoRow label="Requester" value={request.userName} />
              <InfoRow label="Role" value={request.userRole} />
              {request.userEmail && <InfoRow label="Email" value={request.userEmail} />}
              <InfoRow label="Created" value={formatDateTime(request.createdAtISO)} />
              <InfoRow label="Last Updated" value={formatDateTime(request.updatedAtISO)} />
              <InfoRow label="Assigned staff" value={request.assignedStaff ?? "Unassigned"} />
            </div>
          )}

          {tab === "Related Information" && (
            <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              {related ? (
                <>
                  <p className="text-sm font-semibold text-ensena-ink">{related.label}</p>
                  <dl className="mt-3 divide-y divide-ensena-border">
                    {related.lines.map((line) => (
                      <div key={line.label} className="flex items-center justify-between py-2 text-sm">
                        <dt className="text-ensena-muted">{line.label}</dt>
                        <dd className="font-medium text-ensena-ink">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {relatedHref && (
                    <Link href={relatedHref} className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
                      View {request.relatedRecordType === "booking" ? "Booking" : request.relatedRecordType === "group-class" ? "Group Class" : request.relatedRecordType === "payout" ? "Payout" : "Counselling Session"} →
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-sm text-ensena-muted">This request isn&apos;t linked to a specific booking, class, payout or counselling session.</p>
              )}
            </div>
          )}

          {tab === "Activity" && (
            <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <ul className="flex flex-col gap-4">
                {request.activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-ensena-primary" />
                    <div>
                      <p className="text-sm text-ensena-ink">{a.action}</p>
                      <p className="text-xs text-ensena-muted">{a.actorName} · {formatDateTime(a.atISO)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Request Information</h2>
            <div className="mt-2 divide-y divide-ensena-border">
              <InfoRow label="Request ID" value={request.id} />
              <InfoRow label="Source" value={request.source} />
              <InfoRow label="Category" value={request.category} />
              {request.subcategory && <InfoRow label="Subcategory" value={request.subcategory} />}
              <InfoRow label="Requester" value={request.userName} />
              <InfoRow label="Role" value={request.userRole} />
              {request.userEmail && <InfoRow label="Email" value={request.userEmail} />}
              <InfoRow label="Account Status" value={String(accountStatus)} />
              <InfoRow label="Created" value={formatDateTime(request.createdAtISO)} />
              <InfoRow label="Last Updated" value={formatDateTime(request.updatedAtISO)} />
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Ticket Actions</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-ensena-muted">Change Status</span>
                <select value={request.status} disabled={pending} onChange={(e) => changeStatus(e.target.value as SupportStatus)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-ensena-muted">Change Priority</span>
                <select value={request.priority} disabled={pending} onChange={(e) => changePriority(e.target.value as SupportPriority)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm">
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-ensena-muted">Assign To</span>
                <select value={assignedId} disabled={pending} onChange={(e) => handleAssign(e.target.value)} className="h-9 rounded-lg border border-ensena-border px-2 text-sm">
                  <option value="">Unassigned</option>
                  {staffOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => { setTab("Conversation"); setComposerMode("internal"); }} className="mt-1 h-9 rounded-full border border-ensena-border text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                Add Internal Note
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Quick Links</h2>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {userProfileHref && (
                <Link href={userProfileHref} className="font-medium text-ensena-primary hover:underline">View User Profile →</Link>
              )}
              <Link href={`/admin/support?query=${encodeURIComponent(request.userName)}`} className="font-medium text-ensena-primary hover:underline">
                View All Tickets from this User →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
