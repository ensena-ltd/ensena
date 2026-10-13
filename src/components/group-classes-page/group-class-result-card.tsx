"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { useTutorRating } from "@/hooks/use-reviews";
import { isFoundingTutor, isTopRatedTutor } from "@/lib/tutor-recognition";
import { classDurationMinutes, type GroupClassListing } from "@/lib/group-classes-data";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

function durationLabel(time: string): string {
  const mins = classDurationMinutes(time);
  return mins >= 60 && mins % 60 === 0 ? `${mins / 60} hour${mins === 60 ? "" : "s"} per session` : `${mins} min per session`;
}

// Same layout as TeacherResultCard (find-teachers/teacher-result-card.tsx) —
// image / content / price+CTA — but leading with the CLASS, not the
// tutor: the user is browsing classes, not browsing tutors. The tutor's
// photo still fills the same image slot since it's still the listing's
// visual identity, just with the class title (not the tutor's name) as the
// card's primary heading.
export function GroupClassResultCard({ groupClass }: { groupClass: GroupClassListing }) {
  const [saved, setSaved] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;

  return (
    <article className="flex gap-5 rounded-2xl border border-ensena-border bg-ensena-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/group-classes/${groupClass.slug}`}
        className="relative size-32 shrink-0 overflow-hidden rounded-xl"
      >
        <Image
          src={groupClass.image}
          alt={`${groupClass.tutorName}, class tutor`}
          fill
          sizes="128px"
          className="object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={`/group-classes/${groupClass.slug}`}
              className="line-clamp-2 font-heading text-base font-semibold leading-snug text-ensena-ink hover:underline"
            >
              {groupClass.title}
            </Link>
            <p className="truncate text-sm text-ensena-muted">
              {groupClass.subject} · {groupClass.gradeLevel} · {groupClass.levelBadge}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved classes" : "Save class"}
            onClick={() => setSaved((v) => !v)}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
          >
            <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
          </button>
        </div>

        {/* Top Rated lives inline with the rating (real, derived from the
            same number shown here) rather than absolutely positioned over
            the tutor's photo, where it could sit over a face depending on
            how that particular photo happens to be cropped. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          <span className="text-ensena-muted">({rating.reviews} reviews)</span>
          {isTopRatedTutor(groupClass.tutorName, rating.rating, rating.reviews) && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>
          )}
          <span className="text-ensena-border">|</span>
          <Users className="size-3.5 text-ensena-muted" />
          <span className="font-medium">{seatsLeft}</span>
          <span className="text-ensena-muted">of {groupClass.maxSeats} spots available</span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ensena-muted">
          with {groupClass.tutorName}
          <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3.5" />
          {isFoundingTutor(groupClass.tutorName) && <FoundingBadge kind="Tutor" compact />}
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
            {groupClass.days} · {groupClass.time}
          </span>
          <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
            {durationLabel(groupClass.time)}
          </span>
        </div>

        <p className="mt-2 text-sm text-ensena-muted">{groupClass.description}</p>

        {seatsLeft <= 2 && seatsLeft > 0 && (
          <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span className="text-amber-600">Only {seatsLeft} {seatsLeft === 1 ? "spot" : "spots"} left</span>
          </div>
        )}
      </div>

      <div className="flex w-36 shrink-0 flex-col items-end justify-between text-right">
        <p className="text-lg font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)}
          <span className="block text-xs font-normal text-ensena-muted">per student</span>
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          className="h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
          render={<Link href={`/group-classes/${groupClass.slug}`} />}
        >
          View Class
        </Button>
      </div>
    </article>
  );
}
