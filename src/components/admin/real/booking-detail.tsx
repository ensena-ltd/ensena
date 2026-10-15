"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Copy, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";

import { DetailRows, PersonAvatar, SectionCard } from "@/components/admin/real/admin-ui";
import {
  BookingKindBadge,
  bookingKindLabels,
  BookingStatusBadge,
  ContactUserModal,
  dangerButton,
  Field,
  inputClass,
  lagosDateTime,
  naira,
  primaryButton,
  textareaClass,
} from "@/components/admin/real/people-ui";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { addBookingNote, adminCancelBooking, adminRescheduleBooking } from "@/lib/actions/admin-people";
import type { AdminBookingDetail, BookingPerson } from "@/lib/admin-people-bookings";

const paymentLabels: Record<AdminBookingDetail["paymentStatus"], string> = { unpaid: "Unpaid", paid: "Paid", refunded: "Refunded", partially_refunded: "Partially refunded" };

function lagosParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function Person({ label, person, onMessage }: { label: string; person: BookingPerson | null; onMessage: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ensena-border p-3">
      {person ? <PersonAvatar name={person.name} url={person.avatarUrl} size={40} /> : <span className="size-10 rounded-full bg-ensena-bg-soft" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ensena-muted">{label}</p>
        {person ? (
          <>
            <Link href={`/admin/users/${person.id}`} className="block truncate font-semibold text-ensena-ink hover:text-ensena-primary">{person.name}</Link>
            <p className="truncate text-xs text-ensena-muted">{person.email}</p>
          </>
        ) : (
          <p className="font-semibold text-ensena-muted">Not assigned</p>
        )}
      </div>
      {person && (
        <button type="button" onClick={onMessage} aria-label={`Message ${person.name}`} className="flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft">
          <Mail className="size-4" />
        </button>
      )}
    </div>
  );
}

export function BookingDetail({ booking, nowMs }: { booking: AdminBookingDetail; nowMs: number }) {
  const [contact, setContact] = useState<{ id: string; name: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const initial = lagosParts(booking.startAt);
  const [newDate, setNewDate] = useState(initial.date);
  const [newTime, setNewTime] = useState(initial.time);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const hoursUntil = (new Date(booking.startAt).getTime() - nowMs) / 3_600_000;
  const lateCancel = booking.kind === "private" && hoursUntil < 24;

  function run(action: () => Promise<{ ok: boolean; message?: string }>, done: () => void) {
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message ?? "Done.");
        done();
      } else toast.error(res.message ?? "Something went wrong.");
    });
  }

  function copyRef() {
    navigator.clipboard?.writeText(booking.reference).then(() => toast.success("Booking ID copied."), () => null);
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/admin/bookings" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ArrowLeft className="size-4" /> Back to bookings
      </Link>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">{booking.title}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ensena-muted">
            <button type="button" onClick={copyRef} className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-ensena-ink hover:text-ensena-primary">
              {booking.reference} <Copy className="size-3" />
            </button>
            <BookingKindBadge kind={booking.kind} />
            {booking.sessionLabel && <span className="text-xs">{booking.sessionLabel}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {booking.canReschedule && (
            <button type="button" onClick={() => setRescheduleOpen(true)} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
              <CalendarClock className="size-3.5" /> Reschedule
            </button>
          )}
          {booking.canCancel && (
            <button type="button" onClick={() => setCancelOpen(true)} className="flex h-9 items-center gap-1.5 rounded-full border border-rose-200 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50">
              <XCircle className="size-3.5" /> Cancel booking
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <SectionCard title="People">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Person label="Student" person={booking.student} onMessage={() => booking.student && setContact({ id: booking.student.id, name: booking.student.name })} />
              <Person label="Tutor" person={booking.tutor} onMessage={() => booking.tutor && setContact({ id: booking.tutor.id, name: booking.tutor.name })} />
            </div>
          </SectionCard>

          <SectionCard title="Session details">
            <DetailRows
              rows={[
                ["Type", bookingKindLabels[booking.kind]],
                ["Subject", booking.subject],
                ["Level", booking.academicLevel ?? ""],
                [booking.kind === "group" ? "Runs" : "Starts (WAT)", booking.kind === "group" ? `${lagosDateTime(booking.startAt, { day: "numeric", month: "short", year: "numeric" })} – ${lagosDateTime(booking.endAt, { day: "numeric", month: "short", year: "numeric" })}` : lagosDateTime(booking.startAt, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })],
                ...(booking.kind !== "group" ? ([["Duration", `${booking.durationMinutes} minutes`]] as [string, string][]) : []),
                ["Mode", booking.mode ?? ""],
                [booking.kind === "group" ? "Plan" : "Frequency", booking.frequency === "oneTime" ? "One-time" : (booking.frequency ?? "")],
                ["Booked", lagosDateTime(booking.createdAt)],
              ]}
            />
            {booking.notes && <p className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-sm text-ensena-ink">{booking.notes}</p>}
          </SectionCard>

          <SectionCard title="Timeline">
            {booking.timeline.length === 0 ? (
              <p className="text-sm text-ensena-muted">No activity recorded yet.</p>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-ensena-border pl-5">
                {booking.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[26px] top-1 size-2.5 rounded-full bg-ensena-primary" />
                    <p className="text-sm font-semibold capitalize text-ensena-ink">{t.label}</p>
                    <p className="text-xs text-ensena-muted">{lagosDateTime(t.at)}{t.actor ? ` · ${t.actor}` : ""}</p>
                    {t.detail && <p className="mt-0.5 text-sm text-ensena-muted">{t.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5">
          <SectionCard title="Payment">
            <DetailRows
              rows={[
                ["Amount", booking.amount > 0 ? naira(booking.amount) : "Free"],
                ["Payment status", paymentLabels[booking.paymentStatus]],
                ...(booking.cancellation
                  ? ([
                      ["Cancellation fee", naira(booking.cancellation.fee)],
                      ["Refund due", naira(booking.cancellation.refundAmount)],
                    ] as [string, string][])
                  : []),
              ]}
            />
            {booking.refunds.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2">
                {booking.refunds.map((r, i) => (
                  <li key={i} className="rounded-xl bg-ensena-bg-soft p-3 text-xs">
                    <p className="font-semibold capitalize text-ensena-ink">Refund {naira(r.amount)} · {r.status}</p>
                    <p className="text-ensena-muted">{lagosDateTime(r.at)}{r.reason ? ` — ${r.reason}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {booking.cancellation && (
            <SectionCard title="Cancellation">
              <p className="text-sm text-ensena-ink">{booking.cancellation.reason || booking.cancellationReason || "No reason given."}</p>
              <p className="mt-1 text-xs text-ensena-muted">{lagosDateTime(booking.cancellation.at)}</p>
            </SectionCard>
          )}

          {booking.kind !== "discovery" && (
            <SectionCard title="Admin notes">
              <p className="text-xs text-ensena-muted">Only visible to Ensena admins.</p>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} placeholder="Add a note…" className={`mt-2 ${textareaClass}`} />
              <Button onClick={() => run(() => addBookingNote({ bookingId: booking.id, note }), () => setNote(""))} disabled={pending || !note.trim()} className={`mt-2 ${primaryButton}`}>
                Save note
              </Button>
              {booking.adminNotes.length > 0 && (
                <ul className="mt-4 flex flex-col gap-3">
                  {booking.adminNotes.map((n, i) => (
                    <li key={i} className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
                      <p className="whitespace-pre-wrap text-ensena-ink">{n.note}</p>
                      <p className="mt-1 text-xs text-ensena-muted">{n.actor ?? "Admin"} · {lagosDateTime(n.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      <ContactUserModal target={contact} bookingId={booking.id} onClose={() => setContact(null)} />

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this booking?">
        <div className="flex flex-col gap-3">
          {booking.kind === "private" && (
            <p className="rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
              {lateCancel
                ? `Less than 24 hours to go, so the standard policy keeps a 50% fee (${naira(Math.round(booking.amount * 50) / 100)}) and refunds the rest.`
                : `More than 24 hours to go, so the full ${naira(booking.amount)} is due back to the student.`}
            </p>
          )}
          <Field label="Reason (shared with the student and tutor)">
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} className={textareaClass} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ensena-ink">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-ensena-primary" />
            Notify the student and tutor
          </label>
          <Button
            onClick={() => run(() => adminCancelBooking({ bookingId: booking.id, reason: cancelReason, notify }), () => { setCancelOpen(false); setCancelReason(""); })}
            disabled={pending || !cancelReason.trim()}
            className={dangerButton}
          >
            {pending ? "Cancelling…" : "Cancel booking"}
          </Button>
        </div>
      </Modal>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule lesson">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-ensena-muted">Pick the new start time in West Africa Time. The tutor&apos;s other lessons are checked for clashes.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Time (WAT)">
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} step={900} className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ensena-ink">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="size-4 accent-ensena-primary" />
            Notify the student and tutor
          </label>
          <Button
            onClick={() => run(() => adminRescheduleBooking({ bookingId: booking.id, newStartISO: `${newDate}T${newTime}:00+01:00`, notify }), () => setRescheduleOpen(false))}
            disabled={pending || !newDate || !newTime}
            className={primaryButton}
          >
            {pending ? "Saving…" : "Reschedule"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
