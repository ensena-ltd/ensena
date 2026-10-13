"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Monitor,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import {
  GroupClassBookingSidebar,
  daysPerWeekFor,
  isCohortFull,
} from "@/components/group-classes-page/group-class-booking-sidebar";
import { MobileGroupClassBooking } from "@/components/group-classes-page/mobile-group-class-booking";
import { SimilarGroupClassesSection } from "@/components/group-classes-page/similar-group-classes-section";
import { useGroupClassBySlug } from "@/hooks/use-group-class-listings";
import { useTutorRating } from "@/hooks/use-reviews";
import { getTutorBySlug, slugify } from "@/lib/tutors";
import { classDurationMinutes, formatDaysFull, type GroupClassListing } from "@/lib/group-classes-data";
import { getSimilarLiveGroupClasses } from "@/lib/group-classes-live-data";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { isFoundingTutor, isTopRatedTutor } from "@/lib/tutor-recognition";
import { cn } from "@/lib/utils";

function firstAvailableCohortIndex(groupClass: GroupClassListing): number {
  const index = groupClass.cohorts.findIndex((c) => !isCohortFull(c));
  return index === -1 ? 0 : index;
}

export function GroupClassBookingClient({
  slug,
  initialGroupClass,
}: {
  slug: string;
  initialGroupClass: GroupClassListing | null;
}) {
  const liveGroupClass = useGroupClassBySlug(slug);
  const groupClass = initialGroupClass ?? liveGroupClass;

  if (!groupClass) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-ensena-muted">This class could not be found.</p>
        <Link href="/group-classes" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">
          ← Back to Group Classes
        </Link>
      </div>
    );
  }

  return <GroupClassBookingContent groupClass={groupClass} similar={getSimilarLiveGroupClasses(groupClass)} />;
}

function GroupClassBookingContent({
  groupClass,
  similar,
}: {
  groupClass: GroupClassListing;
  similar: GroupClassListing[];
}) {
  const router = useRouter();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // The teacher sets the recurring schedule when creating the class — the
  // student only chooses which upcoming cohort to join here. How they want
  // to pay is chosen on the following review/payment page, not this one.
  const [cohortIndex, setCohortIndex] = useState(() => firstAvailableCohortIndex(groupClass));

  const daysPerWeek = daysPerWeekFor(groupClass, cohortIndex);

  const cohort = groupClass.cohorts[cohortIndex];

  // The teacher card/reviews below only show real data — group classes
  // don't have their own review text, so we borrow the tutor's real
  // profile (name/subjects/reviews) only when one genuinely exists in the
  // tutor roster, rather than fabricating a profile or reviews that aren't
  // real.
  const matchedTutor = getTutorBySlug(slugify(groupClass.tutorName));
  const hasReviews = Boolean(matchedTutor && matchedTutor.reviewList.length > 0);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const isTopRated = isTopRatedTutor(groupClass.tutorName, rating.rating, rating.reviews);
  const founding = isFoundingTutor(groupClass.tutorName);
  const durationMinutes = classDurationMinutes(cohort.time);

  function goToReview() {
    // No `plan` param — payment-plan choice happens on the review page
    // itself, which defaults to its own first option when none is given.
    const params = new URLSearchParams({ cohort: String(cohortIndex) });
    router.push(`/group-classes/${groupClass.slug}/review?${params.toString()}`);
  }

  const tabs = [
    { label: "About this class", id: "about" },
    { label: "What you'll learn", id: "about" },
    { label: "Class details", id: "class-details" },
    { label: "Your teacher", id: "your-teacher" },
    ...(hasReviews ? [{ label: `Reviews (${rating.reviews})`, id: "reviews" }] : []),
  ];
  const sectionIds = Array.from(new Set(tabs.map((t) => t.id)));

  const [activeSection, setActiveSection] = useState<string>("about");

  // Scrollspy: highlight whichever section is currently nearest the top of
  // the viewport as the user scrolls, so the tab strip acts as an in-page
  // nav rather than exclusive tab panels (every section stays in the DOM
  // and visible — clicking a tab just scrolls to it).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" }
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupClass.slug]);

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
    <MobileGroupClassBooking
      groupClass={groupClass}
      cohortIndex={cohortIndex}
      onSelectCohort={setCohortIndex}
      matchedTutor={matchedTutor}
      onContinue={goToReview}
    />
    <div className="hidden lg:block mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <Link
        href="/group-classes"
        className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
      >
        <ChevronLeft className="size-4" /> Back to group classes
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
        <div>
          {/* Hero image + intro, side by side */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[380px_1fr]">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl sm:aspect-auto">
              <Image src={groupClass.image} alt={groupClass.title} fill sizes="380px" className="object-cover" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                <Monitor className="size-3.5" /> Online Class
              </span>
              <h1 className="mt-2 font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">
                {groupClass.title}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
                with <span className="font-medium">{groupClass.tutorName}</span>
                <VerifiedTutorBadge tutorName={groupClass.tutorName} />
                {founding && <FoundingBadge kind="Tutor" compact />}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{rating.rating}</span>
                <span className="text-ensena-muted">({rating.reviews} reviews)</span>
                {isTopRated && (
                  <>
                    <span className="text-ensena-border">·</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Top Rated</span>
                  </>
                )}
              </p>
              <p className="mt-3 text-sm text-ensena-muted">{groupClass.description}</p>

              <ul className="mt-4 flex flex-col gap-2 text-sm text-ensena-ink">
                <li className="flex items-center gap-2">
                  <Calendar className="size-4 shrink-0 text-ensena-primary" />
                  {daysPerWeek} day{daysPerWeek === 1 ? "" : "s"} per week
                </li>
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0 text-ensena-primary" />
                  {formatDaysFull(cohort.days)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0 text-ensena-primary" />
                  {cohort.time}{durationMinutes > 0 && ` (${durationMinutes} min per class)`}
                </li>
                <li className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-ensena-primary" />
                  Max {cohort.seatsTotal} students per class
                </li>
                <li className="flex items-center gap-2">
                  <GraduationCap className="size-4 shrink-0 text-ensena-primary" />
                  {groupClass.gradeLevel} · {groupClass.levelBadge}
                </li>
              </ul>

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-violet-50 p-3.5">
                <Users className="mt-0.5 size-4 shrink-0 text-violet-700" />
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">Interactive small class</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">
                    You&apos;ll learn with other students, practice together, and get guidance from your teacher.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* In-page section nav (scrollspy — every section below stays in
              the DOM and visible; this just scrolls to and highlights it) */}
          <nav className="mt-8 flex gap-6 overflow-x-auto border-b border-ensena-border">
            {tabs.map((tab) => (
              <button
                key={tab.label}
                type="button"
                onClick={() => scrollToSection(tab.id)}
                className={cn(
                  "shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm font-medium",
                  activeSection === tab.id
                    ? "border-ensena-primary text-ensena-primary"
                    : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* About + What you'll learn */}
          <div id="about" className="mt-6 grid grid-cols-1 gap-6 rounded-2xl border border-ensena-border p-5 sm:grid-cols-2 lg:p-6">
            <div>
              <h2 className="font-heading text-base font-semibold text-ensena-ink">About this class</h2>
              <p className={descriptionExpanded ? "mt-2 text-sm text-ensena-muted" : "mt-2 line-clamp-3 text-sm text-ensena-muted"}>
                {groupClass.description} {groupClass.outcomeSentence}
              </p>
              <button
                type="button"
                onClick={() => setDescriptionExpanded((v) => !v)}
                className="mt-1 flex items-center gap-1 text-sm font-semibold text-ensena-primary"
              >
                {descriptionExpanded ? "Show less" : "Read more"}
                <ChevronRight className={descriptionExpanded ? "size-3.5 -rotate-90 transition-transform" : "size-3.5 rotate-90 transition-transform"} />
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Live interaction", "Practice together", "Supportive community"].map((tag) => (
                  <span key={tag} className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-ink">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-ensena-ink">What you&apos;ll learn</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {groupClass.learningOutcomes.map((outcome) => (
                  <li key={outcome} className="flex items-center gap-2 text-sm text-ensena-ink">
                    <Check className="size-3.5 shrink-0 text-ensena-success" strokeWidth={3} /> {outcome}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Class details */}
          <div id="class-details" className="mt-6 rounded-2xl border border-ensena-border p-5 lg:p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Class details</h2>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Class</dt>
                <dd className="font-medium text-ensena-ink">{groupClass.gradeLevel}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Educational Level</dt>
                <dd className="font-medium text-ensena-ink">{groupClass.levelBadge}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Materials</dt>
                <dd className="font-medium text-ensena-ink">Notes &amp; practice exercises included</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Language</dt>
                <dd className="font-medium text-ensena-ink">{groupClass.language}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Class Size</dt>
                <dd className="font-medium text-ensena-ink">Up to {cohort.seatsTotal} students</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ensena-muted">Class format</dt>
                <dd className="font-medium text-ensena-ink">Online</dd>
              </div>
            </dl>
          </div>

          {/* Your teacher */}
          <div id="your-teacher" className="mt-6 rounded-2xl border border-ensena-border p-5 lg:p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Your teacher</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                <Image src={groupClass.image} alt={groupClass.tutorName} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-semibold text-ensena-ink">
                  {groupClass.tutorName} <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3.5" />
                </p>
                <p className="truncate text-xs text-ensena-muted">
                  {groupClass.subject} Tutor · {matchedTutor ? `${matchedTutor.yearsExperience}+ years exp.` : "Ensena Teacher"}
                </p>
                <p className="flex items-center gap-1 text-xs text-ensena-ink">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> {rating.rating}
                </p>
              </div>
            </div>
            {matchedTutor && (
              <Link
                href={`/find-teachers/${matchedTutor.slug}`}
                className="mt-3 flex h-9 w-fit items-center justify-center rounded-full border border-ensena-border px-5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                View full profile
              </Link>
            )}
          </div>

          {/* Reviews — only shown when we have a real, matched tutor to
              borrow genuine review text from. */}
          {hasReviews && matchedTutor && (
            <div id="reviews" className="mt-6 rounded-2xl border border-ensena-border p-5 lg:p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-heading text-base font-semibold text-ensena-ink">What students say</h2>
                <Link href={`/find-teachers/${matchedTutor.slug}/reviews`} className="text-sm font-semibold text-ensena-primary hover:underline">
                  View all {rating.reviews} reviews
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {matchedTutor.reviewList.map((review, i) => (
                  <div key={i} className="rounded-xl border border-ensena-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ensena-ink">{review.name}</p>
                      <span className="flex items-center gap-1 text-xs font-medium text-ensena-ink">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" /> {review.stars.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-ensena-muted">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Sidebar */}
        <aside className="h-fit lg:sticky lg:top-28">
          <GroupClassBookingSidebar
            groupClass={groupClass}
            cohortIndex={cohortIndex}
            onSelectCohort={setCohortIndex}
            onContinue={goToReview}
          />
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-ensena-success/10 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Secure your spot</p>
              <p className="mt-0.5 text-xs text-ensena-muted">
                Payment is held in escrow and released to the teacher only after the class.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <SimilarGroupClassesSection title="Similar Group Classes" groupClasses={similar} viewAllLabel="View all classes" viewAllHref="/group-classes" />
    </div>
    </>
  );
}
