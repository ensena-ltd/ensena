"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Calendar, CalendarDays, Plus, Users, Users2 } from "lucide-react";

import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { CalendarClient } from "@/components/tutor-dashboard/calendar/calendar-client";
import { PrivateLessonsClient } from "@/components/tutor-dashboard/private-lessons/private-lessons-client";
import { GroupClassesClient } from "@/components/tutor-dashboard/group-classes/group-classes-client";
import { TutorDiscoverySessionsClient } from "@/components/tutor-dashboard/discovery-sessions/discovery-sessions-client";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { useTodayISO } from "@/hooks/use-today-iso";
import { useNowMs } from "@/hooks/use-now-ms";
import { usePrivateLessons } from "@/hooks/use-private-lessons";
import { useReviews } from "@/hooks/use-reviews";
import { getClassEntryState } from "@/lib/class-entry-access";
import { isPrivateBookingComplete } from "@/lib/private-booking-schedule";
import { submitReview } from "@/lib/reviews-store";
import { buildCalendarEvents, dashboardTutor, toISO } from "@/lib/tutor-dashboard-data";
import { getPrivateLessonTimeRange } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

// Right when a tutor ends a Private lesson, the classroom hands off the
// lesson's own identity via these query params (there's no per-lesson detail
// route to land a review popup on otherwise — see the classroom page's own
// comment) — read once here to auto-open the same tutor-to-student review
// used by the Calendar's "Leave a Review" action, so both write to the
// exact same review record (same bookingId/reviewerName/recipientName).
//
// If the lesson that just ended is one session within a multi-session
// booking, the review is keyed to the whole booking's shared bookingId
// (not this one lesson's own id) and only becomes eligible once every
// sibling session is done — never after just the first one.
function usePendingPrivateReview() {
  const searchParams = useSearchParams();
  const reviewLessonId = searchParams.get("reviewLessonId");
  const reviewStudent = searchParams.get("reviewStudent");
  const reviewSubject = searchParams.get("reviewSubject");
  const reviewPromptActive = searchParams.get("reviewPrompt") === "1";
  const allReviews = useReviews();
  const allPrivateLessons = usePrivateLessons();

  const matchedLesson = reviewLessonId ? allPrivateLessons.find((l) => l.id === reviewLessonId) : undefined;
  const siblings = matchedLesson?.bookingId
    ? allPrivateLessons.filter((l) => l.bookingId === matchedLesson.bookingId)
    : matchedLesson
      ? [matchedLesson]
      : [];
  // A standalone one-time lesson (no bookingId) is "complete" the moment
  // its own classroom ends — this hook only ever runs with reviewPromptActive
  // once that's already true, so there's nothing further to gate for it.
  const nowMs = useNowMs();
  const bookingComplete = matchedLesson?.bookingId
    ? isPrivateBookingComplete(
        siblings.map((l) => ({
          status: l.status,
          effectivelyEnded:
            l.status === "Completed" ||
            (l.status !== "Cancelled" && getClassEntryState({ ...getPrivateLessonTimeRange(l), role: "tutor", nowMs }) === "ended"),
        }))
      )
    : true;
  const effectiveBookingId = matchedLesson?.bookingId ?? reviewLessonId;

  const alreadyReviewed = Boolean(
    effectiveBookingId && reviewStudent && allReviews.some((r) => r.direction === "tutor-to-student" && r.bookingId === effectiveBookingId && r.reviewerName === dashboardTutor.name && r.recipientName === reviewStudent)
  );
  const eligible = Boolean(reviewPromptActive && effectiveBookingId && reviewStudent && reviewSubject && bookingComplete && !alreadyReviewed);
  return { eligible, reviewLessonId: effectiveBookingId, reviewStudent, reviewSubject };
}

// "Discovery Sessions" is its own tab here, alongside Schedule/Private
// Classes/Group Classes — reusing the same standalone TutorDiscoverySessionsClient
// that /tutor-dashboard/discovery-sessions renders directly, so there is one
// real implementation, not a duplicate. Upcoming discovery sessions still
// also surface inside the Schedule tab's calendar itself.
const viewTabs = ["Schedule", "Lessons", "Group Classes", "Discovery Sessions"] as const;
type ViewTab = (typeof viewTabs)[number];

const tabLabels: Record<ViewTab, string> = {
  Schedule: "Schedule",
  Lessons: "Private Classes",
  "Group Classes": "Group Classes",
  "Discovery Sessions": "Discovery Sessions",
};

function fromISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Mobile browsers can mangle a shared/typed URL's casing (autofill,
// history suggestions, etc.) — matching `?tab=` case-insensitively means a
// link like `?tab=lessons` still lands on Private Classes instead of
// silently falling back to Schedule with no visible error.
function resolveTab(raw: string | null): ViewTab {
  if (!raw) return "Schedule";
  const normalized = raw.trim().toLowerCase();
  const match = viewTabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "Schedule";
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// "Classes" is the single nav entry for everything schedule/booking-type
// related — private lessons, Group Classes and the tutor's calendar — via
// a lightweight tab switch. Every underlying component is reused as-is and
// untouched; this file adds the tab shell and the shared stat-card header.
// The Schedule tab renders CalendarClient directly — it already owns both
// the desktop week/month grid (with its own Upcoming Classes + Legend
// sidebar) and the mobile day-timeline, so nothing else is layered on top.
export function MyLessonsHubClient() {
  const todayISO = useTodayISO();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [view, setView] = useState<ViewTab>(() => resolveTab(tabParam));
  const pendingReview = usePendingPrivateReview();
  // Starts false rather than reading pendingReview.eligible directly at
  // mount: for a multi-session booking, eligibility depends on useNowMs()
  // (SSR-safe, starts at 0 and only gets the real clock post-mount), so a
  // one-time lazy initializer here would run before that settles and could
  // wrongly conclude "not eligible yet" even when it truly is. Reacting to
  // the value once it settles catches that; it only ever flips false→true
  // once over this component's lifetime.
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors real wall-clock-derived eligibility (useNowMs), not a value derivable from props
    if (pendingReview.eligible) setReviewPopupOpen(true);
  }, [pendingReview.eligible]);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Clicking a sidebar link like "Private Classes" navigates to the same
  // route with a different `?tab=`, which Next.js handles as a client-side
  // update rather than a remount — so `view` (initialized once above) needs
  // to stay in sync with the URL too, not just handle in-page tab clicks.
  // Adjusted during render rather than in a useEffect — React's recommended
  // pattern for "derive state from a changed prop".
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setView(resolveTab(tabParam));
  }

  const statCards = useMemo(() => {
    const events = buildCalendarEvents(todayISO);
    const weekStart = startOfWeek(fromISO(todayISO));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const weekStartISO = toISO(weekStart);
    const weekEndISO = toISO(weekEnd);
    const thisWeek = events.filter((e) => e.date >= weekStartISO && e.date < weekEndISO && e.type !== "blocked");

    const privateCount = thisWeek.filter((e) => e.type === "private" || e.type === "completed" || e.type === "pending").length;
    const groupCount = thisWeek.filter((e) => e.type === "group").length;
    const discoveryCount = thisWeek.filter((e) => e.type === "discovery").length;

    return [
      { icon: Calendar, iconClass: "bg-rose-100 text-rose-700", cardClass: "bg-rose-50/60 border-rose-100", label: "Total Classes This Week", value: thisWeek.length },
      { icon: Users, iconClass: "bg-blue-100 text-blue-700", cardClass: "bg-blue-50/60 border-blue-100", label: "Private Lessons This Week", value: privateCount },
      { icon: Users2, iconClass: "bg-violet-100 text-violet-700", cardClass: "bg-violet-50/60 border-violet-100", label: "Group Classes This Week", value: groupCount },
      { icon: CalendarDays, iconClass: "bg-emerald-100 text-emerald-700", cardClass: "bg-emerald-50/60 border-emerald-100", label: "Discovery Sessions This Week", value: discoveryCount },
    ];
  }, [todayISO]);

  const primaryActionLabel = view === "Lessons" ? "Add Private Class" : "Create Group Class";
  const showPrimaryAction = view !== "Discovery Sessions";

  return (
    <div>
      <TutorTopBar
        primaryAction={
          showPrimaryAction ? (
            <button
              type="button"
              onClick={() => view !== "Lessons" && setView("Group Classes")}
              className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <Plus className="size-4" /> {primaryActionLabel}
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Classes</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your lessons, group classes, discovery sessions and availability.</p>
        </div>
        {showPrimaryAction && (
          <button
            type="button"
            onClick={() => view !== "Lessons" && setView("Group Classes")}
            className="flex h-10 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5 lg:hidden"
          >
            <Plus className="size-4" /> {primaryActionLabel}
          </button>
        )}
      </div>

      {view === "Schedule" && (
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const clickable = stat.label === "Discovery Sessions This Week";
            return (
              <button
                key={stat.label}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setView("Discovery Sessions")}
                className={cn(
                  "rounded-2xl border p-4 text-left",
                  stat.cardClass,
                  clickable ? "cursor-pointer transition-shadow hover:shadow-sm" : "cursor-default"
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-xl", stat.iconClass)}>
                  <Icon className="size-4.5" />
                </span>
                <p className="mt-3 font-heading text-2xl font-semibold text-ensena-ink">{stat.value}</p>
                <p className="text-sm text-ensena-ink">{stat.label}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex w-full max-w-full gap-1 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm lg:w-fit">
        {viewTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setView(tab)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 font-medium transition-colors",
              view === tab ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {view === "Schedule" && <CalendarClient />}
        {view === "Lessons" && <PrivateLessonsClient />}
        {view === "Group Classes" && <GroupClassesClient />}
        {view === "Discovery Sessions" && <TutorDiscoverySessionsClient />}
      </div>

      {reviewError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-lg">{reviewError}</div>
      )}
      <WriteReviewModal
        open={reviewPopupOpen}
        onClose={() => setReviewPopupOpen(false)}
        recipientName={pendingReview.reviewStudent ?? ""}
        title="Review Your Student"
        onSubmit={(rating, comment) => {
          if (!pendingReview.reviewLessonId || !pendingReview.reviewStudent || !pendingReview.reviewSubject) return;
          const result = submitReview({
            direction: "tutor-to-student",
            reviewerName: dashboardTutor.name,
            reviewerImage: dashboardTutor.image,
            recipientName: pendingReview.reviewStudent,
            bookingId: pendingReview.reviewLessonId,
            bookingType: "Private",
            subject: pendingReview.reviewSubject,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            setReviewError(result.userMessage);
            return;
          }
          setReviewError(null);
          setReviewPopupOpen(false);
        }}
      />
    </div>
  );
}
