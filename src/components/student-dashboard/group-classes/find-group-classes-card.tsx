"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Heart, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import type { GroupClassListing } from "@/lib/group-classes-data";
import { studentGroupClasses } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

// A small circular tutor photo — the same "real person" treatment used
// everywhere else a tutor is shown on the platform — rather than a subject
// icon, so this reads as a human tutoring marketplace, not a generic
// subject-tile grid.
export function FindGroupClassesCard({ groupClass }: { groupClass: GroupClassListing }) {
  const [saved, setSaved] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;
  // Already paid for this class? Send them to their enrolled class page
  // instead of back through the booking/payment flow.
  const enrolledClass = studentGroupClasses.find((c) => c.title === groupClass.title);
  const classHref = enrolledClass ? `/student-dashboard/group-classes/${enrolledClass.id}` : `/group-classes/${groupClass.slug}`;

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
      <div className="flex items-start gap-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-full">
          <Image src={groupClass.image} alt={groupClass.tutorName} fill sizes="44px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <Link href={classHref} className="font-heading text-sm font-semibold text-ensena-ink hover:underline">
            {groupClass.title}
          </Link>
          <p className="text-xs text-ensena-muted">
            {groupClass.gradeLevel} · {groupClass.levelBadge}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved classes" : "Save class"}
          onClick={() => setSaved((v) => !v)}
          className="shrink-0 text-ensena-muted transition-colors hover:text-ensena-primary"
        >
          <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-sm text-ensena-ink">
        <span className="font-medium">{groupClass.tutorName}</span>
        <span className="flex items-center gap-1 text-ensena-muted">
          <Star className="size-3.5 fill-amber-400 text-amber-400" /> {rating.rating} ({rating.reviews})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ensena-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" /> {groupClass.days}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> {groupClass.time}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-3.5" /> {groupClass.enrolled} / {groupClass.maxSeats} seats
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ensena-border pt-3">
        <p className="text-sm font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)}
          <span className="font-normal text-ensena-muted"> / session</span>
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          className="h-9 rounded-full border-ensena-border px-4 text-sm font-medium hover:bg-ensena-bg-soft"
          render={<Link href={classHref} />}
        >
          {enrolledClass ? "View Group Class" : "View Class"}
        </Button>
      </div>

      {seatsLeft <= 2 && seatsLeft > 0 && (
        <p className="text-xs font-medium text-amber-600">Only {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left</p>
      )}
    </article>
  );
}
