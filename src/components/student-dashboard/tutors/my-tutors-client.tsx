"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiveTutorRating } from "@/components/shared/live-tutor-rating";
import { WriteReviewModal } from "@/components/shared/reviews/write-review-modal";
import { dashboardStudent, myTutors, type StudentTutor } from "@/lib/student-dashboard-data";
import { hasReviewed, submitReview } from "@/lib/reviews-store";

export function MyTutorsClient() {
  const router = useRouter();
  const [reviewingTutor, setReviewingTutor] = useState<StudentTutor | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">My Tutors</h1>
        <p className="mt-1 text-sm text-ensena-muted">{myTutors.length} tutors you&apos;ve worked with.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {myTutors.map((tutor) => (
          <div key={tutor.id} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <Link href={`/student-dashboard/tutors/${tutor.id}`} className="flex items-center gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-full">
                <Image src={tutor.image} alt={tutor.name} fill sizes="56px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ensena-ink">{tutor.name}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  <LiveTutorRating name={tutor.name} rating={tutor.rating} reviews={tutor.reviews}>{(live) => <>{live.rating} ({live.reviews})</>}</LiveTutorRating>
                </p>
              </div>
            </Link>
            <p className="mt-3 text-xs text-ensena-muted">{tutor.subjects.join(", ")}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-ensena-muted">
              <span>{tutor.lessonsCompleted} lessons completed</span>
              {tutor.nextLesson && <span className="font-medium text-ensena-ink">Next: {tutor.nextLesson}</span>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => router.push(`/student-dashboard/messages?tutor=${encodeURIComponent(tutor.name)}`)}
                className="flex items-center justify-center gap-1 rounded-full border border-ensena-border py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <MessageSquare className="size-3.5" /> Message
              </button>
              <Button
                nativeButton={false}
                render={<Link href={`/student-dashboard/tutors/${tutor.id}`} />}
                className="h-auto rounded-full bg-ensena-primary py-1.5 text-xs font-semibold text-white"
              >
                Book Again
              </Button>
              <button
                type="button"
                disabled={hasReviewed("student-to-tutor", tutor.id, dashboardStudent.name, tutor.name)}
                onClick={() => setReviewingTutor(tutor)}
                className="rounded-full border border-ensena-border py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
              >
                {hasReviewed("student-to-tutor", tutor.id, dashboardStudent.name, tutor.name) ? "Reviewed" : "Review"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {reviewingTutor && (
        <WriteReviewModal
          open={!!reviewingTutor}
          onClose={() => setReviewingTutor(null)}
          recipientName={reviewingTutor.name}
          title={`Review ${reviewingTutor.name}`}
          onSubmit={(rating, comment) => {
            const result = submitReview({
              direction: "student-to-tutor",
              reviewerName: dashboardStudent.name,
              reviewerImage: dashboardStudent.image,
              recipientName: reviewingTutor.name,
              recipientImage: reviewingTutor.image,
              bookingId: reviewingTutor.id,
              bookingType: "Private",
              subject: reviewingTutor.subjects[0] ?? "",
              rating,
              comment,
            });
            setReviewingTutor(null);
            if (result.ok) flash("Review submitted. Thank you!");
            else if (result.reason === "blocked" || result.reason === "restricted") flash(result.userMessage);
            else flash("You've already reviewed this tutor.");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
