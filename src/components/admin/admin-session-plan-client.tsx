"use client";

import Link from "next/link";
import { ChevronLeft, FileSearch } from "lucide-react";

import type { BookingRow } from "@/lib/admin-bookings-data";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

// Reuses booking-full-details-client.tsx's own Card/InfoRow visual pattern
// (same borders, spacing, typography) rather than inventing a new layout —
// this page is the dedicated, focused view of the exact same
// studentGoal/lessonFocus/homework/materials fields that page's "Session
// Overview" card already shows inline when present.
export function AdminSessionPlanClient({ booking }: { booking: BookingRow }) {
  const hasPlan = Boolean(booking.studentGoal || booking.lessonFocus || booking.homework || booking.materialsSharedBy);

  return (
    <div>
      <Link href={`/admin/bookings/${booking.id}`} className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Booking
      </Link>

      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">Session Plan</h1>
        <p className="mt-1 text-sm text-ensena-muted">{booking.subject} · {booking.student} with {booking.tutor}</p>

        <div className="mt-5 rounded-2xl border border-ensena-border p-4">
          <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
            <FileSearch className="size-4 text-ensena-primary" /> Session Details
          </h2>
          <dl className="mt-2 divide-y divide-ensena-border">
            <InfoRow label="Subject" value={booking.subject} />
            <InfoRow label="Academic Level" value={booking.academicLevel || "—"} />
            <InfoRow label="Topic" value={booking.topic || "—"} />
            <InfoRow label="Date & Time" value={`${booking.date}, ${booking.time}`} />
          </dl>
        </div>

        {hasPlan ? (
          <div className="mt-4 rounded-2xl border border-ensena-border p-4">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Plan for This Session</h2>
            <dl className="mt-2 divide-y divide-ensena-border">
              {booking.studentGoal && <InfoRow label="Student Goal" value={booking.studentGoal} />}
              {booking.lessonFocus && <InfoRow label="Lesson Focus" value={booking.lessonFocus} />}
              {booking.homework && <InfoRow label="Homework" value={booking.homework} />}
              {booking.materialsSharedBy && <InfoRow label="Materials Shared By" value={booking.materialsSharedBy} />}
            </dl>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ensena-border p-10 text-center">
            <FileSearch className="size-5 text-ensena-muted" />
            <p className="text-sm font-semibold text-ensena-ink">No session plan recorded</p>
            <p className="max-w-md text-xs text-ensena-muted">Neither the tutor nor the student has added a goal, focus area, or materials for this session yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
