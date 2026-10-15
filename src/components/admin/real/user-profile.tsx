"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Mail, MessageSquareOff, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { ageFrom, DetailRows, formatDate, PersonAvatar, SectionCard } from "@/components/admin/real/admin-ui";
import {
  AccountStatusBadge,
  BookingKindBadge,
  BookingStatusBadge,
  ContactUserModal,
  dangerButton,
  Field,
  lagosDateTime,
  naira,
  RestrictUserModal,
  RoleBadge,
  textareaClass,
  type RestrictionType,
} from "@/components/admin/real/people-ui";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { liftRestriction } from "@/lib/actions/admin-people";
import type { AdminRestriction, AdminUserDetail } from "@/lib/admin-people-bookings";
import { tutorStatusLabels } from "@/lib/tutor-application";
import { cn } from "@/lib/utils";

const restrictionLabels: Record<AdminRestriction["type"], string> = { Warning: "Warning", MessagingRestriction: "Messaging restriction", Suspension: "Suspension" };
const restrictionStatusLabels: Record<AdminRestriction["status"], string> = { active: "Active", expired: "Expired", reversed: "Lifted", under_review: "Under appeal" };

export function UserProfile({ user, nowMs }: { user: AdminUserDetail; nowMs: number }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [restrictType, setRestrictType] = useState<RestrictionType | null>(null);
  const [liftOpen, setLiftOpen] = useState(false);
  const [liftReason, setLiftReason] = useState("");
  const [pending, start] = useTransition();
  const age = ageFrom(user.dateOfBirth);
  const target = { id: user.id, name: user.fullName };
  const fullProfileHref = user.role === "student" ? `/admin/students/${user.id}` : user.role === "tutor" ? `/admin/tutors/${user.id}` : null;
  const upcoming = user.bookings.filter((b) => b.status === "Upcoming" || b.status === "Live").length;
  const completed = user.bookings.filter((b) => b.status === "Completed").length;
  const spent = user.bookings.filter((b) => b.paymentStatus === "paid" && b.student?.id === user.id).reduce((s, b) => s + b.amount, 0);

  function lift() {
    if (!user.currentRestriction) return;
    start(async () => {
      const res = await liftRestriction({ restrictionId: user.currentRestriction!.id, userId: user.id, reason: liftReason, notify: true });
      if (res.ok) {
        toast.success(res.message ?? "Restriction lifted.");
        setLiftOpen(false);
        setLiftReason("");
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/users" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Back to users
      </Link>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <PersonAvatar name={user.fullName} url={user.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{user.fullName}</h1>
            <RoleBadge role={user.role} />
            <AccountStatusBadge status={user.status} />
          </div>
          <p className="text-sm text-ensena-muted">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
          <p className="mt-0.5 text-xs text-ensena-muted">Registered {formatDate(user.createdAt)} · Last sign-in {formatDate(user.lastSignInAt, true)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setContactOpen(true)} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
            <Mail className="size-3.5" /> Message
          </button>
          {fullProfileHref && (
            <Link href={fullProfileHref} className="flex h-9 items-center rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
              Full {user.role} profile
            </Link>
          )}
        </div>
      </div>

      {user.currentRestriction && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
          <TriangleAlert className="size-5 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-rose-700">{restrictionLabels[user.currentRestriction.type]} in force{user.currentRestriction.endAt ? ` until ${formatDate(user.currentRestriction.endAt, true)}` : user.currentRestriction.type === "Warning" ? "" : " until lifted"}</p>
            <p className="text-rose-700/80">{user.currentRestriction.reason}</p>
          </div>
          <button type="button" onClick={() => setLiftOpen(true)} className="h-9 rounded-full border border-rose-300 bg-white px-4 text-xs font-semibold text-rose-700 hover:bg-rose-100">Lift restriction</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Account" className="lg:col-span-2">
          <DetailRows
            rows={[
              ["Full name", user.fullName],
              ["Email", user.email],
              ["Email confirmed", user.emailConfirmed ? "Yes" : "Not yet"],
              ["Phone", user.phone],
              ["Date of birth", user.dateOfBirth ? `${formatDate(user.dateOfBirth)}${age !== null ? ` (age ${age})` : ""}` : ""],
              ["Signs in with", user.signInMethods.join(", ")],
              ...(user.tutorStatus ? ([["Tutor application", tutorStatusLabels[user.tutorStatus]]] as [string, string][]) : []),
              ["Registered", formatDate(user.createdAt, true)],
              ["Last active", formatDate(user.lastSeenAt ?? user.lastSignInAt, true)],
            ]}
          />
        </SectionCard>

        <div className="flex flex-col gap-5">
          <SectionCard title="Activity">
            <DetailRows
              rows={[
                ["Bookings", String(user.bookings.length)],
                ["Upcoming", String(upcoming)],
                ["Completed", String(completed)],
                ...(user.role === "student" ? ([["Paid bookings", naira(spent)]] as [string, string][]) : []),
              ]}
            />
          </SectionCard>

          {user.role !== "admin" && (
            <SectionCard title="Moderation">
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setRestrictType("Warning")} className="flex h-9 items-center gap-2 rounded-xl border border-ensena-border px-3 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                  <TriangleAlert className="size-3.5" /> Send warning
                </button>
                <button type="button" onClick={() => setRestrictType("MessagingRestriction")} className="flex h-9 items-center gap-2 rounded-xl border border-ensena-border px-3 text-xs font-semibold text-orange-700 hover:bg-orange-50">
                  <MessageSquareOff className="size-3.5" /> Restrict messaging
                </button>
                <button type="button" onClick={() => setRestrictType("Suspension")} className="flex h-9 items-center gap-2 rounded-xl border border-ensena-border px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                  <Ban className="size-3.5" /> Suspend account
                </button>
                {user.currentRestriction && (
                  <button type="button" onClick={() => setLiftOpen(true)} className="flex h-9 items-center gap-2 rounded-xl border border-ensena-border px-3 text-xs font-semibold text-ensena-success hover:bg-emerald-50">
                    <ShieldCheck className="size-3.5" /> Lift restriction
                  </button>
                )}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {user.guardianChildren.length > 0 && (
        <SectionCard title="Linked children">
          <ul className="divide-y divide-ensena-border">
            {user.guardianChildren.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/admin/users/${c.id}`} className="font-medium text-ensena-ink hover:text-ensena-primary">{c.name}</Link>
                <span className={cn("text-xs font-semibold", c.consentStatus === "confirmed" ? "text-ensena-success" : "text-amber-600")}>{c.consentStatus === "confirmed" ? "Consent confirmed" : "Consent pending"}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title={`Bookings (${user.bookings.length})`}>
        {user.bookings.length === 0 ? (
          <p className="py-4 text-sm text-ensena-muted">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Booking</th>
                  <th className="py-2 pr-4 font-medium">{user.role === "tutor" ? "Student" : "Tutor"}</th>
                  <th className="py-2 pr-4 font-medium">When (WAT)</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {user.bookings.map((b) => {
                  const other = b.tutor?.id === user.id ? b.student : b.tutor;
                  return (
                    <tr key={b.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-ensena-ink hover:text-ensena-primary">{b.reference}</Link>
                        <p className="text-xs text-ensena-muted">{b.title}</p>
                        <BookingKindBadge kind={b.kind} />
                      </td>
                      <td className="py-3 pr-4">{other ? <Link href={`/admin/users/${other.id}`} className="text-ensena-ink hover:text-ensena-primary">{other.name}</Link> : <span className="text-ensena-muted">—</span>}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{lagosDateTime(b.startAt)}</td>
                      <td className="py-3 pr-4 text-ensena-ink">{b.amount > 0 ? naira(b.amount) : "Free"}</td>
                      <td className="py-3 pr-4"><BookingStatusBadge status={b.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Restriction history">
        {user.restrictions.length === 0 ? (
          <p className="py-4 text-sm text-ensena-muted">No warnings or restrictions on this account.</p>
        ) : (
          <ul className="divide-y divide-ensena-border">
            {user.restrictions.map((r) => {
              const expired = r.status === "active" && r.endAt && new Date(r.endAt).getTime() <= nowMs;
              return (
                <li key={r.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ensena-ink">{restrictionLabels[r.type]}</span>
                    <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-semibold text-ensena-muted">{expired ? "Expired" : restrictionStatusLabels[r.status]}</span>
                    <span className="text-xs text-ensena-muted">{formatDate(r.startAt, true)}{r.durationLabel ? ` · ${r.durationLabel}` : ""}</span>
                  </div>
                  <p className="mt-1 text-ensena-muted">{r.reason}</p>
                  {r.resolvedAt && <p className="mt-1 text-xs text-ensena-muted">Lifted {formatDate(r.resolvedAt, true)}{r.resolutionReason ? ` — ${r.resolutionReason}` : ""}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <ContactUserModal target={contactOpen ? target : null} onClose={() => setContactOpen(false)} />
      <RestrictUserModal target={restrictType ? target : null} type={restrictType ?? "Warning"} onClose={() => setRestrictType(null)} />
      <Modal open={liftOpen} onClose={() => setLiftOpen(false)} title="Lift restriction?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">{user.fullName} gets full access back straight away and is emailed about it.</p>
          <Field label="Note (optional)">
            <textarea value={liftReason} onChange={(e) => setLiftReason(e.target.value)} rows={2} className={textareaClass} />
          </Field>
          <Button onClick={lift} disabled={pending} className={cn(dangerButton, "bg-ensena-primary hover:bg-ensena-primary-hover")}>
            {pending ? "Lifting…" : "Lift restriction"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
