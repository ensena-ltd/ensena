"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Copy,
  ExternalLink,
  FileSearch,
  Mail,
  MessageSquare,
  Monitor,
  RotateCcw,
  Star,
  Users2,
  Video,
  Wallet,
  X,
} from "lucide-react";

import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { RescheduleLessonModal } from "@/components/shared/manage-lesson/reschedule-lesson-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTutorRating } from "@/hooks/use-reviews";
import { initialAdminStudents, initialAdminTutors } from "@/lib/admin-data";
import {
  bookingStatusStyles,
  formatBookingDisplayId,
  getBookingDisplayStatus,
  initialBookings,
  paymentEscrowStyles,
  type BookingRow,
} from "@/lib/admin-bookings-data";
import { ENSENA_COMMISSION_PCT, splitEarnings } from "@/lib/commission";
import { formatNaira } from "@/lib/format";
import { getPlatformNowMs } from "@/lib/platform-time";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children, className }: { title: string; icon?: typeof Wallet; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink">
        {Icon && <Icon className="size-4 text-ensena-primary" />} {title}
      </h2>
      {children}
    </div>
  );
}

export function BookingFullDetailsClient({ bookingId }: { bookingId: string }) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const booking = bookings.find((b) => b.id === bookingId);
  const sourceTutor = booking ? initialAdminTutors.find((t) => t.name === booking.tutor) : undefined;

  const [nowMs, setNowMs] = useState(() => getPlatformNowMs());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(getPlatformNowMs()), 1000);
    return () => clearInterval(interval);
  }, []);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [studentNoteDraft, setStudentNoteDraft] = useState("");
  const [tutorNoteDraft, setTutorNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [msgStudentOpen, setMsgStudentOpen] = useState(false);
  const [msgTutorOpen, setMsgTutorOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const rating = useTutorRating(sourceTutor?.name ?? "", sourceTutor?.rating ?? 0, sourceTutor?.reviews ?? 0);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  if (!booking) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This booking could not be found.</p>
        <Link href="/admin/bookings" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Bookings</Link>
      </div>
    );
  }

  // TypeScript can't carry the `if (!booking)` narrowing above into these
  // function declarations (hoisting means they could in principle be called
  // before the check runs) — bind a definitely-typed alias once so the
  // closures below don't need repeated non-null assertions.
  const currentBooking = booking;

  // Same re-derivation as the bookings list (admin-bookings-client.tsx) so a
  // booking never shows one status here and a stale, different one there —
  // real event states (Pending/Cancelled/Disputed) pass through unchanged;
  // Upcoming/Live/Completed are re-derived from real Africa/Lagos time.
  const displayStatus = getBookingDisplayStatus(currentBooking, nowMs);

  function updateBooking(patch: Partial<BookingRow>) {
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...patch } : b)));
  }

  function copyId() {
    navigator.clipboard?.writeText(formatBookingDisplayId(currentBooking.id)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function confirmCancel() {
    updateBooking({
      status: "Cancelled",
      paymentStatus: "Refunded",
      refundStatus: "Fully refunded (cancelled by admin)",
      timeline: [...currentBooking.timeline, { label: "Cancelled by admin", time: "Just now", done: true }],
    });
    flash("Booking cancelled and refunded.");
    setCancelOpen(false);
  }
  function resolveDispute() {
    updateBooking({
      status: "Completed",
      timeline: [...currentBooking.timeline, { label: "Dispute resolved by admin", time: "Just now", done: true }],
    });
    flash("Dispute resolved.");
    setResolveOpen(false);
  }
  // Mirrors confirmCancel's own pattern (local updateBooking, same timeline
  // convention) rather than reaching into booking-lifecycle-store.ts — this
  // page's bookings are a separate, disconnected admin-side record from the
  // real PrivateLesson/GroupClassEnrollment those functions operate on (see
  // admin-bookings-data.ts), so Reschedule stays consistent with how Cancel
  // already, deliberately, works on this exact page.
  function confirmReschedule(newDate: string, newTime: string) {
    const nice = new Date(newDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const niceTime = new Date(`2000-01-01T${newTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    updateBooking({
      date: nice,
      time: niceTime,
      timeline: [...currentBooking.timeline, { label: `Rescheduled by admin to ${nice}, ${niceTime}`, time: "Just now", done: true }],
    });
    flash("Booking rescheduled.");
    setRescheduleOpen(false);
  }
  function addStudentNote() {
    if (!studentNoteDraft.trim()) return;
    updateBooking({ studentNotes: [studentNoteDraft.trim(), ...(currentBooking.studentNotes ?? [])] });
    setStudentNoteDraft("");
    flash("Note saved.");
  }
  function addTutorNote() {
    if (!tutorNoteDraft.trim()) return;
    updateBooking({ tutorNotes: [tutorNoteDraft.trim(), ...(currentBooking.tutorNotes ?? [])] });
    setTutorNoteDraft("");
    flash("Note saved.");
  }
  function addTag() {
    if (!tagDraft.trim()) return;
    updateBooking({ tags: [...(currentBooking.tags ?? []), tagDraft.trim()] });
    setTagDraft("");
  }
  function removeTag(tag: string) {
    updateBooking({ tags: (currentBooking.tags ?? []).filter((t) => t !== tag) });
  }

  const split = splitEarnings(booking.amountGross);
  const isGroup = booking.type === "Group Class";
  const sourceStudent = initialAdminStudents.find((s) => s.name === booking.student);
  const displayId = formatBookingDisplayId(booking.id);

  const totalPerStudent = (booking.pricePerSession ?? 0) * (booking.totalSessions ?? 0);
  const groupRevenue = totalPerStudent * (booking.groupEnrolled ?? 0);
  const groupRevenueSplit = splitEarnings(groupRevenue);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link href="/admin/bookings" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
          <ChevronLeft className="size-4" /> Back to Bookings
        </Link>
        <div className="rounded-xl border border-ensena-border bg-ensena-surface px-4 py-2.5">
          <p className="text-[11px] text-ensena-muted">Booking ID</p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="font-mono text-sm font-semibold text-ensena-ink">{displayId}</p>
            <button type="button" onClick={copyId} aria-label="Copy Booking ID" className="text-ensena-muted hover:text-ensena-primary"><Copy className="size-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mt-3 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">Booking {displayId}</h1>
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", bookingStatusStyles[displayStatus])}>
            <span className="size-1.5 rounded-full bg-current" /> {displayStatus}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ensena-primary/10 px-2.5 py-0.5 text-xs font-semibold text-ensena-primary">{isGroup ? "Group Class Booking" : booking.type}</span>
          <span className="rounded-full bg-ensena-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ensena-ink">{isGroup ? booking.topic : booking.subject}</span>
        </div>
        {isGroup && (
          <p className="mt-2 text-sm text-ensena-muted">Tutor: <span className="font-medium text-ensena-ink">{booking.tutor}</span> · {booking.academicLevel} · {booking.subject}</p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Student</p>
            <div className="mt-2 flex items-center gap-3">
              {booking.studentImage ? <span className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={booking.studentImage} alt={booking.student} fill sizes="44px" className="object-cover" /></span> : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{booking.student}</p>
                {booking.studentEmail && <p className="truncate text-xs text-ensena-muted">{booking.studentEmail}</p>}
              </div>
            </div>
            {sourceStudent && (
              <Link href={`/admin/users/usr-${sourceStudent.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Student Profile</Link>
            )}
          </div>
          <div className="rounded-xl border border-ensena-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Tutor</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-full"><Image src={booking.tutorImage} alt={booking.tutor} fill sizes="44px" className="object-cover" /></span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{booking.tutor}</p>
                <p className="text-xs text-ensena-muted">{booking.subject} Tutor</p>
                {sourceTutor && rating.rating > 0 && <p className="flex items-center gap-1 text-xs text-ensena-ink"><Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews} reviews)</p>}
              </div>
            </div>
            {sourceTutor && (
              <Link href={`/admin/users/usr-${sourceTutor.id}`} className="mt-2.5 flex h-8 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Tutor Profile</Link>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Calendar className="size-3" /> Date</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{booking.date}</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Clock className="size-3" /> Time</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{booking.time}</p><p className="text-[11px] text-ensena-muted">({booking.durationMins} minutes)</p></div>
          <div className="rounded-xl bg-ensena-bg-soft p-3"><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Monitor className="size-3" /> Mode</p><p className="mt-0.5 text-sm font-semibold text-ensena-ink">{booking.mode}</p>{booking.platform && <p className="text-[11px] text-ensena-muted">{booking.platform}</p>}</div>
          <div className="rounded-xl bg-ensena-bg-soft p-3">
            <p className="text-[11px] text-ensena-muted">Booking ID</p>
            <div className="mt-0.5 flex items-center gap-1.5"><p className="truncate font-mono text-sm font-semibold text-ensena-ink">{displayId}</p><button type="button" onClick={copyId} aria-label="Copy Booking ID" className="shrink-0 text-ensena-muted hover:text-ensena-primary"><Copy className="size-3.5" /></button></div>
            {copied && <p className="text-[10px] text-ensena-success">Copied!</p>}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Main content */}
        <div className="min-w-0 flex-1 flex flex-col gap-4">
          {!isGroup ? (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <Card title="Session Details">
                    <dl className="mt-2 divide-y divide-ensena-border">
                      <InfoRow label="Type" value={booking.type} />
                      <InfoRow label="Subject" value={booking.subject} />
                      <InfoRow label="Duration" value={`${booking.durationMins} minutes`} />
                      {booking.type === "Private Lesson" && (
                        <>
                          <InfoRow label="Frequency" value={booking.paymentPlan?.cadence ?? "—"} />
                          <InfoRow label="Number of Sessions" value={booking.paymentPlan ? String(booking.paymentPlan.sessionsPaid) : "—"} />
                          <InfoRow label="Current Session" value={booking.currentSessionNumber && booking.paymentPlan ? `${booking.currentSessionNumber} of ${booking.paymentPlan.sessionsPaid}` : "—"} />
                          <InfoRow label="Start Date" value={booking.startDate ?? "—"} />
                          <InfoRow label="End Date" value={booking.endDate ?? "—"} />
                        </>
                      )}
                      <InfoRow label="Location / Mode" value={booking.mode} />
                      {booking.platform && <InfoRow label="Platform" value={booking.platform} />}
                    </dl>
                    {booking.sessionLink && (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2.5 py-2 text-xs">
                        <span className="text-ensena-muted">Session Link</span>
                        <span className="flex items-center gap-1.5 font-mono text-ensena-ink">
                          {booking.sessionLink}
                          <button type="button" onClick={() => { navigator.clipboard?.writeText(booking.sessionLink ?? "").catch(() => {}); flash("Session link copied."); }} className="text-ensena-muted hover:text-ensena-primary"><Copy className="size-3" /></button>
                        </span>
                      </div>
                    )}
                  </Card>

                  {(booking.tags || booking.type === "Private Lesson") && (
                    <Card title="Tags">
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(booking.tags ?? []).map((tag) => (
                          <span key={tag} className="flex items-center gap-1 rounded-full bg-ensena-primary/10 px-2.5 py-1 text-xs font-medium text-ensena-primary">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`} className="text-ensena-primary/70 hover:text-ensena-primary"><X className="size-3" /></button>
                          </span>
                        ))}
                        {(booking.tags ?? []).length === 0 && <span className="text-xs text-ensena-muted">No tags yet.</span>}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} placeholder="Add a tag…" className="h-8 flex-1 rounded-lg border border-ensena-border px-2.5 text-xs" />
                        <button type="button" onClick={addTag} className="rounded-lg bg-ensena-primary px-3 text-xs font-semibold text-white">Add</button>
                      </div>
                    </Card>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <Card title="Payment" icon={Wallet}>
                    <dl className="mt-2 divide-y divide-ensena-border">
                      <InfoRow label="Gross Amount" value={booking.amountGross > 0 ? formatNaira(booking.amountGross) : "Free"} />
                      <InfoRow label={`Enseña Commission (${ENSENA_COMMISSION_PCT}%)`} value={`- ${formatNaira(split.commission)}`} />
                      <InfoRow label="Tutor Earnings" value={formatNaira(split.net)} />
                    </dl>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-ensena-ink">Payment Status</span>
                      <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", paymentEscrowStyles[booking.paymentStatus])}><span className="size-1.5 rounded-full bg-current" /> {booking.paymentStatus}</span>
                    </div>
                    {booking.paymentMethod && <p className="mt-2 text-xs text-ensena-muted">Payment Method: <span className="text-ensena-ink">{booking.paymentMethod}</span></p>}
                    {booking.updatedAt && <p className="text-xs text-ensena-muted">Paid On: <span className="text-ensena-ink">{booking.updatedAt}</span></p>}
                    {booking.transactionId && <p className="text-xs text-ensena-muted">Transaction ID: <span className="font-mono text-ensena-ink">{booking.transactionId}</span></p>}
                    {booking.refundStatus && <p className="mt-2 text-xs text-ensena-muted">{booking.refundStatus}</p>}
                    <Link href={`/admin/payments/${booking.id}`} className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View Payment Details</Link>
                  </Card>

                  <Card title="Related Links">
                    <div className="mt-2 flex flex-col gap-1.5">
                      <Link href={`/admin/classroom-observe/private/${booking.id}`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-ensena-bg-soft">
                        <span className="flex items-center gap-2 text-ensena-ink"><Video className="size-3.5 text-ensena-primary" /> Open Classroom</span>
                        <ExternalLink className="size-3.5 text-ensena-muted" />
                      </Link>
                      <button type="button" onClick={() => setMessagesOpen(true)} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ensena-bg-soft">
                        <span className="flex items-center gap-2 text-ensena-ink"><MessageSquare className="size-3.5 text-ensena-primary" /> View Messages</span>
                        <ExternalLink className="size-3.5 text-ensena-muted" />
                      </button>
                      <Link href={`/admin/bookings/${booking.id}/session-plan`} className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-ensena-bg-soft">
                        <span className="flex items-center gap-2 text-ensena-ink"><FileSearch className="size-3.5 text-ensena-primary" /> View Session Plan</span>
                        <ExternalLink className="size-3.5 text-ensena-muted" />
                      </Link>
                    </div>
                  </Card>
                </div>
              </div>

              {(booking.studentGoal || booking.lessonFocus) && (
                <Card title="Session Overview">
                  <p className="mt-2 text-sm text-ensena-muted">This is a {booking.paymentPlan?.cadence?.toLowerCase() ?? ""} {booking.type.toLowerCase()} to help the student improve in {booking.subject}.</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {booking.studentGoal && <div><p className="flex items-center gap-1 text-[11px] text-ensena-muted"><Users2 className="size-3" /> Student Goal</p><p className="mt-0.5 text-sm font-medium text-ensena-ink">{booking.studentGoal}</p></div>}
                    <div><p className="text-[11px] text-ensena-muted">Academic Level</p><p className="mt-0.5 text-sm font-medium text-ensena-ink">{booking.academicLevel}</p></div>
                    {booking.lessonFocus && <div><p className="text-[11px] text-ensena-muted">Lesson Focus</p><p className="mt-0.5 text-sm font-medium text-ensena-ink">{booking.lessonFocus}</p></div>}
                    {booking.homework && <div><p className="text-[11px] text-ensena-muted">Homework</p><p className="mt-0.5 text-sm font-medium text-ensena-ink">Yes</p></div>}
                    {booking.materialsSharedBy && <div><p className="text-[11px] text-ensena-muted">Materials</p><p className="mt-0.5 text-sm font-medium text-ensena-ink">{booking.materialsSharedBy}</p></div>}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="1. Class Information">
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Class" value={booking.topic} />
                    <InfoRow label="Subject" value={booking.subject} />
                    <InfoRow label="Academic Level" value={booking.academicLevel} />
                    <InfoRow label="Tutor" value={booking.tutor} />
                    <InfoRow label="Class Type" value="Group Class" />
                    <InfoRow label="Mode" value={booking.mode} />
                    <InfoRow label="Class Capacity" value={`${booking.groupMaxStudents ?? "—"} students`} />
                  </dl>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-ensena-muted">Students Enrolled</span>
                    <span className="font-semibold text-ensena-ink">{booking.groupEnrolled}/{booking.groupMaxStudents}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft">
                    <div className="h-full rounded-full bg-ensena-primary" style={{ width: `${booking.groupMaxStudents ? Math.min(100, ((booking.groupEnrolled ?? 0) / booking.groupMaxStudents) * 100) : 0}%` }} />
                  </div>
                </Card>

                <Card title="2. Schedule & Duration" icon={CalendarCheck}>
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <div className="flex justify-between gap-3 py-1.5 text-sm"><dt className="text-ensena-muted">Frequency</dt><dd><span className="rounded-full bg-ensena-primary/10 px-2 py-0.5 text-xs font-semibold text-ensena-primary">{booking.paymentPlan?.cadence ?? "Weekly"}</span></dd></div>
                    <InfoRow label="Class Day" value={booking.classDay ?? "—"} />
                    <InfoRow label="Time" value={booking.time} />
                    <InfoRow label="Lesson Duration" value={`${booking.durationMins} minutes`} />
                    <InfoRow label="Start Date" value={booking.startDate ?? "—"} />
                    <InfoRow label="End Date" value={booking.endDate ?? "—"} />
                    <InfoRow label="Total Sessions" value={booking.totalSessions ? `${booking.totalSessions} sessions` : "—"} />
                  </dl>
                  {booking.classDay && booking.startDate && booking.endDate && (
                    <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs text-blue-700">The class will run every {booking.classDay} from {booking.startDate} to {booking.endDate}.</p>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="3. Pricing Overview">
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Price per student" value={booking.pricePerSession ? `${formatNaira(booking.pricePerSession)} / session` : "—"} />
                    <InfoRow label="Lesson duration" value={`${booking.durationMins} minutes`} />
                    <InfoRow label="Sessions" value={String(booking.totalSessions ?? "—")} />
                  </dl>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-ensena-muted">Total per student</span>
                    <span className="font-heading text-xl font-bold text-ensena-primary">{formatNaira(totalPerStudent)}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-700">{booking.groupEnrolled} students enrolled</p>
                    <p className="mt-1 text-xs text-emerald-700/80">Current class revenue</p>
                    <p className="font-heading text-lg font-bold text-emerald-700">{formatNaira(groupRevenue)}</p>
                  </div>
                </Card>

                <Card title="4. Revenue Breakdown (Class Level)">
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label={`Gross class revenue (${booking.groupEnrolled} students)`} value={formatNaira(groupRevenue)} />
                    <InfoRow label={`Enseña commission (${ENSENA_COMMISSION_PCT}%)`} value={`- ${formatNaira(groupRevenueSplit.commission)}`} />
                  </dl>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm font-semibold text-ensena-ink">Tutor earnings</span>
                    <span className="font-heading text-lg font-bold text-ensena-success">{formatNaira(groupRevenueSplit.net)}</span>
                  </div>
                  <div className="mt-3 rounded-xl bg-ensena-bg-soft p-3 text-xs text-ensena-muted">
                    <p className="font-semibold text-ensena-ink">Pricing Explanation</p>
                    <p className="mt-1">Each student pays:</p>
                    <p className="mt-1 text-ensena-ink">{formatNaira(booking.pricePerSession ?? 0)} per session × {booking.totalSessions} sessions</p>
                    <p className="mt-1 text-ensena-ink">= {formatNaira(totalPerStudent)} total per student</p>
                  </div>
                </Card>
              </div>

              <Card title="5. Students & Payments (Individual Bookings)">
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                        <th className="py-2 pr-4 font-medium">Student</th>
                        <th className="py-2 pr-4 font-medium">Booking ID</th>
                        <th className="py-2 pr-4 font-medium">Payment</th>
                        <th className="py-2 pr-4 font-medium">Amount Paid</th>
                        <th className="py-2 pr-4 font-medium">Status</th>
                        <th className="py-2 font-medium">Paid On</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(booking.groupRoster ?? []).map((r) => (
                        <tr key={r.bookingId} className="border-b border-ensena-border last:border-0">
                          <td className="py-2.5 pr-4 text-ensena-ink">{r.student}</td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-ensena-ink">{formatBookingDisplayId(r.bookingId)}</td>
                          <td className="py-2.5 pr-4 text-ensena-muted">Full class ({booking.totalSessions} sessions)</td>
                          <td className="py-2.5 pr-4 text-ensena-ink">{formatNaira(r.amountPaid)}</td>
                          <td className="py-2.5 pr-4"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{r.status}</span></td>
                          <td className="py-2.5 text-ensena-muted">{r.paidOn}</td>
                        </tr>
                      ))}
                      {(!booking.groupRoster || booking.groupRoster.length === 0) && (
                        <tr><td colSpan={6} className="py-6 text-center text-ensena-muted">No individual bookings recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-ensena-muted">Showing 1 to {booking.groupRoster?.length ?? 0} of {booking.groupRoster?.length ?? 0} students</p>
              </Card>
            </>
          )}

          {/* Dispute */}
          {displayStatus === "Disputed" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
              <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold text-rose-700"><AlertTriangle className="size-4" /> Dispute</h2>
              <dl className="mt-2 divide-y divide-rose-200/60">
                <InfoRow label="Reported by" value={booking.disputeReportedBy ?? "—"} />
                <InfoRow label="Reason" value={booking.disputeReason ?? "—"} />
                <InfoRow label="Submitted" value={booking.disputeSubmittedDate ?? "—"} />
              </dl>
              {booking.disputeMessage && <p className="mt-2 rounded-xl bg-white p-3 text-sm text-ensena-ink">&ldquo;{booking.disputeMessage}&rdquo;</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/admin/lessons/${booking.id}`} />}
                  className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold"
                >
                  <FileSearch className="size-3.5" /> Review Evidence
                </Button>
                <Button variant="outline" onClick={() => setMsgStudentOpen(true)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold"><Mail className="size-3.5" /> Contact Student</Button>
                <Button variant="outline" onClick={() => setMsgTutorOpen(true)} className="h-9 rounded-full border-ensena-border px-4 text-xs font-semibold"><Mail className="size-3.5" /> Contact Tutor</Button>
                <Button onClick={() => setResolveOpen(true)} className="h-9 rounded-full bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700"><CheckCircle2 className="size-3.5" /> Resolve Dispute</Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex w-full flex-col gap-4 lg:w-80 lg:shrink-0">
          <Card title="Admin Actions">
            <div className="mt-2 flex flex-col gap-1.5">
              {(displayStatus === "Upcoming" || displayStatus === "Live") && (
                <>
                  <button type="button" onClick={() => setMsgStudentOpen(true)} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-100"><Mail className="size-3.5" /> Contact Student</button>
                  <button type="button" onClick={() => setMsgTutorOpen(true)} className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-100"><Mail className="size-3.5" /> Contact Tutor</button>
                  {!isGroup && <button type="button" onClick={() => setRescheduleOpen(true)} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs font-semibold text-amber-700 hover:bg-amber-100"><RotateCcw className="size-3.5" /> Reschedule</button>}
                  {isGroup && (
                    <>
                      {booking.groupClassId && (
                        <Link href={`/admin/group-classes/${booking.groupClassId}/review`} className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-left text-xs font-semibold text-violet-700 hover:bg-violet-100"><Users2 className="size-3.5" /> View Group Class</Link>
                      )}
                      {booking.groupClassId && (
                        <Link href={`/admin/classroom-join/${booking.groupClassId}`} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><Video className="size-3.5" /> Open Classroom</Link>
                      )}
                    </>
                  )}
                  <button type="button" onClick={() => setCancelOpen(true)} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-100"><Ban className="size-3.5" /> Cancel Booking</button>
                </>
              )}
              {displayStatus === "Pending" && (
                <button type="button" onClick={() => flash(`Payment reminder sent to ${booking.student}.`)} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-xs font-semibold text-amber-700 hover:bg-amber-100"><Clock className="size-3.5" /> Send Payment Reminder</button>
              )}
              {displayStatus === "Disputed" && (
                <button type="button" onClick={() => setResolveOpen(true)} className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-100"><FileSearch className="size-3.5" /> Review Dispute</button>
              )}
              {(displayStatus === "Completed" || displayStatus === "Cancelled") && (
                <p className="text-xs text-ensena-muted">No further action needed for this booking.</p>
              )}
            </div>
          </Card>

          {isGroup ? (
            <Card title="Enrollment" icon={Users2}>
              <p className="mt-2 text-sm font-semibold text-ensena-ink">{booking.groupEnrolled} / {booking.groupMaxStudents} students</p>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ensena-bg-soft"><div className="h-full rounded-full bg-ensena-success" style={{ width: `${booking.groupMaxStudents ? Math.min(100, ((booking.groupEnrolled ?? 0) / booking.groupMaxStudents) * 100) : 0}%` }} /></div>
              <p className="mt-1 text-xs text-ensena-muted">{Math.max(0, (booking.groupMaxStudents ?? 0) - (booking.groupEnrolled ?? 0))} seats available</p>
              <dl className="mt-2 divide-y divide-ensena-border">
                <InfoRow label="Enrollment opened" value={booking.enrollmentOpens ?? "—"} />
                <InfoRow label="Enrollment closes" value={booking.enrollmentCloses ?? "—"} />
              </dl>
            </Card>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><FileSearch className="size-3 shrink-0" /> Need help with this booking? <Link href={`/admin/support?relatedRecordType=booking&relatedRecordId=${booking.id}&relatedRecordLabel=${encodeURIComponent(`${booking.subject}: ${booking.student} with ${booking.tutor}`)}`} className="font-semibold text-ensena-primary hover:underline">Contact Support</Link></p>
          )}

          {!isGroup && (
            <>
              <Card title="Student Notes">
                <p className="text-xs text-ensena-muted">Add internal note (optional)</p>
                <textarea value={studentNoteDraft} onChange={(e) => setStudentNoteDraft(e.target.value.slice(0, 500))} rows={2} placeholder="Write your note here…" className="mt-2 w-full rounded-xl border border-ensena-border p-2.5 text-sm" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-ensena-muted">{studentNoteDraft.length}/500</span>
                  <button type="button" onClick={addStudentNote} className="rounded-full bg-ensena-primary px-3 py-1 text-xs font-semibold text-white">Save Note</button>
                </div>
                {(booking.studentNotes ?? []).length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">{(booking.studentNotes ?? []).map((n, i) => <li key={i} className="rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">{n}</li>)}</ul>
                )}
              </Card>
              <Card title="Tutor Notes">
                <p className="text-xs text-ensena-muted">Add internal note (optional)</p>
                <textarea value={tutorNoteDraft} onChange={(e) => setTutorNoteDraft(e.target.value.slice(0, 500))} rows={2} placeholder="Write your note here…" className="mt-2 w-full rounded-xl border border-ensena-border p-2.5 text-sm" />
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[11px] text-ensena-muted">{tutorNoteDraft.length}/500</span>
                  <button type="button" onClick={addTutorNote} className="rounded-full bg-ensena-primary px-3 py-1 text-xs font-semibold text-white">Save Note</button>
                </div>
                {(booking.tutorNotes ?? []).length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">{(booking.tutorNotes ?? []).map((n, i) => <li key={i} className="rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">{n}</li>)}</ul>
                )}
              </Card>
            </>
          )}

          <Card title="Booking Summary">
            <dl className="mt-2 divide-y divide-ensena-border">
              <InfoRow label="Booked By" value={booking.bookedBy ?? "Student"} />
              <InfoRow label="Booking Date" value={booking.createdAt} />
              <InfoRow label="Last Updated" value={booking.updatedAt ?? booking.createdAt} />
            </dl>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-ensena-muted">Status</span>
              <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", bookingStatusStyles[displayStatus])}><span className="size-1.5 rounded-full bg-current" /> {displayStatus}</span>
            </div>
          </Card>

          <Card title="Booking Timeline">
            <ul className="mt-3 flex flex-col gap-3">
              {booking.timeline.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={cn("mt-1.5 flex size-3.5 shrink-0 items-center justify-center rounded-full", step.done ? "bg-ensena-success" : "border-2 border-ensena-border bg-ensena-surface")} />
                  <div>
                    <p className={cn("text-sm", step.done ? "font-medium text-ensena-ink" : "text-ensena-muted")}>{step.label}</p>
                    <p className="text-xs text-ensena-muted">{step.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Booking?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This cancels the booking and refunds {booking.student}. This action is logged.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Keep Booking</Button>
            <Button onClick={confirmCancel} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Cancel Booking</Button>
          </div>
        </div>
      </Modal>

      <Modal open={resolveOpen} onClose={() => setResolveOpen(false)} title="Resolve Dispute?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This marks the dispute as resolved and releases the booking back to a completed state.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setResolveOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={resolveDispute} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white"><RotateCcw className="size-4" /> Resolve Dispute</Button>
          </div>
        </div>
      </Modal>

      {/* Contact Student/Tutor — same private admin<->user thread already
          established by admin-classroom-join-client.tsx/admin-classroom-observe-client.tsx/
          group-class-full-details-client.tsx/admin-group-classes-client.tsx,
          reused here rather than inventing a second messaging UI. */}
      <AdminMsgTutorModal open={msgStudentOpen} onClose={() => setMsgStudentOpen(false)} recipientName={booking.student} role="Student" />
      <AdminMsgTutorModal open={msgTutorOpen} onClose={() => setMsgTutorOpen(false)} recipientName={booking.tutor} role="Tutor" />

      {/* "View Messages" — a booking has two counterparties, so this is a
          real chooser into the same two threads Contact Student/Tutor open,
          rather than guessing which one the admin means. */}
      <Modal open={messagesOpen} onClose={() => setMessagesOpen(false)} title="Messages for This Booking">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => { setMessagesOpen(false); setMsgStudentOpen(true); }}
            className="flex items-center gap-2 rounded-xl border border-ensena-border px-3 py-2.5 text-left text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Mail className="size-4 text-ensena-primary" /> Message {booking.student}
          </button>
          <button
            type="button"
            onClick={() => { setMessagesOpen(false); setMsgTutorOpen(true); }}
            className="flex items-center gap-2 rounded-xl border border-ensena-border px-3 py-2.5 text-left text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Mail className="size-4 text-ensena-primary" /> Message {booking.tutor}
          </button>
        </div>
      </Modal>

      {!isGroup && (
        <RescheduleLessonModal
          open={rescheduleOpen}
          currentDate={booking.date}
          currentTime={booking.time}
          onClose={() => setRescheduleOpen(false)}
          onConfirm={confirmReschedule}
        />
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
