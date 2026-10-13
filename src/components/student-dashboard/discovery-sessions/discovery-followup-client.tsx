"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  Heart,
  Home,
  ShieldAlert,
  ShieldCheck,
  Star,
  Timer,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ReportProblemModal } from "@/components/shared/report-problem-modal";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { submitReview } from "@/lib/reviews-store";
import {
  getDiscoverySessionTimeRange,
  type DiscoveryFitRating,
} from "@/lib/discovery-sessions-data";
import { updateDiscoverySession } from "@/lib/discovery-sessions-store";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { groupClassListings, type GroupClassListing } from "@/lib/group-classes-data";
import { getDiscoveryRecommendedTutors, tutorListings, type TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// A single, full-screen decision page — no forced multi-step wizard. The fit
// question, rating and comment are all captured together; group-class and
// alternative-tutor exploration sit in the side rails at all times (a
// student shouldn't have to commit to "yes" or "no" before being allowed to
// see either option). Discovery Sessions are free — there is deliberately
// no payment/release/dispute step here; a real problem goes through the
// same ReportProblemModal + support-ticket system Counselling/Completed
// Classes already use for Discovery.
function findTutorSlug(name: string): string | undefined {
  return tutorListings.find((t) => t.name === name)?.slug;
}

function formatTimeRange(startMs: number, endMs: number): string {
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${fmt(startMs)} – ${fmt(endMs)}`;
}

export function DiscoveryFollowUpClient({ sessionId }: { sessionId: string }) {
  // useAllDiscoverySessions() (a real useSyncExternalStore) rather than a
  // plain getAllDiscoverySessions() call — a runtime-booked session only
  // exists in the browser's localStorage, so a plain call made during this
  // client component's initial SERVER render would return "not found" and
  // then flip to "found" once the browser hydrates, producing a real
  // hydration-mismatch warning (React logs and self-heals, but it's a real
  // bug, not cosmetic). useSyncExternalStore is built to reconcile that
  // server/client gap without one.
  const session = useAllDiscoverySessions().find((d) => d.id === sessionId);

  const [fitRating, setFitRating] = useState<DiscoveryFitRating | null>(session?.fitRating ?? null);
  const [rating, setRating] = useState(session?.overallRating ?? 0);
  const [comment, setComment] = useState(session?.studentComment ?? "");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(Boolean(session?.fitRating));
  const [reportOpen, setReportOpen] = useState(false);

  const tutorSlug = session ? findTutorSlug(session.tutor) : undefined;
  const tutorListing: TutorListing | undefined = tutorSlug ? tutorListings.find((t) => t.slug === tutorSlug) : undefined;
  // useSavedTutor/useTutorRating must be called unconditionally (Rules of
  // Hooks); an empty slug / zero base rating is harmless since the UI that
  // reads them only renders once a real tutorSlug/session was actually found.
  const [tutorSaved, toggleTutorSaved] = useSavedTutor(tutorSlug ?? "");
  const liveRating = useTutorRating(session?.tutor ?? "", tutorListing?.rating ?? 0, tutorListing?.reviews ?? 0);
  // Only the SAME tutor's own group class for this subject counts as
  // "prefer learning in a group with them."
  const matchingGroupClass = session ? groupClassListings.find((g) => g.tutorName === session.tutor && g.subject === session.subject) : undefined;
  const recommendedTutors = session ? getDiscoveryRecommendedTutors(session.subject, session.tutor, undefined, 3) : [];

  function submitFeedback() {
    if (!session || !fitRating) return;
    updateDiscoverySession(session.id, {
      fitRating,
      ...(rating > 0 ? { overallRating: rating } : {}),
      ...(comment.trim() ? { studentComment: comment.trim() } : {}),
      funnelStage: "FeedbackReceived",
      tutorSelection: fitRating === "Not a Good Fit" ? "NotSelected" : "Selected",
      ...(fitRating === "Not a Good Fit" ? { conversionStatus: "Not Continued" as const } : {}),
    });

    if (rating > 0) {
      const result = submitReview({
        direction: "student-to-tutor",
        reviewerName: dashboardStudent.name,
        reviewerImage: dashboardStudent.image,
        recipientName: session.tutor,
        recipientImage: session.tutorImage,
        bookingId: session.id,
        bookingType: "Discovery",
        subject: session.subject,
        rating,
        comment: comment.trim(),
      });
      if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
        setReviewError(result.userMessage);
        return;
      }
    }
    setReviewError(null);
    setSubmitted(true);
  }

  function markConverted() {
    if (!session) return;
    updateDiscoverySession(session.id, { conversionOutcome: "Converted", conversionStatus: "Continued", conversionChannel: "Private Lessons" });
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm text-ensena-muted">We couldn&apos;t find that Discovery Session.</p>
        <Button nativeButton={false} render={<Link href="/student-dashboard/lessons" />} className="mt-4 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
          Back to My Classes
        </Button>
      </div>
    );
  }

  const timeRange = getDiscoverySessionTimeRange(session);
  const firstName = session.tutor.split(" ")[0];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[280px_1fr_320px] lg:items-start lg:gap-6">
        {/* Left rail — tutor + session details */}
        <div className="order-2 flex flex-col gap-4 lg:order-1">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <div className="relative mx-auto size-24 overflow-hidden rounded-full">
              <Image src={session.tutorImage} alt={session.tutor} fill sizes="96px" className="object-cover" />
              <span className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full border-2 border-white bg-ensena-success text-white">
                <BadgeCheck className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 text-center text-base font-semibold text-ensena-ink">{session.tutor}</p>
            <p className="text-center text-sm text-ensena-muted">{tutorListing?.subjectTitle ?? `${session.subject} Tutor`}</p>
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{liveRating.rating}</span>
              <span className="text-ensena-muted">({liveRating.reviews} reviews)</span>
            </p>

            <div className="mt-4 flex flex-col gap-2 border-t border-ensena-border pt-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Session Details</p>
              <span className="flex items-center gap-2 text-ensena-ink"><Calendar className="size-4 text-ensena-muted" /> {session.date}</span>
              <span className="flex items-center gap-2 text-ensena-ink">
                <Clock className="size-4 text-ensena-muted" /> {timeRange ? formatTimeRange(timeRange.startMs, timeRange.endMs) : session.time}
              </span>
              <span className="flex items-center gap-2 text-ensena-ink"><Timer className="size-4 text-ensena-muted" /> {session.durationMins} minutes</span>
              <span className="flex items-center gap-2 text-ensena-ink"><BookOpen className="size-4 text-ensena-muted" /> {session.subject}</span>
              <span className="mt-1 w-fit rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Discovery Session (Free)</span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-ensena-primary/5 p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary"><Gift className="size-4" /></span>
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Discovery sessions are completely free!</p>
              <p className="text-xs text-ensena-muted">There&apos;s no payment for this session.</p>
            </div>
          </div>
        </div>

        {/* Center — fit decision + rating */}
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><CheckCircle2 className="size-8" /></span>
            <h1 className="mt-3 font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Discovery Session Complete!</h1>
            <p className="mt-1 text-sm text-ensena-muted">Thank you for joining your {session.durationMins}-minute Discovery Session.</p>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="text-center text-lg font-semibold text-ensena-ink">Is this tutor the right fit for you?</h2>
            <p className="mt-1 text-center text-sm text-ensena-muted">Your feedback helps us improve and find you the best learning experience.</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFitRating("Good Fit")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-5 text-center transition-colors",
                  fitRating && fitRating !== "Not a Good Fit" ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft"
                )}
              >
                <Heart className={cn("size-6", fitRating && fitRating !== "Not a Good Fit" ? "fill-ensena-primary text-ensena-primary" : "text-ensena-muted")} />
                <span className={cn("text-sm font-semibold", fitRating && fitRating !== "Not a Good Fit" ? "text-ensena-primary" : "text-ensena-ink")}>
                  Yes, this tutor is a great fit
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFitRating("Not a Good Fit")}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 p-5 text-center transition-colors",
                  fitRating === "Not a Good Fit" ? "border-ensena-primary bg-ensena-primary/5" : "border-ensena-border hover:bg-ensena-bg-soft"
                )}
              >
                <Users className={cn("size-6", fitRating === "Not a Good Fit" ? "text-ensena-primary" : "text-ensena-muted")} />
                <span className={cn("text-sm font-semibold", fitRating === "Not a Good Fit" ? "text-ensena-primary" : "text-ensena-ink")}>
                  Not quite the right fit
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="text-sm font-semibold text-ensena-ink">Rate your experience</h2>
            <p className="text-xs text-ensena-muted">How would you rate your Discovery Session with {firstName}?</p>
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
                  <Star className={cn("size-8", n <= rating ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
                </button>
              ))}
            </div>

            <h3 className="mt-5 text-sm font-semibold text-ensena-ink">Tell us a little more <span className="font-normal text-ensena-muted">(optional)</span></h3>
            <p className="text-xs text-ensena-muted">Share your experience, what you liked, or how we can improve.</p>
            <div className="relative mt-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                rows={4}
                maxLength={500}
                placeholder="Write your review here…"
                className="w-full rounded-xl border border-ensena-border p-3 text-sm"
              />
              <span className="absolute bottom-2 right-3 text-[11px] text-ensena-muted">{comment.length}/500</span>
            </div>

            {reviewError && <p className="mt-2 text-xs font-medium text-rose-600">{reviewError}</p>}

            <Button
              onClick={submitFeedback}
              disabled={!fitRating}
              className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitted ? "Update Feedback" : "Submit Feedback"}
            </Button>

            <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-ensena-bg-soft px-3 py-2.5 text-xs text-ensena-muted">
              <ShieldCheck className="size-3.5 shrink-0 text-ensena-muted" /> Your feedback is private and helps other students find the right tutor.
            </p>
          </div>
        </div>

        {/* Right rail — explore more, always available regardless of the fit decision */}
        <div className="order-3 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-ensena-ink">Explore More Options</h2>

          {matchingGroupClass && <GroupClassMiniCard groupClass={matchingGroupClass} tutorName={session.tutor} />}

          {recommendedTutors.length > 0 && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ensena-ink">More {session.subject} Tutors</h3>
                <Link href="/find-teachers" className="text-xs font-medium text-ensena-primary hover:underline">View all</Link>
              </div>
              <p className="text-xs text-ensena-muted">Other great tutors you might connect with.</p>
              <div className="mt-3 flex flex-col gap-3">
                {recommendedTutors.map((t) => (
                  <RecommendedTutorRow key={t.slug} tutor={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="order-4 mt-6 flex flex-col gap-4 rounded-2xl bg-ensena-primary/5 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionTile
            icon={Heart}
            title="Save Tutors"
            description="Add tutors to your wishlist to find them easily later."
            onClick={tutorSlug ? toggleTutorSaved : undefined}
            active={tutorSaved}
          />
          <ActionTile
            icon={BookOpen}
            title="Book Another Discovery"
            description="Still exploring? Book a free Discovery Session with another tutor."
            href="/find-teachers"
          />
          <ActionTile
            icon={Calendar}
            title="Continue Learning"
            description="Ready to begin your learning journey? Book more sessions."
            href={tutorSlug ? `/find-teachers/${tutorSlug}/book` : undefined}
            onClick={tutorSlug ? markConverted : undefined}
          />
          <ActionTile
            icon={ShieldAlert}
            title="Report an Issue"
            description="Something not right? Let us know and we'll help."
            onClick={() => setReportOpen(true)}
          />
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/student-dashboard" />}
          className="h-11 shrink-0 rounded-full border-ensena-border bg-ensena-surface px-5 text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Home className="size-4" /> Back to Dashboard
        </Button>
      </div>

      <ReportProblemModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        context="booking"
        relatedRecordType="booking"
        relatedRecordId={session.bookingReference}
        relatedRecordLabel={`Discovery Session with ${session.tutor}`}
      />
    </div>
  );
}

function GroupClassMiniCard({ groupClass, tutorName }: { groupClass: GroupClassListing; tutorName: string }) {
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink"><Users className="size-4 text-ensena-primary" /> Join Tutor&apos;s Group Class</p>
      <p className="text-xs text-ensena-muted">Learn with other students in a group.</p>

      <div className="mt-3 rounded-xl bg-ensena-primary/5 p-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-white text-ensena-primary"><Users className="size-4" /></span>
        <p className="mt-2 text-sm font-semibold text-ensena-ink">{groupClass.title}</p>
        <p className="text-xs text-ensena-muted">With {tutorName}</p>
        <div className="mt-2 flex flex-col gap-1 text-xs text-ensena-ink">
          <span className="flex items-center gap-1.5"><Calendar className="size-3.5 text-ensena-muted" /> {groupClass.days} · {groupClass.time}</span>
          <span className="flex items-center gap-1.5"><Clock className="size-3.5 text-ensena-muted" /> Up to {groupClass.maxSeats} students</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-ensena-ink">{formatNaira(groupClass.pricing.perSession)} <span className="font-normal text-ensena-muted">/ session</span></p>
        <Button nativeButton={false} render={<Link href={`/group-classes/${groupClass.slug}`} />} className="mt-3 h-9 w-full rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">
          View Group Class
        </Button>
      </div>
    </div>
  );
}

function RecommendedTutorRow({ tutor }: { tutor: TutorListing }) {
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);
  return (
    <div className="flex items-center gap-2.5">
      <Link href={`/find-teachers/${tutor.slug}`} className="relative size-11 shrink-0 overflow-hidden rounded-full">
        <Image src={tutor.image} alt={tutor.name} fill sizes="44px" className="object-cover" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/find-teachers/${tutor.slug}`} className="truncate text-sm font-semibold text-ensena-ink hover:underline">{tutor.name}</Link>
        <p className="truncate text-xs text-ensena-muted">{tutor.subjectTitle}</p>
        <p className="flex items-center gap-1 text-xs text-ensena-ink">
          <Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating} <span className="text-ensena-muted">({rating.reviews} reviews)</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p className="text-xs font-semibold text-ensena-ink">{formatNaira(tutor.price)}<span className="font-normal text-ensena-muted"> / hour</span></p>
        <button type="button" aria-pressed={saved} aria-label={saved ? "Remove from saved tutors" : "Save tutor"} onClick={toggleSaved}>
          <Heart className={cn("size-4", saved ? "fill-ensena-primary text-ensena-primary" : "text-ensena-muted")} />
        </button>
      </div>
    </div>
  );
}

function ActionTile({
  icon: Icon,
  title,
  description,
  href,
  onClick,
  active,
}: {
  icon: typeof Heart;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary">
        <Icon className={cn("size-4", active && "fill-ensena-primary")} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ensena-ink">{title}</p>
        <p className="text-xs text-ensena-muted">{description}</p>
      </div>
    </>
  );
  const className = "flex items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/60";
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
