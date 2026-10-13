"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { classDurationMinutes, type GroupClassListing } from "@/lib/group-classes-data";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

// Same card shell as TeacherCard (teacher-card.tsx) — the "Similar Tutors
// You Might Like" reference — down to the exact classes (rounded-2xl border
// shadow-sm, aspect-[4/3] image, top-right heart, same vertical rhythm),
// with the content swapped for group-class information instead of a tutor
// profile. Kept as a separate component (not a reuse of TeacherCard itself)
// since the two show genuinely different fields — this only copies the
// visual language, not the tutor-specific data contract.
export function SimilarGroupClassCard({ groupClass }: { groupClass: GroupClassListing }) {
  const [saved, setSaved] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;
  const durationMins = classDurationMinutes(groupClass.time);

  return (
    <article className="flex w-[46vw] shrink-0 flex-col overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:w-56 lg:w-64">
      <div className="relative aspect-[4/3] w-full">
        <Image src={groupClass.image} alt={`${groupClass.tutorName}, class tutor`} fill sizes="256px" className="object-cover" />
        {seatsLeft <= 2 && seatsLeft > 0 && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-amber-600">
            Only {seatsLeft} {seatsLeft === 1 ? "spot" : "spots"} left
          </span>
        )}
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved classes" : "Save class"}
          onClick={() => setSaved((v) => !v)}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ensena-ink shadow-sm transition-transform hover:scale-110"
        >
          <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 lg:p-6">
        <h3 className="line-clamp-2 font-heading text-sm font-semibold text-ensena-ink">{groupClass.title}</h3>
        <p className="text-xs text-ensena-muted">{groupClass.subject} · {groupClass.gradeLevel}</p>
        <p className="text-[11px] text-ensena-muted">
          {groupClass.days} · {groupClass.time}
          {durationMins > 0 && ` · ${durationMins} min`}
        </p>

        <div className="flex items-center gap-1 text-xs text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          {rating.reviews > 0 && <span className="text-ensena-muted">({rating.reviews} reviews)</span>}
        </div>

        <p className="text-[11px] text-ensena-muted">{seatsLeft} of {groupClass.maxSeats} spots available</p>

        <p className="mt-1 text-sm font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)} <span className="font-normal text-ensena-muted">per student</span>
        </p>

        <Button
          variant="outline"
          nativeButton={false}
          className="mt-2 h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
          render={<Link href={`/group-classes/${groupClass.slug}`} />}
        >
          View Details
        </Button>
      </div>
    </article>
  );
}
