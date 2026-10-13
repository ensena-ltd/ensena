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

export function TeacherResultCard({ tutor }: { tutor: TutorListing }) {
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  return (
    <article className="flex gap-5 rounded-2xl border border-ensena-border bg-ensena-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        href={`/find-teachers/${tutor.slug}`}
        className="relative size-32 shrink-0 overflow-hidden rounded-xl"
      >
        <Image
          src={tutor.image}
          alt={`Portrait of ${tutor.name}`}
          fill
          sizes="128px"
          className="object-cover"
        />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/find-teachers/${tutor.slug}`}
                className="font-heading text-base font-semibold text-ensena-ink hover:underline"
              >
                {tutor.name}
              </Link>
              <VerifiedTutorBadge tutorName={tutor.name} />
              {isFoundingTutor(tutor.name) && <FoundingBadge kind="Tutor" compact />}
            </div>
            <p className="text-sm text-ensena-muted">{tutor.subjectTitle}</p>
          </div>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved tutors" : "Save tutor"}
            onClick={toggleSaved}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
          >
            <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
          </button>
        </div>

        {/* Top Rated inline with the rating (kept off the photo above,
            matching the same "no badge over a face" fix already applied to
            every other tutor card this session). */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          <span className="text-ensena-muted">({rating.reviews} reviews)</span>
          <span className="text-ensena-border">|</span>
          <span className="text-ensena-muted">{tutor.yearsExperience}+ years experience</span>
          {isTopRatedTutor(tutor.name, rating.rating, rating.reviews) && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Top Rated</span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {tutor.levels.map((level) => (
            <span
              key={level}
              className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink"
            >
              {level}
            </span>
          ))}
        </div>

        <p className="mt-2 text-sm text-ensena-muted">{tutor.bio}</p>

        <div className="mt-auto flex items-center gap-1.5 pt-2 text-xs font-medium">
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
      </div>

      <div className="flex w-36 shrink-0 flex-col items-end justify-between text-right">
        <p className="text-lg font-semibold text-ensena-ink">
          {formatNaira(tutor.price)}
          <span className="block text-xs font-normal text-ensena-muted">/ hour</span>
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          className="h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
          render={<Link href={`/find-teachers/${tutor.slug}`} />}
        >
          View Profile
        </Button>
      </div>
    </article>
  );
}
