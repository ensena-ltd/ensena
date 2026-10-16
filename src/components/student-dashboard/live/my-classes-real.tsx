"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, CreditCard, FileText, MessageSquare, MoreVertical, RefreshCcw, Star, Video, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { entryOpensHint } from "@/components/shared/lessons/entry-countdown";
import { CancelLessonModal } from "@/components/shared/manage-lesson/cancel-lesson-modal";
import { ManageLessonSheet } from "@/components/shared/manage-lesson/manage-lesson-sheet";
import { cancelUnpaidBooking, startBookingCheckout } from "@/lib/actions/student-booking";
import { cancelPrivateLesson, confirmLessonCompleted } from "@/lib/actions/student-learning";
import { MIN_NOTICE_MINUTES } from "@/lib/booking-slots";
import { computeCancellationPolicy } from "@/lib/cancellation-policy";
import { canEnterClassroom, getClassEntryState, STUDENT_ENTRY_WINDOW_MS } from "@/lib/class-entry-access";
import { formatNaira } from "@/lib/format";
import type { ManageLessonAction } from "@/lib/manage-lesson-types";
import type { CompletedLesson, LearningSession, StudentLearningSnapshot } from "@/lib/student-learning-server";
import { cn } from "@/lib/utils";

import {
  addDaysISO,
  buildActiveArrangements,
  formatLongDate,
  formatShortDate,
  formatTime,
  formatTimeRange,
  isAwaitingCompletion,
  isUpcoming,
  kindBadge,
  kindDot,
  kindLabel,
  needsPayment,
  platformISODate,
  relativeDay,
  tasksDueBetween,
  tasksDueOn,
} from "./learning-utils";
import { AddTaskForm, PersonAvatar, ReviewModal, TaskCheckboxList, useLiveNow, useStudyTasks } from "./live-shared";
import { MyClassesMobile, mobileDateLabel, mobileTabs, type MobileClassItem, type MobileClassKind, type MobileTab } from "./my-classes-mobile";
import { RescheduleModal } from "./reschedule-modal";

const tabs = ["Upcoming", "Active", "Completed", "Cancelled", "Study Planner"] as const;
type Tab = (typeof tabs)[number];
const sectionId = (tab: Tab) => `myclasses-${tab.toLowerCase().replace(" ", "-")}`;

const UPCOMING_PREVIEW = 3;
const COMPLETED_PREVIEW = 3;
const ACTIVE_PREVIEW = 3;

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-ensena-border p-8 text-center text-sm text-ensena-muted">{children}</div>;
}

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
      {label} <ChevronRight className="size-3.5" />
    </Link>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-heading text-lg font-semibold text-ensena-ink">{title}</h2>
      {action}
    </div>
  );
}

function completionBadge(c: CompletedLesson, nowMs: number): { label: string; tint: string } {
  if (c.confirmationStatus === "Disputed") return { label: "Under Review", tint: "bg-rose-100 text-rose-700" };
  if (c.confirmationStatus === "Pending") {
    if (c.bookingType === "private") return { label: "Awaiting Confirmation", tint: "bg-amber-100 text-amber-700" };
    return (c.autoReleaseAtMs ?? 0) > nowMs ? { label: "Completed", tint: "bg-emerald-100 text-emerald-700" } : { label: "Cleared", tint: "bg-emerald-100 text-emerald-700" };
  }
  return { label: c.confirmationStatus === "Confirmed" ? "Confirmed" : "Completed", tint: "bg-emerald-100 text-emerald-700" };
}

export function MyClassesReal({ data }: { data: StudentLearningSnapshot }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nowMs = useLiveNow(data.generatedAtMs);
  const { tasks, toggle, add, remove } = useStudyTasks(data.studyTasks);
  const [activeTab, setActiveTab] = useState<Tab>("Upcoming");
  const [mobileTab, setMobileTab] = useState<MobileTab>("Upcoming");
  const [manageId, setManageId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<CompletedLesson | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function scrollToTab(tab: Tab) {
    setActiveTab(tab);
    document.getElementById(sectionId(tab))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Deep links: ?tab=Completed (dashboard stat cards / review banner) and
  // ?view=<session id> (dashboard "View Class").
  useEffect(() => {
    const match = tabs.find((t) => t === searchParams.get("tab"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing UI from the URL on navigation; also scrolls
    if (match) scrollToTab(match);
    const mobileMatch = mobileTabs.find((t) => t === searchParams.get("tab"));
    if (mobileMatch) setMobileTab(mobileMatch);
    const view = searchParams.get("view");
    if (view) setDetailsId(view);
  }, [searchParams]);

  const sessions = data.sessions;
  const upcoming = sessions.filter((s) => isUpcoming(s, nowMs));
  const active = buildActiveArrangements(sessions, nowMs);
  const awaiting = sessions.filter((s) => isAwaitingCompletion(s, nowMs)).sort((a, b) => b.startMs - a.startMs);
  // A cancelled group enrollment cancels each remaining session — show it once.
  const cancelled = sessions
    .filter((s) => s.status === "cancelled")
    .filter((s, i, all) => s.kind !== "group" || all.findIndex((o) => o.kind === "group" && o.seriesId === s.seriesId && o.status === "cancelled") === i)
    .sort((a, b) => (b.cancelledAtMs ?? b.startMs) - (a.cancelledAtMs ?? a.startMs));

  const todayISO = platformISODate(nowMs);
  const railDay = selectedDay ?? todayISO;
  const railSessions = sessions.filter((s) => s.status !== "cancelled" && platformISODate(s.startMs) === railDay);
  const railTasks = tasksDueOn(tasks, railDay);
  const sessionDays = new Set(sessions.filter((s) => s.status !== "cancelled").map((s) => platformISODate(s.startMs)));

  const manageSession = sessions.find((s) => s.id === manageId) ?? null;
  const detailsSession = sessions.find((s) => s.id === detailsId) ?? null;
  const detailsCompleted = !detailsSession ? data.completed.find((c) => c.id === detailsId) ?? null : null;
  const cancelingSession = sessions.find((s) => s.id === cancelingId) ?? null;
  const cancelPreview = cancelingSession
    ? computeCancellationPolicy({ amount: cancelingSession.paymentStatus === "paid" ? cancelingSession.price : 0, startMs: cancelingSession.startMs, nowMs, cancelledBy: "Student" })
    : null;

  function isUnpaid(s: LearningSession) {
    return s.kind === "private" && s.status === "scheduled" && s.paymentStatus === "unpaid";
  }

  function canCancel(s: LearningSession) {
    return s.kind === "private" && s.status === "scheduled" && s.startMs > nowMs && !isUnpaid(s);
  }

  function canReschedule(s: LearningSession) {
    return canCancel(s) && s.startMs > nowMs + MIN_NOTICE_MINUTES * 60_000;
  }

  // Unpaid bookings: pay (Paystack) or let the slot go.
  function pay(s: LearningSession) {
    if (!s.seriesId) return;
    setPayingId(s.id);
    startTransition(async () => {
      const result = await startBookingCheckout(s.seriesId!);
      if (!result.ok || !result.url) {
        setPayingId(null);
        toast.error(result.message ?? "Couldn't start the payment.");
        router.refresh();
        return;
      }
      window.location.assign(result.url);
    });
  }

  function release(s: LearningSession) {
    if (!s.seriesId) return;
    startTransition(async () => {
      const result = await cancelUnpaidBooking(s.seriesId!);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't cancel this booking.");
        return;
      }
      toast.success("Booking cancelled. You weren't charged.");
      router.refresh();
    });
  }

  function entryHint(s: LearningSession): ReactNode {
    if (needsPayment(s)) return "Payment required to join this session";
    const state = getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs });
    if (state === "too-early") return entryOpensHint(s.startMs - STUDENT_ENTRY_WINDOW_MS, nowMs, s.kind === "private" || s.kind === "group" ? "Classroom" : "Session");
    return undefined;
  }

  function canEnter(s: LearningSession) {
    return !needsPayment(s) && canEnterClassroom(getClassEntryState({ startMs: s.startMs, endMs: s.endMs, role: "student", nowMs }));
  }

  function manageActions(s: LearningSession): ManageLessonAction[] {
    const actions: ManageLessonAction[] = [];
    if (isUnpaid(s)) {
      actions.push({ key: "pay", label: "Complete payment", icon: CreditCard, variant: "primary", onClick: () => { setManageId(null); pay(s); } });
    } else if (s.classroomHref && isUpcoming(s, nowMs)) {
      actions.push({ key: "join", label: "Join classroom", icon: Video, variant: "primary", disabled: !canEnter(s), onClick: () => router.push(s.classroomHref!) });
    }
    actions.push({ key: "details", label: "View details", icon: FileText, onClick: () => { setManageId(null); setDetailsId(s.id); } });
    if (s.personId) {
      actions.push({ key: "message", label: `Message ${s.personName.split(" ")[0]}`, icon: MessageSquare, onClick: () => { setManageId(null); router.push(`/student-dashboard/messages?tutor=${s.personId}`); } });
    }
    actions.push({ key: "planner", label: "Add a study task for this class", icon: Calendar, onClick: () => { setManageId(null); scrollToTab("Study Planner"); } });
    if (canReschedule(s)) {
      actions.push({ key: "reschedule", label: "Reschedule lesson", icon: RefreshCcw, onClick: () => { setManageId(null); setReschedulingId(s.id); } });
    }
    if (isUnpaid(s)) {
      actions.push({ key: "release", label: (s.totalSessions ?? 1) > 1 ? "Cancel this unpaid booking (all sessions)" : "Cancel this unpaid booking", icon: XCircle, variant: "danger", onClick: () => { setManageId(null); release(s); } });
    }
    if (canCancel(s)) {
      actions.push({ key: "cancel", label: "Cancel booking", icon: XCircle, variant: "danger", onClick: () => { setManageId(null); setCancelingId(s.id); } });
    }
    return actions;
  }

  function cancel(reason: string, notes?: string) {
    if (!cancelingSession) return;
    const s = cancelingSession;
    startTransition(async () => {
      const result = await cancelPrivateLesson(s.id, reason, notes);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't cancel this lesson.");
        return;
      }
      toast.success(`Your ${s.title} lesson on ${formatShortDate(s.startMs)} was cancelled. ${s.personName} has been notified.`);
      setCancelingId(null);
      router.refresh();
    });
  }

  function confirm(c: CompletedLesson) {
    setConfirmingId(c.id);
    startTransition(async () => {
      const result = await confirmLessonCompleted(c.id);
      setConfirmingId(null);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't confirm this lesson.");
        return;
      }
      toast.success(`Thanks! Payment has been released to ${c.tutorName}.`);
      router.refresh();
    });
  }

  // Completed preview: newest first, lessons waiting on you first.
  const completedTotal = data.completed.length + awaiting.length;
  const completedPreview = [...data.completed]
    .sort((a, b) => Number(b.confirmationStatus === "Pending") - Number(a.confirmationStatus === "Pending") || b.completedAtMs - a.completedAtMs)
    .slice(0, COMPLETED_PREVIEW);
  const completedPreviewAwaiting = awaiting.slice(0, Math.max(0, COMPLETED_PREVIEW - completedPreview.length));

  const weekEnd = addDaysISO(todayISO, 6);
  const overdue = tasks.filter((t) => !t.done && t.dueDate !== null && t.dueDate < todayISO);
  const thisWeek = tasksDueBetween(tasks, todayISO, weekEnd);

  // ── Mobile cards (MyClassesMobile) — same sessions and actions as the
  // desktop sections, shaped for the mobile card design.
  const mobileKind: Record<LearningSession["kind"], MobileClassKind> = { private: "Private Class", group: "Group Class", discovery: "Discovery Session", counselling: "Counselling" };
  const statusTint = { green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700", rose: "bg-rose-100 text-rose-700", grey: "bg-ensena-bg-soft text-ensena-muted" };

  const mobileUpcoming: MobileClassItem[] = upcoming.map((s) => {
    const unpaid = isUnpaid(s);
    const live = s.startMs <= nowMs;
    return {
      id: s.id,
      kind: mobileKind[s.kind],
      subject: s.title,
      participant: s.personName,
      avatarSrc: s.personImage,
      dateLabel: mobileDateLabel(s.startMs, nowMs),
      timeLabel: `${formatTime(s.startMs)} (${s.durationMinutes} min)`,
      statusLabel: unpaid ? "Awaiting Payment" : live ? "Live Now" : "Upcoming",
      statusTint: unpaid ? statusTint.amber : statusTint.green,
      sortMs: s.startMs,
      onDetails: () => setDetailsId(s.id),
      noteText: unpaid ? `Pay ${formatNaira(s.price)} to keep this booking.` : undefined,
      joinHref: s.classroomHref ?? undefined,
      joinDisabledHint: canEnter(s) ? undefined : entryHint(s) ?? "Not open yet",
      primaryAction: unpaid ? { label: "Pay now", onClick: () => pay(s), loading: payingId === s.id } : undefined,
    };
  });

  const mobileCompleted: MobileClassItem[] = [
    ...awaiting.map((s): MobileClassItem => ({
      id: s.id,
      kind: mobileKind[s.kind],
      subject: s.title,
      participant: s.personName,
      avatarSrc: s.personImage,
      dateLabel: mobileDateLabel(s.startMs, nowMs),
      timeLabel: formatTime(s.startMs),
      statusLabel: "Awaiting Tutor",
      statusTint: statusTint.grey,
      sortMs: s.startMs,
      onDetails: () => setDetailsId(s.id),
    })),
    ...data.completed.map((c): MobileClassItem => {
      const badge = completionBadge(c, nowMs);
      const needsConfirm = c.confirmationStatus === "Pending" && c.bookingType === "private";
      return {
        id: c.id,
        kind: c.bookingType === "private" ? "Private Class" : "Group Class",
        subject: c.subject,
        participant: c.tutorName,
        avatarSrc: c.tutorImage,
        dateLabel: mobileDateLabel(c.completedAtMs, nowMs),
        timeLabel: formatTime(c.completedAtMs),
        statusLabel: badge.label,
        statusTint: badge.tint,
        sortMs: c.completedAtMs,
        onDetails: () => setDetailsId(c.id),
        noteText: c.review ? `You rated ${c.review.rating}/5` : undefined,
        primaryAction: needsConfirm
          ? { label: "Confirm Lesson", onClick: () => confirm(c), loading: confirmingId === c.id }
          : c.reviewable && !c.review
            ? { label: "Leave Review", onClick: () => setReviewing(c) }
            : undefined,
      };
    }),
  ];

  const mobileCancelled: MobileClassItem[] = cancelled.map((s) => ({
    id: s.id,
    kind: mobileKind[s.kind],
    subject: s.title,
    participant: s.personName,
    avatarSrc: s.personImage,
    dateLabel: mobileDateLabel(s.startMs, nowMs),
    timeLabel: formatTime(s.startMs),
    statusLabel: "Cancelled",
    statusTint: statusTint.rose,
    sortMs: s.startMs,
    onDetails: () => setDetailsId(s.id),
    noteText: [s.cancellationReason, (s.refundAmount ?? 0) > 0 ? `Refund ${formatNaira(s.refundAmount!)}` : null].filter(Boolean).join(" · ") || undefined,
  }));

  return (
    <div>
      <MyClassesMobile upcoming={mobileUpcoming} completed={mobileCompleted} cancelled={mobileCancelled} tab={mobileTab} onTabChange={setMobileTab} />

      <div className="hidden lg:block">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">All your classes, sessions and learning activities in one place.</p>
      </div>

      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => scrollToTab(tab)}
            className={cn("shrink-0 border-b-2 pb-2.5 pt-1 transition-colors", activeTab === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {/* Upcoming */}
          <section id={sectionId("Upcoming")} className="scroll-mt-6">
            <SectionHeader title="Upcoming" action={<ViewAllLink href="/student-dashboard/lessons/upcoming" label="View all upcoming" />} />
            {upcoming.length === 0 ? (
              <div className="mt-4">
                <EmptyState>
                  Nothing scheduled yet.{" "}
                  <Link href="/student-dashboard/find-a-tutor" className="font-semibold text-ensena-primary hover:underline">Book a lesson</Link> or{" "}
                  <Link href="/student-dashboard/group-classes" className="font-semibold text-ensena-primary hover:underline">join a group class</Link>.
                </EmptyState>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.slice(0, UPCOMING_PREVIEW).map((s) => {
                  const hint = entryHint(s);
                  const enter = canEnter(s);
                  return (
                    <article key={s.id} className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                      <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", kindBadge[s.kind])}>{kindLabel[s.kind]}</span>
                      <div>
                        <h3 className="font-heading text-base font-semibold text-ensena-ink">{s.title}</h3>
                        <p className="text-sm text-ensena-muted">with {s.personName}</p>
                      </div>
                      <div className="flex flex-col gap-1 text-xs text-ensena-muted">
                        <span>{relativeDay(s.startMs, nowMs)} · {formatTime(s.startMs)}</span>
                        <span>
                          {s.durationMinutes} min · {s.mode}
                          {s.sessionNumber && s.totalSessions ? ` · Session ${s.sessionNumber} of ${s.totalSessions}` : ""}
                        </span>
                      </div>
                      {isUnpaid(s) ? (
                        <p className="text-xs font-medium text-amber-700">Awaiting payment · {formatNaira(s.price)}</p>
                      ) : (
                        !enter && hint && <p className="text-xs font-medium text-ensena-primary">{hint}</p>
                      )}
                      <div className="mt-auto flex items-center gap-2 pt-1">
                        <PersonAvatar name={s.personName} image={s.personImage} className="size-9" />
                        {isUnpaid(s) ? (
                          <Button onClick={() => pay(s)} loading={payingId === s.id} className="h-9 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white">
                            <CreditCard className="size-4" /> Pay now
                          </Button>
                        ) : s.classroomHref ? (
                          <Button
                            variant="outline"
                            nativeButton={false}
                            disabled={!enter}
                            render={<Link href={s.classroomHref} />}
                            className="h-9 flex-1 rounded-full border-ensena-primary text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
                          >
                            Enter Classroom
                          </Button>
                        ) : (
                          <span className="flex-1" />
                        )}
                        <button type="button" aria-label="More options" onClick={() => setManageId(s.id)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Active */}
          <section id={sectionId("Active")} className="mt-8 scroll-mt-6">
            <SectionHeader title="Active Classes" action={<ViewAllLink href="/student-dashboard/lessons/active" label="View all active" />} />
            <div className="mt-4 flex flex-col gap-3">
              {active.length === 0 ? (
                <EmptyState>No active classes right now.</EmptyState>
              ) : (
                active.slice(0, ACTIVE_PREVIEW).map((a) => (
                  <div key={a.key} className="flex flex-wrap items-center gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                    <PersonAvatar name={a.personName} image={a.personImage} className="size-12" />
                    <div className="min-w-[180px] flex-1">
                      <p className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
                        {a.title}
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", kindBadge[a.kind])}>{a.kind === "private" ? "Private" : "Group Class"}</span>
                      </p>
                      <p className="text-xs text-ensena-muted">with {a.personName}</p>
                      <p className="mt-0.5 text-xs text-ensena-muted">{a.scheduleLine}</p>
                      {a.extraLine && <p className="text-xs text-ensena-muted">{a.extraLine}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-ensena-muted">{a.kind === "private" ? "Next lesson" : "Next class"}</p>
                        <p className="text-sm font-semibold text-ensena-ink">{formatLongDate(a.next.startMs)} · {formatTime(a.next.startMs)}</p>
                      </div>
                      <Button variant="outline" onClick={() => setDetailsId(a.next.id)} className="h-9 shrink-0 rounded-full border-ensena-primary px-4 text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5">
                        View Class
                      </Button>
                      <button type="button" aria-label="More options" onClick={() => setManageId(a.next.id)} className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Completed */}
          <section id={sectionId("Completed")} className="mt-8 scroll-mt-6">
            <SectionHeader title="Completed" action={<ViewAllLink href="/student-dashboard/lessons/completed" label="View all completed" />} />
            {data.completed.length === 0 && awaiting.length === 0 ? (
              <div className="mt-4">
                <EmptyState>No completed classes yet.</EmptyState>
              </div>
            ) : (
              <div className="mt-4 flex flex-col divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
                {completedPreviewAwaiting.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-4 p-4">
                    <PersonAvatar name={s.personName} image={s.personImage} className="size-11" />
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{s.title}</p>
                      <p className="text-xs text-ensena-muted">with {s.personName} · {kindLabel[s.kind]}</p>
                    </div>
                    <p className="text-xs text-ensena-muted">{formatShortDate(s.startMs)} · {formatTime(s.startMs)}</p>
                    <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-semibold text-ensena-muted">Awaiting tutor</span>
                    <Button variant="outline" onClick={() => setDetailsId(s.id)} className="h-9 rounded-full border-ensena-border px-3.5 text-sm font-medium">
                      View Details
                    </Button>
                  </div>
                ))}
                {completedPreview.map((c) => {
                  const badge = completionBadge(c, nowMs);
                  return (
                    <div key={c.id} className="flex flex-wrap items-center gap-4 p-4">
                      <PersonAvatar name={c.tutorName} image={c.tutorImage} className="size-11" />
                      <div className="min-w-[160px] flex-1">
                        <p className="text-sm font-semibold text-ensena-ink">{c.subject}</p>
                        <p className="text-xs text-ensena-muted">with {c.tutorName} · {c.bookingType === "private" ? "Private Lesson" : "Group Class"}</p>
                        {c.review && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ensena-muted">
                            <Star className="size-3 fill-amber-400 text-amber-400" /> You rated {c.review.rating}/5
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-ensena-muted">{formatShortDate(c.completedAtMs)} · {formatTime(c.completedAtMs)}</p>
                      <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", badge.tint)}>{badge.label}</span>
                      <div className="flex items-center gap-1.5">
                        {c.confirmationStatus === "Pending" && c.bookingType === "private" ? (
                          <Button onClick={() => confirm(c)} loading={confirmingId === c.id} className="h-9 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white">
                            Confirm Lesson
                          </Button>
                        ) : c.reviewable && !c.review ? (
                          <Button onClick={() => setReviewing(c)} className="h-9 rounded-full bg-amber-500 px-4 text-sm font-semibold text-white hover:bg-amber-600">
                            <Star className="size-3.5" /> Leave Review
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => setDetailsId(c.id)} className="h-9 rounded-full border-ensena-border px-3.5 text-sm font-medium">
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {completedTotal > 0 && (
              <p className="mt-3 text-center text-sm text-ensena-muted">
                Showing {completedPreview.length + completedPreviewAwaiting.length} of {completedTotal} completed {completedTotal === 1 ? "class" : "classes"}
              </p>
            )}
          </section>

          {/* Cancelled */}
          <section id={sectionId("Cancelled")} className="mt-8 scroll-mt-6">
            <SectionHeader title="Cancelled" />
            <div className="mt-4 flex flex-col gap-3">
              {cancelled.length === 0 ? (
                <EmptyState>You don&apos;t have any cancelled classes.</EmptyState>
              ) : (
                cancelled.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                    <PersonAvatar name={s.personName} image={s.personImage} className="size-11" grayscale />
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-semibold text-ensena-ink">{s.title}</p>
                      <p className="text-xs text-ensena-muted">with {s.personName} · {formatLongDate(s.startMs)} · {formatTime(s.startMs)}</p>
                      {(s.cancellationReason || (s.refundAmount ?? 0) > 0) && (
                        <p className="mt-0.5 text-xs text-ensena-muted">
                          {s.cancellationReason}
                          {(s.refundAmount ?? 0) > 0 && <> · Refund {formatNaira(s.refundAmount!)}</>}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Cancelled</span>
                    <Button variant="outline" onClick={() => setDetailsId(s.id)} className="h-9 rounded-full border-ensena-border px-3.5 text-sm font-medium">
                      View Details
                    </Button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Study Planner */}
          <section id={sectionId("Study Planner")} className="mt-8 scroll-mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <SectionHeader
              title="Study Planner"
              action={
                <Link href="/student-dashboard/study-planner" className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
                  View full planner <ChevronRight className="size-3.5" />
                </Link>
              }
            />
            {overdue.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Overdue</p>
                <div className="mt-2">
                  <TaskCheckboxList tasks={overdue} onToggle={toggle} onRemove={remove} empty="" />
                </div>
              </div>
            )}
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Today</p>
                <div className="mt-2">
                  <TaskCheckboxList tasks={tasksDueOn(tasks, todayISO)} onToggle={toggle} onRemove={remove} empty="Nothing planned for today." />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">This Week</p>
                <div className="mt-2">
                  <TaskCheckboxList tasks={thisWeek} onToggle={toggle} onRemove={remove} empty="Nothing planned for the rest of the week." />
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-ensena-border pt-4">
              <AddTaskForm onAdd={add} defaultDue={todayISO} showDate />
            </div>
          </section>
        </div>

        <div className="hidden w-80 shrink-0 flex-col gap-5 lg:flex">
          <MiniCalendar todayISO={todayISO} selected={railDay} markedDays={sessionDays} onSelect={(iso) => setSelectedDay(iso === todayISO ? null : iso)} />

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">{railDay === todayISO ? "Today's Classes" : formatLongDate(Date.parse(`${railDay}T12:00:00Z`))}</h2>
              <span className="text-xs text-ensena-muted">
                {railSessions.length} {railSessions.length === 1 ? "class" : "classes"}
              </span>
            </div>
            {railSessions.length === 0 && railTasks.length === 0 ? (
              <p className="mt-3 text-sm text-ensena-muted">No classes{railDay === todayISO ? " today" : " on this day"}.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {railSessions.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setDetailsId(s.id)} className="flex w-full items-start gap-2.5 text-left">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", kindDot[s.kind])} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ensena-ink">{s.title}</span>
                        <span className="block text-xs text-ensena-muted">{s.personName} · {kindLabel[s.kind]}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-ensena-muted">{formatTime(s.startMs)}</span>
                    </button>
                  </li>
                ))}
                {railTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-muted" />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm font-medium", t.done ? "text-ensena-muted line-through" : "text-ensena-ink")}>{t.label}</span>
                      <span className="block text-xs text-ensena-muted">Study task</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => scrollToTab("Upcoming")} className="mt-3 flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
              View full schedule <ChevronRight className="size-3.5" />
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Today</p>
            <div className="mt-2">
              <TaskCheckboxList tasks={tasksDueOn(tasks, todayISO)} onToggle={toggle} empty="Nothing planned for today." />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ensena-muted">This Week</p>
            <div className="mt-2">
              <TaskCheckboxList tasks={thisWeek} onToggle={toggle} empty="Nothing else this week." />
            </div>
            <Link href="/student-dashboard/study-planner" className="mt-4 flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
              View full planner <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
      </div>

      <ManageLessonSheet
        open={manageSession !== null}
        data={
          manageSession
            ? {
                sheetTitle: `Manage ${kindLabel[manageSession.kind].toLowerCase()}`,
                title: manageSession.title,
                subtitle: manageSession.personName,
                image: manageSession.personImage ?? undefined,
                statusLabel: manageSession.status === "scheduled" ? (manageSession.endMs > nowMs ? "Upcoming" : "Awaiting tutor") : manageSession.status,
                bookingRef: manageSession.bookingReference ?? "—",
                infoRows: [
                  { label: "Date", value: formatLongDate(manageSession.startMs) },
                  { label: "Time", value: formatTimeRange(manageSession) },
                  { label: "Mode", value: manageSession.mode },
                ],
              }
            : null
        }
        actions={manageSession ? manageActions(manageSession) : []}
        onClose={() => setManageId(null)}
      />

      <CancelLessonModal
        open={cancelingSession !== null}
        title="Cancel booking?"
        summary={cancelingSession ? `${formatLongDate(cancelingSession.startMs)} · ${formatTime(cancelingSession.startMs)}: ${cancelingSession.title} with ${cancelingSession.personName}` : ""}
        policyLabel={cancelPreview?.policyApplied ?? ""}
        refundAmount={cancelPreview?.refundAmount ?? 0}
        cancellationFee={cancelPreview?.cancellationFee ?? 0}
        onKeep={() => setCancelingId(null)}
        onConfirm={(reason, notes) => cancel(reason, notes)}
      />

      <Modal open={!!detailsSession || !!detailsCompleted} onClose={() => { setDetailsId(null); if (searchParams.get("view")) router.replace("/student-dashboard/lessons", { scroll: false }); }} title="Class Details">
        {detailsSession && <SessionDetails s={detailsSession} nowMs={nowMs} canEnter={canEnter(detailsSession)} hint={entryHint(detailsSession)} onCancel={canCancel(detailsSession) ? () => { setDetailsId(null); setCancelingId(detailsSession.id); } : undefined} onReschedule={canReschedule(detailsSession) ? () => { setDetailsId(null); setReschedulingId(detailsSession.id); } : undefined} onPay={isUnpaid(detailsSession) ? () => pay(detailsSession) : undefined} />}
        {detailsCompleted && <CompletedDetails c={detailsCompleted} nowMs={nowMs} onReview={() => { setDetailsId(null); setReviewing(detailsCompleted); }} />}
      </Modal>

      <ReviewModal lesson={reviewing} onClose={() => setReviewing(null)} />
      <RescheduleModal session={sessions.find((s) => s.id === reschedulingId) ?? null} nowMs={nowMs} onClose={() => setReschedulingId(null)} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ensena-muted">{label}</span>
      <span className="text-right font-medium text-ensena-ink">{value}</span>
    </div>
  );
}

function SessionDetails({ s, nowMs, canEnter, hint, onCancel, onReschedule, onPay }: { s: LearningSession; nowMs: number; canEnter: boolean; hint: ReactNode; onCancel?: () => void; onReschedule?: () => void; onPay?: () => void }) {
  const status =
    s.status === "cancelled" ? "Cancelled" : s.status === "completed" ? "Completed" : s.status === "no-show" ? "Missed" : s.endMs <= nowMs ? "Awaiting tutor" : s.startMs <= nowMs ? "In progress" : "Upcoming";
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <PersonAvatar name={s.personName} image={s.personImage} className="size-11" />
        <div>
          <p className="font-semibold text-ensena-ink">{s.title}</p>
          <p className="text-xs text-ensena-muted">with {s.personName} · {kindLabel[s.kind]}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-ensena-border pt-3">
        <DetailRow label="Status" value={status} />
        <DetailRow label="Date" value={formatLongDate(s.startMs)} />
        <DetailRow label="Time" value={`${formatTimeRange(s)} (${s.durationMinutes} min)`} />
        <DetailRow label="Mode" value={s.mode} />
        {s.sessionNumber && s.totalSessions ? <DetailRow label="Session" value={`${s.sessionNumber} of ${s.totalSessions}`} /> : null}
        {s.kind === "group" && s.seatsTotal ? <DetailRow label="Class size" value={`${s.seatsFilled}/${s.seatsTotal} students`} /> : null}
        {s.price > 0 && <DetailRow label="Price" value={formatNaira(s.price)} />}
        {s.paymentStatus && <DetailRow label="Payment" value={s.paymentStatus.replace("_", " ").replace(/^./, (c) => c.toUpperCase())} />}
        {s.bookingReference && <DetailRow label="Booking ref" value={s.bookingReference} />}
        {s.status === "cancelled" && s.cancellationReason && <DetailRow label="Reason" value={s.cancellationReason} />}
        {(s.refundAmount ?? 0) > 0 && <DetailRow label="Refund" value={formatNaira(s.refundAmount!)} />}
      </div>
      {s.notes && (
        <div className="rounded-xl bg-ensena-bg-soft p-3">
          <p className="text-xs font-semibold text-ensena-ink">Lesson notes</p>
          <p className="mt-1 whitespace-pre-line text-ensena-muted">{s.notes}</p>
        </div>
      )}
      {isUpcoming(s, nowMs) && (
        <div className="flex flex-col gap-2 pt-1">
          {onPay ? (
            <Button onClick={onPay} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              <CreditCard className="size-4" /> Complete payment
            </Button>
          ) : (
            !canEnter && hint && <p className="text-xs font-medium text-ensena-primary">{hint}</p>
          )}
          {s.classroomHref && !onPay && (
            <Button nativeButton={false} disabled={!canEnter} render={<Link href={s.classroomHref} />} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              <Video className="size-4" /> Enter Classroom
            </Button>
          )}
          {onReschedule && (
            <Button variant="outline" onClick={onReschedule} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium">
              <RefreshCcw className="size-4" /> Reschedule
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="h-10 w-full rounded-full border-ensena-border text-sm font-medium text-rose-600 hover:bg-rose-50">
              Cancel booking
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CompletedDetails({ c, nowMs, onReview }: { c: CompletedLesson; nowMs: number; onReview: () => void }) {
  const badge = completionBadge(c, nowMs);
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <PersonAvatar name={c.tutorName} image={c.tutorImage} className="size-11" />
        <div>
          <p className="font-semibold text-ensena-ink">{c.subject}</p>
          <p className="text-xs text-ensena-muted">with {c.tutorName} · {c.bookingType === "private" ? "Private Lesson" : "Group Class"}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-ensena-border pt-3">
        <DetailRow label="Status" value={badge.label} />
        <DetailRow label="Completed" value={`${formatLongDate(c.completedAtMs)} · ${formatTime(c.completedAtMs)}`} />
        {c.amount ? <DetailRow label="Amount" value={formatNaira(c.amount)} /> : null}
        {c.escrowStatus && <DetailRow label="Payment" value={c.escrowStatus === "Held" ? "Held until confirmed" : c.escrowStatus === "Released" ? "Released to tutor" : "On hold (under review)"} />}
      </div>
      {c.review ? (
        <div className="rounded-xl bg-ensena-bg-soft p-3">
          <p className="flex items-center gap-1 text-xs font-semibold text-ensena-ink">
            Your review ·{" "}
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={cn("size-3", i < c.review!.rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
            ))}
          </p>
          {c.review.comment && <p className="mt-1 text-ensena-muted">{c.review.comment}</p>}
        </div>
      ) : (
        c.reviewable && (
          <Button onClick={onReview} className="h-10 w-full rounded-full bg-amber-500 text-sm font-semibold text-white hover:bg-amber-600">
            <Star className="size-4" /> Leave a review
          </Button>
        )
      )}
    </div>
  );
}

function MiniCalendar({ todayISO, selected, markedDays, onSelect }: { todayISO: string; selected: string; markedDays: Set<string>; onSelect: (iso: string) => void }) {
  const [offset, setOffset] = useState(0);
  const [y, m] = todayISO.split("-").map(Number);
  const view = new Date(Date.UTC(y, m - 1 + offset, 1));
  const viewYear = view.getUTCFullYear();
  const viewMonth = view.getUTCMonth();
  const firstWeekday = view.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(view);
  const iso = (d: number) => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
          <Calendar className="size-4 text-ensena-primary" /> Your Schedule
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous month" onClick={() => setOffset((o) => o - 1)} className="flex size-6 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <ChevronLeft className="size-3.5" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setOffset((o) => o + 1)} className="flex size-6 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ensena-muted">{monthLabel}</p>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-ensena-muted">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
          const dayISO = iso(d);
          const isSelected = dayISO === selected;
          const isToday = dayISO === todayISO;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(dayISO)}
              aria-pressed={isSelected}
              aria-label={`${dayISO}${markedDays.has(dayISO) ? ", has classes" : ""}`}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-lg text-xs",
                isSelected ? "bg-ensena-primary font-semibold text-white" : isToday ? "font-semibold text-ensena-primary ring-1 ring-ensena-primary/40" : "text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              {d}
              {markedDays.has(dayISO) && <span className={cn("absolute bottom-1 size-1 rounded-full", isSelected ? "bg-white" : "bg-ensena-primary")} />}
            </button>
          );
        })}
      </div>
      {markedDays.size > 0 && <p className="mt-3 text-[11px] text-ensena-muted">Dots mark days with classes. Tap a day to see it.</p>}
    </div>
  );
}
