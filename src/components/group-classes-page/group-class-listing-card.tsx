"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, Heart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import type { GroupClassListing } from "@/lib/group-classes-data";
import { cn } from "@/lib/utils";

export function GroupClassListingCard({ groupClass }: { groupClass: GroupClassListing }) {
  const [saved, setSaved] = useState(false);
  const rating = useTutorRating(groupClass.tutorName, groupClass.rating, groupClass.reviews);
  const seatsLeft = groupClass.maxSeats - groupClass.enrolled;

  return (
    <article className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start justify-between">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: groupClass.badgeColor, color: groupClass.ringColor }}
        >
          {groupClass.levelBadge}
        </span>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved classes" : "Save class"}
          onClick={() => setSaved((v) => !v)}
          className="text-ensena-muted transition-colors hover:text-ensena-primary"
        >
          <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
        </button>
      </div>

      <div className="relative mx-auto mt-2 size-24">
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 0 3px ${groupClass.ringColor}` }}
        />
        <div className="absolute inset-1 overflow-hidden rounded-full">
          <Image
            src={groupClass.image}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow"
          style={{ backgroundColor: groupClass.ringColor }}
        >
          {groupClass.enrolled} / {groupClass.maxSeats} seats left
        </span>
      </div>

      <h3 className="mt-4 text-center font-heading text-base font-semibold text-ensena-ink">
        <Link href={`/group-classes/${groupClass.slug}`} className="hover:underline">
          {groupClass.title}
        </Link>
      </h3>
      <p className="mt-1 text-center text-sm text-ensena-muted">{groupClass.description}</p>

      <div className="mt-3 flex flex-col items-center gap-1 text-xs text-ensena-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" /> {groupClass.days}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> {groupClass.time}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ensena-border pt-3">
        <p className="text-sm font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)}
          <span className="font-normal text-ensena-muted"> / session</span>
        </p>
        <p className="flex items-center gap-1 text-sm text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          <span className="text-ensena-muted">({rating.reviews})</span>
        </p>
      </div>

      {seatsLeft <= 2 && seatsLeft > 0 && (
        <p className="mt-2 text-center text-xs font-medium text-amber-600">
          Only {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
        </p>
      )}

      <Button
        variant="outline"
        nativeButton={false}
        className="mt-4 h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
        render={<Link href={`/group-classes/${groupClass.slug}`} />}
      >
        View Details
      </Button>
    </article>
  );
}
