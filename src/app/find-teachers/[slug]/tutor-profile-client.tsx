"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  FileText,
  GraduationCap,
  Laptop2,
  MessageCircle,
  MessageSquare,
  MonitorPlay,
  NotebookPen,
  Repeat2,
  Star,
  Target,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { TeacherSection } from "@/components/teacher-section";
import { TrustSection } from "@/components/trust-section";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { TrustReliabilityList } from "@/components/shared/trust-reliability-list";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { RequestPreApprovalModal } from "@/components/find-teachers/request-pre-approval-modal";
import { MessageTutorModal } from "@/components/find-teachers/message-tutor-modal";
import { MobileTutorProfile } from "@/components/find-teachers/mobile-tutor-profile";
import { useCanTutorAppearInDiscovery } from "@/hooks/use-account-status";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorAllReviews, useTutorReviewSummary } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { recordTutorViewed } from "@/lib/discovery-store";
import { hasCompletedFreeDiscovery } from "@/lib/discovery-sessions-data";
import { qualificationLine } from "@/lib/academic-matching";
import { groupClassListings } from "@/lib/group-classes-data";
import { languageFlags } from "@/lib/languages-data";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import type { Offer } from "@/lib/offers-data";
import type { Teacher } from "@/lib/data";
import { academicSpecializationLabels } from "@/lib/academic-structure-filter";
import { supportTypeLabelsFor } from "@/lib/academic-support-types";
import { useLiveTutorOverride } from "@/lib/tutor-live-overlay";
import { getTutorTrustStatus, isFoundingTutor, isTopRatedTutor } from "@/lib/tutor-recognition";
import { languageSubjectOptions, type TutorListing } from "@/lib/tutors";

// Matches the "What students say" preview widgets already used on the
// booking pages (3 cards) — this profile page's own Reviews card shows the
// same-sized preview plus a "View all reviews" link to the dedicated
// /reviews page, instead of rendering every review unconditionally.
export const REVIEW_PREVIEW_COUNT = 3;

export const dayLabels = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function getDaySchedule(tutor: TutorListing, day: (typeof dayLabels)[number]): string {
  const isWeekend = day === "Saturday" || day === "Sunday";
  const dayTypeAvailable = isWeekend
    ? tutor.availability.includes("Weekends")
    : tutor.availability.includes("Weekdays");

  if (!dayTypeAvailable) return "Unavailable";

  const hasEvenings = tutor.availability.includes("Evenings");
  return isWeekend ? "9:00 AM – 2:00 PM" : hasEvenings ? "10:00 AM – 8:00 PM" : "10:00 AM – 6:00 PM";
}

function toTeacher(tutor: TutorListing): Teacher {
  return {
    name: tutor.name,
    subject: tutor.subjectTitle,
    rating: tutor.rating.toFixed(1),
    reviews: tutor.reviews,
    price: tutor.price,
    image: tutor.image,
  };
}

const whatYoullLearnBySubject: Record<string, string[]> = {
  Mathematics: ["Core formulas & problem solving", "Exam-style timed practice", "Step-by-step working", "Common WAEC/JAMB pitfalls"],
  English: ["Essay writing & structure", "Grammar & comprehension", "Oral & public speaking", "Exam preparation strategies"],
  Physics: ["Practical experiments & concepts", "Formula application", "Diagram interpretation", "Past question walkthroughs"],
  Chemistry: ["Organic & inorganic fundamentals", "Balancing equations", "Lab safety & practicals", "Exam technique"],
  Biology: ["Diagrams & labelling", "Genetics & ecology basics", "Practical drawing skills", "Revision & recall techniques"],
};

export function whatYoullLearn(subject: string): string[] {
  return whatYoullLearnBySubject[subject] ?? ["Core concepts & fundamentals", "Practical exercises", "Exam-style practice", "Personalised feedback"];
}

export const styleIcons: Record<string, typeof Target> = {
  "Problem Solving": Target,
  "Exam-focused": FileText,
  Practical: Laptop2,
  "Discussion-based": MessageSquare,
  Interactive: Repeat2,
  "One-on-one": Users,
  "Visual Learning": MonitorPlay,
  "Project-based": NotebookPen,
};

export const styleDescriptions: Record<string, string> = {
  "Problem Solving": "Works through problems step by step so the method sticks, not just the answer.",
  "Exam-focused": "Practice and pacing built around WAEC, JAMB and IGCSE requirements.",
  Practical: "Hands-on examples and real-world context, not just theory.",
  "Discussion-based": "Encourages questions and discussion throughout every session.",
  Interactive: "Keeps sessions active and two-way rather than one-sided lectures.",
  "One-on-one": "Adapts pace and explanations to how each student learns best.",
  "Visual Learning": "Uses diagrams and visuals to make ideas easier to picture.",
  "Project-based": "Learning anchored in projects and applied practice, not just drills.",
};


export function useTutorProfileState(tutor: TutorListing) {
  const router = useRouter();
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [discoveryCompleted] = useState(() => hasCompletedFreeDiscovery(tutor.slug));

  useEffect(() => {
    recordTutorViewed(tutor.slug);
  }, [tutor.slug]);

  function goToBooking() {
    router.push(`/find-teachers/${tutor.slug}/book`);
  }

  return {
    saved,
    toggleSaved,
    requestModalOpen,
    setRequestModalOpen,
    messageModalOpen,
    setMessageModalOpen,
    discoveryCompleted,
    goToBooking,
  };
}

export function TutorProfileClient({
  tutor: rawTutor,
  similarTutors,
}: {
  tutor: TutorListing;
  similarTutors: TutorListing[];
}) {
  const tutor = useLiveTutorOverride(rawTutor);
  const tutorUnavailable = !useCanTutorAppearInDiscovery(tutor.name);
  const state = useTutorProfileState(tutor);
  const { saved, toggleSaved, requestModalOpen, setRequestModalOpen, messageModalOpen, setMessageModalOpen, discoveryCompleted } = state;
  const reviewSummary = useTutorReviewSummary(tutor.name, tutor.rating, tutor.reviews, tutor.ratingBreakdown);
  const allReviews = useTutorAllReviews(tutor);
  const previewReviews = allReviews.slice(0, REVIEW_PREVIEW_COUNT);

  const firstName = tutor.name.split(" ")[0];
  const studentsTaught = Math.round(tutor.lessonsTaught / 3);
  const cancellationRatePct = Math.max(1, Math.round((100 - tutor.repeatStudentsPct) / 20));
  const learnItems = whatYoullLearn(tutor.subject);
  const isLanguageTutor = languageSubjectOptions.includes(tutor.subject);
  const tutorGroupClasses = groupClassListings.filter((c) => c.tutorName === tutor.name);
  const fromPricePerHalfHour = Math.round(tutor.price / 2);
  const specialtyTags = Array.from(new Set([tutor.subject, ...tutor.levels]));
  const trust = getTutorTrustStatus(tutor);
  const topRated = isTopRatedTutor(tutor.name, reviewSummary.rating, reviewSummary.reviews);
  const founding = isFoundingTutor(tutor.name);

  function handleRequestSent(offer: Offer) {
    // Don't close here — the modal shows its own "Request sent" confirmation
    // and closes itself (via onClose) once the student clicks Done.
    void offer;
  }

  return (
    <>
      <MobileTutorProfile tutor={tutor} similarTutors={similarTutors} state={state} reviewSummary={reviewSummary} />

      <div className="hidden lg:block mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/find-teachers"
          className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
        >
          <ChevronLeft className="size-4" /> Back to teachers
        </Link>

        {/* Hero + trust corner */}
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6 rounded-2xl border border-ensena-border p-6 sm:flex-row">
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl sm:w-64">
              <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="256px" className="object-cover" />
              {tutor.availableToday && <span className="absolute bottom-2 right-2 size-4 rounded-full border-2 border-white bg-ensena-success" />}
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{tutor.name}</h1>
                    <VerifiedTutorBadge tutorName={tutor.name} className="size-5" />
                    {founding && <FoundingBadge kind="Tutor" compact />}
                  </div>
                  <p className="text-ensena-muted">{qualificationLine(tutor) ?? tutor.subjectTitle}</p>
                </div>
                <button
                  type="button"
                  aria-pressed={saved}
                  onClick={toggleSaved}
                  className="flex items-center gap-1.5 rounded-full border border-ensena-border px-3 py-1.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                >
                  {saved ? "Saved" : "Save"}
                </button>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{reviewSummary.rating}</span>
                <span className="text-ensena-muted">({reviewSummary.reviews} reviews)</span>
                {topRated && (
                  <>
                    <span className="text-ensena-border">·</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Top Rated</span>
                  </>
                )}
                {tutor.availableToday && (
                  <>
                    <span className="text-ensena-border">·</span>
                    <span className="flex items-center gap-1 text-ensena-success">
                      <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
                    </span>
                  </>
                )}
              </p>

              <p className="mt-3 text-sm text-ensena-muted">{tutor.bio}</p>

              <p className="mt-4 text-xl font-semibold text-ensena-ink">
                From {formatNaira(fromPricePerHalfHour)} <span className="text-sm font-normal text-ensena-muted">/ 30 min</span>
              </p>

              <div className="mt-4 flex flex-col gap-2.5">
                {tutorUnavailable ? (
                  <p className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 text-sm font-medium text-ensena-muted">
                    {firstName} is not currently available for new bookings.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-2.5 sm:flex-row">
                      <Button
                        nativeButton={false}
                        render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
                        className="h-11 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
                      >
                        Book Instantly
                      </Button>
                      {discoveryCompleted ? (
                        <Button
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
                          className="h-11 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                        >
                          Continue Learning
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          nativeButton={false}
                          render={<Link href={`/find-teachers/${tutor.slug}/discovery-session`} />}
                          className="h-11 flex-1 rounded-full border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
                        >
                          Discovery Session
                        </Button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequestModalOpen(true)}
                      className="flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                    >
                      Send a pre-approval request
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setMessageModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-ensena-muted hover:text-ensena-ink"
                >
                  <MessageCircle className="size-3.5" /> Or message {firstName} directly
                </button>
              </div>
            </div>
          </div>

          {/* Trust / performance corner card */}
          <div className="rounded-2xl border border-ensena-border p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Performance</p>
            <dl className="mt-2 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-ensena-muted">Students taught</dt>
                <dd className="font-semibold text-ensena-ink">{studentsTaught}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ensena-muted">Lessons taught</dt>
                <dd className="font-semibold text-ensena-ink">{tutor.lessonsTaught}+</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ensena-muted">Repeat students</dt>
                <dd className="font-semibold text-ensena-ink">{tutor.repeatStudentsPct}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ensena-muted">Cancellation rate</dt>
                <dd className="font-semibold text-ensena-ink">{cancellationRatePct}%</dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">On Ensena</p>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-ensena-muted">Joined Ensena</span>
              <span className="font-semibold text-ensena-ink">{tutor.memberSince}</span>
            </div>

            <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Trust &amp; reliability</p>
            <TrustReliabilityList trust={trust} className="mt-1.5 text-xs" />
            {founding && <FoundingBadge kind="Tutor" showExplanation className="mt-3 border-t border-ensena-border pt-3" />}
          </div>
        </div>

        {/* About + Subjects */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
            <p className="mt-2 text-sm text-ensena-muted">
              Hi, I&apos;m {firstName}. I&apos;ve spent the last {tutor.yearsExperience}+ years helping students across {tutor.levels.join(", ")} build confidence in {tutor.subject.toLowerCase()} and improve their exam performance. {tutor.teachingApproach}
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 text-sm text-ensena-ink sm:grid-cols-2">
              <li className="flex items-center gap-2">
                <Calendar className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.yearsExperience}+ years experience
              </li>
              <li className="flex items-center gap-2">
                <Users className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.lessonsTaught}+ lessons taught
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-3.5 shrink-0 text-ensena-primary" /> Expert in {tutor.levels.join(", ")}
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare className="size-3.5 shrink-0 text-ensena-primary" /> {tutor.responseTime}
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {specialtyTags.map((tag) => (
                <span key={tag} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                  {tag}
                </span>
              ))}
            </div>
            {isLanguageTutor && (
              <div className="mt-4 flex flex-col gap-3 border-t border-ensena-border pt-4 sm:flex-row sm:gap-8">
                <div>
                  <p className="text-xs font-medium text-ensena-muted">Languages I teach</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-ensena-ink">
                    <span aria-hidden="true">{languageFlags[tutor.subject]}</span> {tutor.subject} (Native)
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-ensena-muted">I can teach in</p>
                  <p className="mt-1 text-sm text-ensena-ink">
                    {tutor.languages.filter((l) => l !== tutor.subject).join(", ") || tutor.nativeLanguage}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-ensena-border pt-4">
              {tutor.levels.map((lvl) => (
                <span key={lvl} className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink">
                  <GraduationCap className="size-3.5 text-ensena-primary" /> {lvl}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* What I can help with */}
        {tutor.supportTypes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">What I can help with</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {supportTypeLabelsFor(tutor.supportTypes).map((label) => (
                <span key={label} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                  {label}
                </span>
              ))}
            </div>
            {tutor.academicSpecialization && academicSpecializationLabels(tutor.academicSpecialization).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-ensena-border pt-4">
                {academicSpecializationLabels(tutor.academicSpecialization).map((label) => (
                  <span key={label} className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink">
                    <GraduationCap className="size-3.5 text-ensena-primary" /> {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Teaching style & approach + Reviews */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Teaching style &amp; approach</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tutor.learningStyles.map((style) => {
                const Icon = styleIcons[style] ?? Target;
                return (
                  <div key={style} className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ensena-ink">{style}</p>
                      <p className="mt-0.5 text-xs text-ensena-muted">{styleDescriptions[style] ?? ""}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Reviews</h2>
              {allReviews.length > REVIEW_PREVIEW_COUNT && (
                <Link href={`/find-teachers/${tutor.slug}/reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
                  View all reviews
                </Link>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-heading text-3xl font-semibold text-ensena-ink">{reviewSummary.rating}</p>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-ensena-muted">Based on {reviewSummary.reviews} reviews</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = reviewSummary.breakdown[star];
                const pct = reviewSummary.reviews > 0 ? (count / reviewSummary.reviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-ensena-muted">
                    <span className="w-8 shrink-0">{star} ★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ensena-border">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-ensena-border pt-4">
              {previewReviews.map((review) => (
                <div key={review.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ensena-ink">{review.reviewerName}</p>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="size-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ensena-muted">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Availability */}
        <section className="mt-6 rounded-2xl border border-ensena-border p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">{firstName}&apos;s availability</h2>
          <ul className="mt-3 divide-y divide-ensena-border overflow-hidden rounded-xl border border-ensena-border">
            {dayLabels.map((day) => {
              const hours = getDaySchedule(tutor, day);
              return (
                <li key={day} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-ensena-ink">{day}</span>
                  <span className={hours === "Unavailable" ? "text-ensena-muted" : "text-ensena-ink"}>{hours}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ensena-muted">Times shown in WAT (GMT+1). Exact session times are chosen at booking.</p>
        </section>

        {/* Group classes + booking CTA */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Group classes by {firstName}</h2>
              {tutorGroupClasses.length > 0 && (
                <Link href="/group-classes" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                  View all classes <ChevronRight className="size-3.5" />
                </Link>
              )}
            </div>
            {tutorGroupClasses.length === 0 ? (
              <p className="mt-3 text-sm text-ensena-muted">{firstName} doesn&apos;t currently run any group classes.</p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {tutorGroupClasses.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/group-classes/${c.slug}`}
                    className="rounded-2xl border border-ensena-border p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="relative mx-auto size-14">
                      <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${c.ringColor}` }} />
                      <div className="absolute inset-1 overflow-hidden rounded-full">
                        <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />
                      </div>
                    </div>
                    <p className="mt-2 text-center text-sm font-semibold text-ensena-ink">{c.title}</p>
                    <p className="mt-1 flex items-center justify-center gap-1 text-xs text-ensena-muted">
                      <Calendar className="size-3" /> {c.days} · {c.time}
                    </p>
                    <p className="mt-0.5 text-center text-xs text-ensena-muted">{c.difficulty}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ensena-ink">{formatNaira(c.price)} / session</span>
                      <span className="text-ensena-muted">{c.enrolled} / {c.maxSeats} seats</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col justify-center rounded-2xl bg-ensena-primary/5 p-5">
            <p className="text-sm font-semibold text-ensena-ink">Ready to start learning?</p>
            <p className="mt-1 text-xs text-ensena-muted">
              {`Book a session or discover ${firstName} in a discovery session to see if they're the right fit for you.`}
            </p>
            <Button
              nativeButton={false}
              render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
              className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              Book a session now
            </Button>
          </div>
        </div>

        {/* What students can learn */}
        <section className="mt-6 rounded-2xl border border-ensena-border p-6">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">What students can learn</h2>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {learnItems.map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink">
                <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> {item}
              </div>
            ))}
          </div>
        </section>

        {similarTutors.length > 0 && (
          <div className="-mx-6 mt-10">
            <TeacherSection
              title="Similar Tutors You Might Like"
              teachers={similarTutors.map(toTeacher)}
              viewAllLabel="View all tutors"
            />
          </div>
        )}

        <div className="-mx-6 mt-4">
          <TrustSection />
        </div>
      </div>

      {/* Rendered once, shared by both the mobile and desktop trees above
          (which are always both mounted, just CSS-hidden by breakpoint) —
          these modals portal to document.body, so `hidden lg:block` on an
          ancestor wouldn't stop a duplicated copy from also popping open. */}
      <RequestPreApprovalModal
        open={requestModalOpen}
        tutor={tutor}
        studentName={dashboardStudent.name}
        onClose={() => setRequestModalOpen(false)}
        onSent={handleRequestSent}
        onMessageTutorInstead={() => {
          setRequestModalOpen(false);
          setMessageModalOpen(true);
        }}
      />
      <MessageTutorModal open={messageModalOpen} tutor={tutor} onClose={() => setMessageModalOpen(false)} />
    </>
  );
}
