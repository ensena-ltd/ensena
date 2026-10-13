"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Share2, Star } from "lucide-react";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  GraduationCap,
  MessageCircle,
  MessageSquare,
  Target,
  Users,
} from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { TeacherSection } from "@/components/teacher-section";
import { TrustSection } from "@/components/trust-section";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { TrustReliabilityList } from "@/components/shared/trust-reliability-list";
import {
  REVIEW_PREVIEW_COUNT,
  dayLabels,
  getDaySchedule,
  styleDescriptions,
  styleIcons,
  useTutorProfileState,
  whatYoullLearn,
} from "@/app/find-teachers/[slug]/tutor-profile-client";
import { useCanTutorAppearInDiscovery } from "@/hooks/use-account-status";
import { useTutorAllReviews, useTutorReviewSummary } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { qualificationLine } from "@/lib/academic-matching";
import { groupClassListings } from "@/lib/group-classes-data";
import { languageFlags } from "@/lib/languages-data";
import type { Teacher } from "@/lib/data";
import { academicSpecializationLabels } from "@/lib/academic-structure-filter";
import { supportTypeLabelsFor } from "@/lib/academic-support-types";
import { getTutorTrustStatus, isFoundingTutor, isTopRatedTutor } from "@/lib/tutor-recognition";
import { languageSubjectOptions, type TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

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

// Mobile-only, streamlined presentation of the tutor profile — same data
// and the same lifted state (save toggle, modal open flags, discovery
// completion) as the desktop page, just laid out as a single scroll with a
// sticky bottom CTA instead of a two-column grid.
export function MobileTutorProfile({
  tutor,
  similarTutors,
  state,
  reviewSummary,
}: {
  tutor: TutorListing;
  similarTutors: TutorListing[];
  state: ReturnType<typeof useTutorProfileState>;
  reviewSummary: ReturnType<typeof useTutorReviewSummary>;
}) {
  const { saved, toggleSaved, setRequestModalOpen, setMessageModalOpen, discoveryCompleted } = state;
  const [bioExpanded, setBioExpanded] = useState(false);
  const tutorUnavailable = !useCanTutorAppearInDiscovery(tutor.name);
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

  return (
    <div className="pb-24 lg:hidden">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-ensena-border bg-ensena-surface px-2">
        <Link
          href="/find-teachers"
          aria-label="Back to teachers"
          className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="font-heading text-base font-semibold text-ensena-ink">Tutor profile</h1>
        <div className="flex items-center">
          <button type="button" aria-label="Share tutor profile" className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
            <Share2 className="size-4.5" />
          </button>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved" : "Save tutor"}
            onClick={toggleSaved}
            className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
          </button>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* Compact side-by-side header — a small avatar next to the name
            rather than a full-width hero photo, so the tutor's identity
            (name) is the visual focus instead of the photo dominating the
            screen. Desktop keeps its own separate large square photo in
            tutor-profile-client.tsx, untouched by this. */}
        <div className="flex items-center gap-3">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
            <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="80px" className="object-cover" />
            {tutor.availableToday && <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border-2 border-white bg-ensena-success" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate font-heading text-xl font-bold text-ensena-ink">{tutor.name}</h2>
              <VerifiedTutorBadge tutorName={tutor.name} className="size-5" />
              {founding && <FoundingBadge kind="Tutor" compact />}
            </div>
            <p className="truncate text-sm text-ensena-muted">{qualificationLine(tutor) ?? tutor.subjectTitle}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="font-medium">{reviewSummary.rating}</span>
              <span className="text-ensena-muted">({reviewSummary.reviews})</span>
              {topRated && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>}
            </p>
          </div>
        </div>

        {tutor.availableToday && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            {tutor.availableToday && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-ensena-success">
                <span className="size-1.5 rounded-full bg-ensena-success" /> Available today
              </p>
            )}
          </div>
        )}

        <p className="mt-3 text-xl font-semibold text-ensena-ink">
          From {formatNaira(fromPricePerHalfHour)} <span className="text-sm font-normal text-ensena-muted">/ 30 min</span>
        </p>

        <div className="mt-4 flex flex-col gap-2.5">
          {tutorUnavailable ? (
            <p className="rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4 text-sm font-medium text-ensena-muted">
              {tutor.name.split(" ")[0]} is not currently available for new bookings.
            </p>
          ) : (
            <>
              <Button
                nativeButton={false}
                render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
                className="h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white"
              >
                Book Instantly
              </Button>
              {discoveryCompleted ? (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
                  className="h-12 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink"
                >
                  Continue Learning
                </Button>
              ) : (
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/find-teachers/${tutor.slug}/discovery-session`} />}
                  className="h-12 w-full rounded-full border-ensena-border text-sm font-semibold text-ensena-ink"
                >
                  Discovery Session
                </Button>
              )}
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border text-sm font-medium text-ensena-ink"
              >
                Send a pre-approval request
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setMessageModalOpen(true)}
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-ensena-muted"
          >
            <MessageCircle className="size-3.5" /> Or message {firstName} directly
          </button>
        </div>

        {/* Trust / performance */}
        <div className="mt-5 rounded-2xl border border-ensena-border p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Performance</p>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
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
          <div className="mt-1.5 flex items-center justify-between text-sm">
            <span className="text-ensena-muted">Joined Ensena</span>
            <span className="font-semibold text-ensena-ink">{tutor.memberSince}</span>
          </div>
          <p className="mt-3 border-t border-ensena-border pt-3 text-xs font-semibold uppercase tracking-wide text-ensena-muted">Trust &amp; reliability</p>
          <TrustReliabilityList trust={trust} className="mt-1.5 text-sm" />
          {founding && <FoundingBadge kind="Tutor" showExplanation className="mt-3 border-t border-ensena-border pt-3" />}
        </div>

        {/* About */}
        <div className="mt-5 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">About {firstName}</h2>
          <p className={bioExpanded ? "mt-2 text-sm text-ensena-muted" : "mt-2 line-clamp-3 text-sm text-ensena-muted"}>
            {tutor.bio}
          </p>
          <button
            type="button"
            onClick={() => setBioExpanded((v) => !v)}
            className="mt-1 flex items-center gap-1 text-sm font-semibold text-ensena-primary"
          >
            {bioExpanded ? "Show less" : "Read more"}
            <ChevronRight className={cn("size-3.5 transition-transform", bioExpanded ? "-rotate-90" : "rotate-90")} />
          </button>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ensena-ink">
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

        {/* Subjects & Exam Expertise */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Subjects &amp; Exam Expertise</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {specialtyTags.map((tag) => (
              <span key={tag} className="rounded-full bg-ensena-primary/10 px-3 py-1.5 text-sm font-medium text-ensena-primary">
                {tag}
              </span>
            ))}
          </div>
          {isLanguageTutor && (
            <div className="mt-4 flex flex-col gap-3 border-t border-ensena-border pt-4">
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

        {/* What I can help with */}
        {tutor.supportTypes.length > 0 && (
          <div className="mt-4 rounded-2xl border border-ensena-border p-4">
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

        {/* Teaching style & approach */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Teaching style &amp; approach</h2>
          <div className="mt-3 flex flex-col gap-4">
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

        {/* Reviews */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
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

        {/* Availability */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">{firstName}&apos;s availability</h2>
          <ul className="mt-3 divide-y divide-ensena-border overflow-hidden rounded-xl border border-ensena-border">
            {dayLabels.map((day) => {
              const hours = getDaySchedule(tutor, day);
              return (
                <li key={day} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className="font-medium text-ensena-ink">{day}</span>
                  <span className={hours === "Unavailable" ? "text-ensena-muted" : "text-ensena-ink"}>{hours}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-ensena-muted">Times shown in WAT (GMT+1). Exact session times are chosen at booking.</p>
        </div>

        {/* Group classes */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Group classes by {firstName}</h2>
            {tutorGroupClasses.length > 0 && (
              <Link href="/group-classes" className="flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">
                View all
              </Link>
            )}
          </div>
          {tutorGroupClasses.length === 0 ? (
            <p className="mt-3 text-sm text-ensena-muted">{firstName} doesn&apos;t currently run any group classes.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {tutorGroupClasses.map((c) => (
                <Link
                  key={c.slug}
                  href={`/group-classes/${c.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-ensena-border p-3"
                >
                  <div className="relative size-12 shrink-0">
                    <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 0 2px ${c.ringColor}` }} />
                    <div className="absolute inset-1 overflow-hidden rounded-full">
                      <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                    <p className="flex items-center gap-1 text-xs text-ensena-muted">
                      <Calendar className="size-3" /> {c.days} · {c.time}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ensena-ink">{formatNaira(c.price)} / session</span>
                      <span className="text-ensena-muted">{c.enrolled} / {c.maxSeats} seats</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ready to start learning */}
        <div className="mt-4 rounded-2xl bg-ensena-primary/5 p-4">
          <p className="text-sm font-semibold text-ensena-ink">Ready to start learning?</p>
          <p className="mt-1 text-xs text-ensena-muted">
            {`Book a session or discover ${firstName} in a discovery session to see if they're the right fit for you.`}
          </p>
          <Button
            nativeButton={false}
            render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
            className="mt-3 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white"
          >
            Book a session now
          </Button>
        </div>

        {/* What students can learn */}
        <div className="mt-4 rounded-2xl border border-ensena-border p-4">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">What students can learn</h2>
          <div className="mt-3 flex flex-col gap-2">
            {learnItems.map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl border border-ensena-border p-3 text-sm text-ensena-ink">
                <CheckCircle2 className="size-4 shrink-0 text-ensena-success" /> {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {similarTutors.length > 0 && (
        <div className="mt-6">
          <TeacherSection
            title="Similar Tutors You Might Like"
            teachers={similarTutors.map(toTeacher)}
            viewAllLabel="View all tutors"
          />
        </div>
      )}

      <div className="mt-4">
        <TrustSection />
      </div>

      {/* Sticky bottom CTA */}
      {!tutorUnavailable && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-ensena-border bg-ensena-surface/95 px-4 py-3 backdrop-blur-md"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <p className="text-sm font-semibold text-ensena-ink">
            From {formatNaira(fromPricePerHalfHour)} <span className="block text-xs font-normal text-ensena-muted">/ 30 min</span>
          </p>
          <Button
            nativeButton={false}
            render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
            className="h-12 shrink-0 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white"
          >
            Book Instantly →
          </Button>
        </div>
      )}
    </div>
  );
}
