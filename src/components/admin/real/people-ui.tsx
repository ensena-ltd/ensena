"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { contactUser, restrictUser } from "@/lib/actions/admin-people";
import type { AccountStatus, AdminBookingStatus, BookingKind } from "@/lib/admin-people-bookings";
import type { AccountRole } from "@/lib/admin-registrations";
import { cn } from "@/lib/utils";

// Shared client pieces for the real (Supabase) Users / User Directory /
// Bookings admin pages.

export const roleLabels: Record<AccountRole, string> = { student: "Student", tutor: "Tutor", guardian: "Parent / Guardian", admin: "Admin", counsellor: "Counsellor" };
export const roleStyles: Record<AccountRole, string> = {
  student: "bg-blue-100 text-blue-700",
  tutor: "bg-violet-100 text-violet-700",
  guardian: "bg-pink-100 text-pink-700",
  admin: "bg-ensena-ink text-white",
  counsellor: "bg-teal-100 text-teal-700",
};

export function RoleBadge({ role }: { role: AccountRole }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", roleStyles[role] ?? "bg-ensena-bg-soft text-ensena-ink")}>{roleLabels[role] ?? role}</span>;
}

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: "Active",
  warned: "Warned",
  messaging_restricted: "Messaging restricted",
  suspended: "Suspended",
};
const accountStatusStyles: Record<AccountStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  warned: "bg-amber-100 text-amber-700",
  messaging_restricted: "bg-orange-100 text-orange-700",
  suspended: "bg-rose-100 text-rose-700",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", accountStatusStyles[status])}>{accountStatusLabels[status]}</span>;
}

export const bookingStatusStyles: Record<AdminBookingStatus, string> = {
  Pending: "bg-orange-100 text-orange-700",
  Upcoming: "bg-emerald-100 text-emerald-700",
  Live: "bg-sky-100 text-sky-700",
  Completed: "bg-blue-100 text-blue-700",
  Cancelled: "bg-rose-100 text-rose-700",
  Disputed: "bg-purple-100 text-purple-700",
  Waitlisted: "bg-slate-100 text-slate-700",
  "No-show": "bg-slate-100 text-slate-700",
};

export function BookingStatusBadge({ status }: { status: AdminBookingStatus }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", bookingStatusStyles[status])}>{status}</span>;
}

export const bookingKindLabels: Record<BookingKind, string> = { private: "Private lesson", group: "Group class", discovery: "Discovery session" };
const bookingKindStyles: Record<BookingKind, string> = { private: "bg-blue-50 text-blue-700", group: "bg-violet-50 text-violet-700", discovery: "bg-amber-50 text-amber-700" };

export function BookingKindBadge({ kind }: { kind: BookingKind }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold", bookingKindStyles[kind])}>{bookingKindLabels[kind]}</span>;
}

export const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export function lagosDateTime(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", ...opts }).format(new Date(iso));
}

export function downloadCsv(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const inputClass = "h-10 w-full rounded-lg border border-ensena-border bg-ensena-surface px-3 text-sm outline-none focus-visible:border-ensena-primary";
export const textareaClass = "w-full rounded-lg border border-ensena-border bg-ensena-surface p-2.5 text-sm outline-none focus-visible:border-ensena-primary";
export const primaryButton = "h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40";
export const dangerButton = "h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-ensena-muted">{label}</span>
      {children}
    </label>
  );
}

export { Field };

// ── Contact a user (email and/or in-app notification) ──────────────────

export function ContactUserModal({ target, bookingId, onClose }: { target: { id: string; name: string } | null; bookingId?: string; onClose: () => void }) {
  const [channel, setChannel] = useState<"email" | "in-app" | "both">("both");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  function close() {
    setSubject("");
    setBody("");
    onClose();
  }

  function send() {
    if (!target) return;
    start(async () => {
      const res = await contactUser({ userId: target.id, subject, body, channel, bookingId });
      if (res.ok) {
        toast.success(res.message ?? "Message sent.");
        close();
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  return (
    <Modal open={!!target} onClose={close} title={`Message ${target?.name ?? ""}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["both", "Email + in-app"],
              ["email", "Email only"],
              ["in-app", "In-app only"],
            ] as const
          ).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setChannel(value)} className={cn("rounded-full px-3.5 py-1.5 text-xs font-medium", channel === value ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-ink")}>
              {label}
            </button>
          ))}
        </div>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className={inputClass} />
        </Field>
        <Field label="Message">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} className={textareaClass} />
        </Field>
        <Button onClick={send} disabled={pending || !subject.trim() || !body.trim()} className={primaryButton}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
    </Modal>
  );
}

// ── Warn / restrict messaging / suspend ────────────────────────────────

export type RestrictionType = "Warning" | "MessagingRestriction" | "Suspension";
const restrictionCopy: Record<RestrictionType, { title: string; button: string; help: string }> = {
  Warning: { title: "Send a warning", button: "Send warning", help: "Recorded on the account and emailed to the user. Doesn't limit access." },
  MessagingRestriction: { title: "Restrict messaging", button: "Restrict messaging", help: "The user can still sign in and attend lessons but can't send messages." },
  Suspension: { title: "Suspend account", button: "Suspend account", help: "The user is blocked from using Ensena until the suspension ends or is lifted." },
};

export function RestrictUserModal({ target, type, onClose }: { target: { id: string; name: string } | null; type: RestrictionType; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [notify, setNotify] = useState(true);
  const [pending, start] = useTransition();
  const copy = restrictionCopy[type];

  function close() {
    setReason("");
    onClose();
  }

  function submit() {
    if (!target) return;
    start(async () => {
      const res = await restrictUser({ userId: target.id, type, reason, days: days === "forever" ? null : Number(days), notify });
      if (res.ok) {
        toast.success(res.message ?? "Done.");
        close();
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  return (
    <Modal open={!!target} onClose={close} title={`${copy.title}${target ? ` — ${target.name}` : ""}`}>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ensena-muted">{copy.help}</p>
        <Field label="Reason (shown to the user)">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={textareaClass} />
        </Field>
        {type !== "Warning" && (
          <Field label="Duration">
            <select value={days} onChange={(e) => setDays(e.target.value)} className={inputClass}>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="forever">Until lifted</option>
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 text-sm text-ensena-ink">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-ensena-primary" />
          Email the user about this
        </label>
        <Button onClick={submit} disabled={pending || !reason.trim()} className={type === "Warning" ? primaryButton : dangerButton}>
          {pending ? "Saving…" : copy.button}
        </Button>
      </div>
    </Modal>
  );
}
