"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import { useAllDiscoverySessions } from "@/hooks/use-discovery-sessions";
import { useReviews } from "@/hooks/use-reviews";
import { submitReview } from "@/lib/reviews-store";

const BACK_HREF = "/tutor-dashboard/private-lessons?tab=Discovery%20Sessions";

// The Discovery Session's tutor-side completion screen — no learning plan,
// no payment, no release. It exists only to (a) confirm the free session is
// over and (b) offer the same optional student review every other booking
// kind already supports, reusing WriteReviewModal/submitReview exactly like
// my-lessons-hub-client.tsx / group-class-detail-client.tsx / calendar-client
// .tsx do for Private/Group bookings.
export function DiscoveryRecommendationClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  // See the matching comment in discovery-followup-client.tsx — the hook,
  // not a plain getAllDiscoverySessions() call, is what keeps a
  // runtime-booked session's server/client render from disagreeing.
  const session = useAllDiscoverySessions().find((d) => d.id === sessionId);
  const reviews = useReviews();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!session) {
    return <div className="mx-auto max-w-lg px-6 py-20 text-center text-sm text-ensena-muted">We couldn&apos;t find that Discovery Session.</div>;
  }

  const alreadyReviewed = reviews.some(
    (r) => r.direction === "tutor-to-student" && r.bookingId === session.id && r.reviewerName === dashboardTutor.name && r.recipientName === session.student
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success"><CheckCircle2 className="size-8" /></span>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-ensena-ink">Discovery Session complete</h1>
      <p className="mt-2 max-w-md text-sm text-ensena-muted">This was a free 25-minute Discovery Session, so there&apos;s nothing to release or confirm here.</p>

      <div className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 text-left">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-full"><Image src={session.studentImage} alt={session.student} fill sizes="48px" className="object-cover" /></div>
        <div>
          <p className="text-sm font-semibold text-ensena-ink">{session.student}</p>
          <p className="text-xs text-ensena-muted">{session.subject} · Discovery Session on {session.date}</p>
        </div>
      </div>

      <div className="mt-6 flex w-full flex-col gap-2.5">
        {alreadyReviewed ? (
          <p className="text-sm text-ensena-muted">You&apos;ve already rated and reviewed {session.student.split(" ")[0]} for this session.</p>
        ) : (
          <Button onClick={() => setReviewOpen(true)} className="h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            <Star className="size-4" /> Rate & Review {session.student.split(" ")[0]}
          </Button>
        )}
        <Button variant="outline" nativeButton={false} render={<Link href={BACK_HREF} />} className="h-11 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink">
          Back to Dashboard
        </Button>
      </div>

      {reviewError && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-rose-600 px-4 py-2 text-xs font-medium text-white shadow-lg">{reviewError}</div>
      )}
      <WriteReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        recipientName={session.student}
        title="Review Your Student"
        onSubmit={(rating, comment) => {
          const result = submitReview({
            direction: "tutor-to-student",
            reviewerName: dashboardTutor.name,
            reviewerImage: dashboardTutor.image,
            recipientName: session.student,
            recipientImage: session.studentImage,
            bookingId: session.id,
            bookingType: "Discovery",
            subject: session.subject,
            rating,
            comment,
          });
          if (!result.ok && (result.reason === "blocked" || result.reason === "restricted")) {
            setReviewError(result.userMessage);
            return;
          }
          setReviewError(null);
          setReviewOpen(false);
          router.push(BACK_HREF);
        }}
      />
    </div>
  );
}
