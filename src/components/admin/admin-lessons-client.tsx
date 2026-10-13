"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { bookingStatusStyles, formatPaymentPlan, initialBookings, paymentPlanTotal, type BookingRow, type BookingStatus } from "@/lib/admin-bookings-data";
import { formatNaira } from "@/lib/format";
import { lessonConfirmationToBookingRow } from "@/lib/lesson-confirmation-to-booking-row";
import { cn } from "@/lib/utils";

type LessonTypeTab = "Private Lessons" | "Group Lessons";
const typeTabs: LessonTypeTab[] = ["Private Lessons", "Group Lessons"];
const statusTabs: (BookingStatus | "All")[] = ["All", "Upcoming", "Live", "Completed", "Cancelled"];

// Reuses the same booking records that power the Bookings page, but this view
// is angled at session delivery/content (recording, whiteboard, homework,
// attendance, chat) rather than the transactional/escrow angle Bookings covers.
export function AdminLessonsClient() {
  const router = useRouter();
  const [typeTab, setTypeTab] = useState<LessonTypeTab>("Private Lessons");
  const [statusFilter, setStatusFilter] = useState<(typeof statusTabs)[number]>("All");
  const [query, setQuery] = useState("");

  // Real completed lessons only ever exist as LessonConfirmations
  // (escrow-store.ts) — merged in alongside the static seed rows so a real
  // session (Private or Group) actually shows up and links through to its
  // own real evidence, matching the same merge already used for
  // admin-payments-client.tsx and admin-group-classes-client.tsx.
  const { lessons: escrowLessons } = useLessonConfirmations();
  const allBookings: BookingRow[] = [...initialBookings, ...escrowLessons.map(lessonConfirmationToBookingRow)];

  const wantedType = typeTab === "Private Lessons" ? "Private Lesson" : "Group Class";
  const filtered = allBookings.filter((b) => {
    if (b.type !== wantedType) return false;
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (
      q &&
      !b.student.toLowerCase().includes(q) &&
      !b.tutor.toLowerCase().includes(q) &&
      !b.subject.toLowerCase().includes(q) &&
      !b.bookingReference?.toLowerCase().includes(q)
    )
      return false;
    return true;
  });

  function openLesson(id: string, e: React.MouseEvent) {
    const href = `/admin/lessons/${id}`;
    if (e.metaKey || e.ctrlKey) {
      window.open(href, "_blank");
    } else {
      router.push(href);
    }
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Lessons</h1>
        <p className="mt-1 text-sm text-ensena-muted">Every lesson on Ensena: recordings, whiteboards, homework and attendance in one place.</p>
      </div>

      <div className="mt-5 flex gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {typeTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeTab(t)}
            className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", typeTab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", statusFilter === s ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search student, tutor, subject, Lesson ID…"
                className="h-10 w-64 rounded-full border border-ensena-border pl-9 pr-4 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Tutor</th>
                  <th className="py-2 pr-4 font-medium">Subject</th>
                  <th className="py-2 pr-4 font-medium">Date &amp; Time</th>
                  <th className="py-2 pr-4 font-medium">Payment Plan</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    onClick={(e) => openLesson(b.id, e)}
                    className="cursor-pointer border-b border-ensena-border last:border-0 hover:bg-ensena-bg-soft"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="relative size-7 shrink-0 overflow-hidden rounded-full"><Image src={b.studentImage} alt={b.student} fill sizes="28px" className="object-cover" /></div>
                        <span className="text-ensena-ink">{b.student}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-ensena-ink">{b.tutor}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{b.subject}</td>
                    <td className="py-3 pr-4 text-ensena-muted">{b.date}, {b.time}</td>
                    <td className="py-3 pr-4 text-ensena-muted">
                      {b.paymentPlan ? (
                        <>
                          <p>{formatPaymentPlan(b.paymentPlan)}</p>
                          <p className="text-[11px]">
                            {formatNaira(b.paymentPlan.amountPerSession)}/session · {formatNaira(paymentPlanTotal(b.paymentPlan))} paid
                          </p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4"><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", bookingStatusStyles[b.status])}>{b.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No lessons match this filter.</p>}
          </div>
      </div>
    </div>
  );
}
