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
  return mins >= 60 && mins % 60 === 0 ? `${mins / 60} hour${mins === 60 ? "" : "s"}` : `${mins} min`;
}

// Purpose-built mobile card — matches MobileTeacherCard's own layout
// (find-teachers/mobile-teacher-card.tsx), not a squeezed-down desktop row.
export function MobileGroupClassResultCard({ groupClass }: { groupClass: GroupClassListing }) {
  const [saved, setSaved] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;

  return (
    <article className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <div className="flex gap-3">
        <Link
          href={`/group-classes/${groupClass.slug}`}
          className="relative size-24 shrink-0 overflow-hidden rounded-xl"
        >
          <Image
            src={groupClass.image}
            alt={`${groupClass.tutorName}, class tutor`}
            fill
            sizes="96px"
            className="object-cover"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href={`/group-classes/${groupClass.slug}`}
                className="line-clamp-2 font-heading text-base font-semibold leading-snug text-ensena-ink"
              >
                {groupClass.title}
              </Link>
              <p className="truncate text-sm text-ensena-muted">
                {groupClass.subject} · {groupClass.gradeLevel}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved classes" : "Save class"}
              onClick={() => setSaved((v) => !v)}
              className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
            >
              <Heart className={cn("size-5", saved && "fill-ensena-primary text-ensena-primary")} />
            </button>
          </div>

          {/* Top Rated is real content (derived from the same rating shown
              below), not a decoration — it lives inline with the rating row
              so it can never sit on top of the tutor's photo regardless of
              how that specific photo is framed/cropped. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ensena-ink">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium">{rating.rating}</span>
            <span className="text-ensena-muted">({rating.reviews})</span>
            {isTopRatedTutor(groupClass.tutorName, rating.rating, rating.reviews) && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>
            )}
          </div>
          <p className="flex flex-wrap items-center gap-1 text-xs text-ensena-muted">
            with {groupClass.tutorName}
            <VerifiedTutorBadge tutorName={groupClass.tutorName} className="size-3" />
            {isFoundingTutor(groupClass.tutorName) && <FoundingBadge kind="Tutor" compact />}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
          {groupClass.days} · {groupClass.time}
        </span>
        <span className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
          {durationLabel(groupClass.time)} per session
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
        <Users className="size-3.5 text-ensena-muted" />
        <span className={seatsLeft <= 2 ? "text-amber-600" : "text-ensena-muted"}>
          {seatsLeft} of {groupClass.maxSeats} spots available
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-ensena-border pt-3">
        <p className="text-base font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)}
          <span className="block text-xs font-normal text-ensena-muted">per student</span>
        </p>
        <Button
          nativeButton={false}
          className="h-11 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white"
          render={<Link href={`/group-classes/${groupClass.slug}`} />}
        >
          View Class
        </Button>
      </div>
    </article>
  );
}
