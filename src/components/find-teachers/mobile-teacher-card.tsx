"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { isFoundingTutor, isTopRatedTutor } from "@/lib/tutor-recognition";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// Purpose-built mobile card — not a squeezed-down TeacherResultCard (that
// one is a fixed horizontal row that gets cramped below ~500px). Same
// TutorListing data, same profile route, wired to the shared useSavedTutor
// store so a heart tapped here stays in sync with the homepage's cards.
export function MobileTeacherCard({ tutor }: { tutor: TutorListing }) {
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  return (
    <article className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <div className="flex gap-3">
        <Link
          href={`/find-teachers/${tutor.slug}`}
          className="relative size-24 shrink-0 overflow-hidden rounded-xl"
        >
          <Image
            src={tutor.image}
            alt={`Portrait of ${tutor.name}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="flex min-w-0 items-center gap-1">
                  <Link
                    href={`/find-teachers/${tutor.slug}`}
                    className="line-clamp-2 font-heading text-base font-semibold leading-snug text-ensena-ink"
                  >
                    {tutor.name}
                  </Link>
                  <VerifiedTutorBadge tutorName={tutor.name} />
                </span>
                {isFoundingTutor(tutor.name) && <FoundingBadge kind="Tutor" compact />}
              </div>
              <p className="truncate text-sm text-ensena-muted">{tutor.subjectTitle}</p>
            </div>
            <button
              type="button"
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved tutors" : "Save tutor"}
              onClick={toggleSaved}
              className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
            >
              <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
            </button>
          </div>

          {/* Top Rated lives inline with the rating (real, derived from the
              same number shown here) rather than absolutely positioned over
              the photo above, where it could sit over a face depending on
              how that particular photo happens to be cropped. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ensena-ink">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{rating.rating}</span>
            <span className="text-ensena-muted">({rating.reviews})</span>
            {isTopRatedTutor(tutor.name, rating.rating, rating.reviews) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>
            )}
          </div>
          <p className="text-xs text-ensena-muted">{tutor.yearsExperience}+ years exp.</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.levels.map((level) => (
          <span
            key={level}
            className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink"
          >
            {level}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <span
          className={cn(
            "size-1.5 rounded-full",
            tutor.availableToday ? "bg-ensena-success" : "bg-ensena-muted"
          )}
        />
        <span className={tutor.availableToday ? "text-ensena-success" : "text-ensena-muted"}>
          {tutor.availableToday ? "Available today" : "Available tomorrow"}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-ensena-border pt-3">
        <p className="text-base font-semibold text-ensena-ink">
          {formatNaira(tutor.price)}
          <span className="block text-xs font-normal text-ensena-muted">/ hour</span>
        </p>
        <Button
          nativeButton={false}
          className="h-11 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white"
          render={<Link href={`/find-teachers/${tutor.slug}`} />}
        >
          View Profile
        </Button>
      </div>
    </article>
  );
}
