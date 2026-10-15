"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Download, Mail, MoreVertical, Search, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/admin/real/admin-ui";
import {
  BookingKindBadge,
  bookingKindLabels,
  BookingStatusBadge,
  ContactUserModal,
  downloadCsv,
  Field,
  inputClass,
  lagosDateTime,
  naira,
  primaryButton,
  textareaClass,
} from "@/components/admin/real/people-ui";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { contactUser } from "@/lib/actions/admin-people";
import type { AdminBookingRow, AdminBookingStatus, BookingKind } from "@/lib/admin-people-bookings";
import { cn } from "@/lib/utils";

const PER_PAGE = 12;
const DAY = 86_400_000;
const statuses: AdminBookingStatus[] = ["Pending", "Upcoming", "Live", "Completed", "Cancelled", "Disputed", "Waitlisted", "No-show"];
type KindTab = "all" | BookingKind;
const dateRanges = {
  all: "All dates",
  today: "Today",
  next7: "Next 7 days",
  past7: "Past 7 days",
  month: "This month",
} as const;

function lagosDay(ms: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(ms);
}

function inRange(b: AdminBookingRow, range: keyof typeof dateRanges, nowMs: number) {
  const start = new Date(b.startAt).getTime();
  if (range === "all") return true;
  if (range === "today") return lagosDay(start) === lagosDay(nowMs);
  if (range === "next7") return start >= nowMs && start <= nowMs + 7 * DAY;
  if (range === "past7") return start <= nowMs && start >= nowMs - 7 * DAY;
  return lagosDay(start).slice(0, 7) === lagosDay(nowMs).slice(0, 7);
}

export function BookingsList({ bookings, nowMs }: { bookings: AdminBookingRow[]; nowMs: number }) {
  const params = useSearchParams();
  const initialStatus = statuses.find((s) => s === params.get("status")) ?? null;
  const [kind, setKind] = useState<KindTab>("all");
  const [status, setStatus] = useState<AdminBookingStatus | "all">(initialStatus ?? "all");
  const [tutor, setTutor] = useState("all");
  const [subject, setSubject] = useState("all");
  const [range, setRange] = useState<keyof typeof dateRanges>("all");
  const [query, setQuery] = useState(() => params.get("query") ?? "");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [contact, setContact] = useState<{ id: string; name: string; bookingId: string } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkWho, setBulkWho] = useState<"students" | "tutors" | "both">("students");
  const [pending, start] = useTransition();

  const tutors = useMemo(() => Array.from(new Map(bookings.flatMap((b) => (b.tutor ? [[b.tutor.id, b.tutor.name] as const] : []))).entries()).sort((a, b) => a[1].localeCompare(b[1])), [bookings]);
  const subjects = useMemo(() => Array.from(new Set(bookings.map((b) => b.subject))).sort(), [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter(
      (b) =>
        (kind === "all" || b.kind === kind) &&
        (status === "all" || b.status === status) &&
        (tutor === "all" || b.tutor?.id === tutor) &&
        (subject === "all" || b.subject === subject) &&
        inRange(b, range, nowMs) &&
        (!q || [b.reference, b.title, b.subject, b.student?.name ?? "", b.student?.email ?? "", b.tutor?.name ?? "", b.tutor?.email ?? ""].some((v) => v.toLowerCase().includes(q)))
    );
  }, [bookings, kind, status, tutor, subject, range, query, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const pageRows = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);
  const count = (s: AdminBookingStatus[]) => bookings.filter((b) => s.includes(b.status)).length;

  const cards: { key: AdminBookingStatus; label: string; value: number; icon: typeof CalendarCheck; tint: string }[] = [
    { key: "Upcoming", label: "Upcoming & live", value: count(["Upcoming", "Live"]), icon: CalendarCheck, tint: "bg-emerald-100 text-emerald-600" },
    { key: "Pending", label: "Pending payment", value: count(["Pending"]), icon: Clock, tint: "bg-orange-100 text-orange-600" },
    { key: "Completed", label: "Completed", value: count(["Completed"]), icon: CheckCircle2, tint: "bg-blue-100 text-blue-600" },
    { key: "Cancelled", label: "Cancelled", value: count(["Cancelled"]), icon: XCircle, tint: "bg-rose-100 text-rose-600" },
    { key: "Disputed", label: "Disputed", value: count(["Disputed"]), icon: AlertTriangle, tint: "bg-purple-100 text-purple-600" },
  ];

  function reset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  function exportCsv() {
    downloadCsv(
      [
        ["Booking ID", "Type", "Class / session", "Student", "Student email", "Tutor", "Tutor email", "Start (WAT)", "Duration (min)", "Amount (NGN)", "Payment", "Status"],
        ...filtered.map((b) => [b.reference, bookingKindLabels[b.kind], b.title, b.student?.name ?? "", b.student?.email ?? "", b.tutor?.name ?? "", b.tutor?.email ?? "", lagosDateTime(b.startAt), b.durationMinutes, b.amount, b.paymentStatus, b.status]),
      ],
      "ensena-bookings.csv"
    );
  }

  function sendBulk() {
    const ids = new Set<string>();
    for (const b of filtered) {
      if (bulkWho !== "tutors" && b.student) ids.add(b.student.id);
      if (bulkWho !== "students" && b.tutor) ids.add(b.tutor.id);
    }
    if (ids.size === 0) return toast.error("Nobody to message in these bookings.");
    start(async () => {
      const results = await Promise.all(Array.from(ids).map((userId) => contactUser({ userId, subject: bulkSubject, body: bulkBody, channel: "in-app" })));
      const failed = results.filter((r) => !r.ok).length;
      if (failed === 0) toast.success(`Message sent to ${ids.size} ${ids.size === 1 ? "person" : "people"}.`);
      else toast.error(`${failed} of ${ids.size} messages failed to send.`);
      if (failed < ids.size) {
        setBulkOpen(false);
        setBulkSubject("");
        setBulkBody("");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Bookings</h1>
          <p className="mt-1 text-sm text-ensena-muted">Every private lesson, group class enrolment and discovery session. Times are West Africa Time.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setBulkOpen(true)} disabled={filtered.length === 0} className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft disabled:opacity-40">
            <Mail className="size-4" /> Message
          </button>
          <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft">
            <Download className="size-4" /> Export
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => reset(setStatus)(status === c.key ? "all" : c.key)}
            className={cn("rounded-2xl border bg-ensena-surface p-4 text-left transition-colors hover:border-ensena-primary/40", status === c.key ? "border-ensena-primary" : "border-ensena-border")}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-full", c.tint)}><c.icon className="size-4" /></span>
            <p className="mt-3 text-xl font-semibold text-ensena-ink">{c.value.toLocaleString()}</p>
            <p className="text-xs text-ensena-muted">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none]">
          {(["all", "private", "group", "discovery"] as KindTab[]).map((k) => (
            <button key={k} type="button" onClick={() => reset(setKind)(k)} className={cn("shrink-0 border-b-2 pb-2.5 pt-1", kind === k ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}>
              {k === "all" ? "All" : bookingKindLabels[k]} ({k === "all" ? bookings.length : bookings.filter((b) => b.kind === k).length})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <input value={query} onChange={(e) => reset(setQuery)(e.target.value)} placeholder="Search booking ID, student, tutor or subject…" className="h-10 w-full rounded-xl border border-ensena-border pl-10 pr-4 text-sm outline-none focus-visible:border-ensena-primary" />
          </div>
          <select value={status} onChange={(e) => reset(setStatus)(e.target.value as typeof status)} className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm">
            <option value="all">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={tutor} onChange={(e) => reset(setTutor)(e.target.value)} className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm">
            <option value="all">All tutors</option>
            {tutors.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={subject} onChange={(e) => reset(setSubject)(e.target.value)} className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm">
            <option value="all">All subjects</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={range} onChange={(e) => reset(setRange)(e.target.value as keyof typeof dateRanges)} className="h-10 rounded-xl border border-ensena-border bg-ensena-surface px-3 text-sm">
            {Object.entries(dateRanges).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="py-2 pr-4 font-medium">Booking ID</th>
                <th className="py-2 pr-4 font-medium">Student</th>
                <th className="py-2 pr-4 font-medium">Tutor</th>
                <th className="py-2 pr-4 font-medium">Class / session</th>
                <th className="py-2 pr-4 font-medium">When (WAT)</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.id} className="border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft/60">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-ensena-ink hover:text-ensena-primary">{b.reference}</Link>
                  </td>
                  <td className="py-3 pr-4">
                    {b.student ? (
                      <Link href={`/admin/users/${b.student.id}`} className="flex items-center gap-2 hover:text-ensena-primary">
                        <PersonAvatar name={b.student.name} url={b.student.avatarUrl} size={28} />
                        <span className="text-ensena-ink">{b.student.name}</span>
                      </Link>
                    ) : <span className="text-ensena-muted">—</span>}
                  </td>
                  <td className="py-3 pr-4">
                    {b.tutor ? (
                      <Link href={`/admin/users/${b.tutor.id}`} className="flex items-center gap-2 hover:text-ensena-primary">
                        <PersonAvatar name={b.tutor.name} url={b.tutor.avatarUrl} size={28} />
                        <span className="text-ensena-ink">{b.tutor.name}</span>
                      </Link>
                    ) : <span className="text-ensena-muted">Unassigned</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-ensena-ink">{b.title}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <BookingKindBadge kind={b.kind} />
                      {b.sessionLabel && <span className="text-[11px] text-ensena-muted">{b.sessionLabel}</span>}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-ensena-muted">{b.kind === "group" ? lagosDateTime(b.startAt, { day: "numeric", month: "short", year: "numeric" }) : lagosDateTime(b.startAt)}</td>
                  <td className="py-3 pr-4 text-ensena-ink">
                    {b.amount > 0 ? naira(b.amount) : "Free"}
                    {b.paymentStatus !== "paid" && b.amount > 0 && <span className="block text-[11px] capitalize text-ensena-muted">{b.paymentStatus.replace("_", " ")}</span>}
                  </td>
                  <td className="py-3 pr-4"><BookingStatusBadge status={b.status} /></td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/bookings/${b.id}`} className="flex h-8 items-center rounded-full border border-ensena-primary px-3 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View</Link>
                      <div className="relative">
                        <button type="button" aria-label="More options" onClick={() => setMenuId((cur) => (cur === b.id ? null : b.id))} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                          <MoreVertical className="size-4" />
                        </button>
                        {menuId === b.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                              <Link href={`/admin/bookings/${b.id}`} className="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">View booking</Link>
                              {b.student && (
                                <button type="button" onClick={() => { setContact({ id: b.student!.id, name: b.student!.name, bookingId: b.id }); setMenuId(null); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Message student</button>
                              )}
                              {b.tutor && (
                                <button type="button" onClick={() => { setContact({ id: b.tutor!.id, name: b.tutor!.name, bookingId: b.id }); setMenuId(null); }} className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Message tutor</button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-ensena-muted">
                    {bookings.length === 0 ? "No bookings yet. They'll appear here as soon as students book." : "No bookings match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > PER_PAGE && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ensena-border pt-4">
            <p className="text-xs text-ensena-muted">Showing {(current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, filtered.length)} of {filtered.length} bookings</p>
            <div className="flex gap-2">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="h-8 rounded-full border border-ensena-border px-3 text-xs disabled:opacity-40">Previous</button>
              <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)} className="h-8 rounded-full border border-ensena-border px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <ContactUserModal target={contact} bookingId={contact?.bookingId} onClose={() => setContact(null)} />

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Message people in these bookings">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Sent as an in-app notification to everyone in the {filtered.length} booking{filtered.length === 1 ? "" : "s"} matching your current filters.</p>
          <Field label="Send to">
            <select value={bulkWho} onChange={(e) => setBulkWho(e.target.value as typeof bulkWho)} className={inputClass}>
              <option value="students">Students</option>
              <option value="tutors">Tutors</option>
              <option value="both">Students and tutors</option>
            </select>
          </Field>
          <Field label="Subject">
            <input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} maxLength={200} className={inputClass} />
          </Field>
          <Field label="Message">
            <textarea value={bulkBody} onChange={(e) => setBulkBody(e.target.value)} rows={4} maxLength={5000} className={textareaClass} />
          </Field>
          <Button onClick={sendBulk} disabled={pending || !bulkSubject.trim() || !bulkBody.trim()} className={primaryButton}>
            {pending ? "Sending…" : "Send"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
