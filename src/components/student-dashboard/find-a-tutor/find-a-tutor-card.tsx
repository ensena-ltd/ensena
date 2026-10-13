"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Heart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { isFoundingTutor } from "@/lib/tutor-recognition";
import { isTutorVerifiedByName } from "@/lib/tutor-verification-store";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

// Richer card for the dashboard-embedded "Find a Tutor" experience — same
// TutorListing data and same profile/booking/discovery-session routes as
// the public find-teachers cards, just a fuller layout (status, Book
// Instantly, inline Discovery Session) per the approved mockup. Online/Away
// status and Discovery Session pricing are derived from existing fields
// (availableToday, price) rather than inventing new ones.
export function FindATutorCard({ tutor }: { tutor: TutorListing }) {
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);
  const discoveryPrice = Math.round(tutor.price / 2);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <Link href={`/find-teachers/${tutor.slug}`} className="relative size-16 shrink-0 overflow-hidden rounded-full">
          <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="64px" className="object-cover" />
          <span
            className={cn(
              "absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white",
              tutor.availableToday ? "bg-ensena-success" : "bg-ensena-muted"
            )}
            aria-hidden="true"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={`/find-teachers/${tutor.slug}`} className="truncate font-heading text-base font-semibold text-ensena-ink hover:underline">
                  {tutor.name}
                </Link>
                {isTutorVerifiedByName(tutor.name) && (
                  <BadgeCheck className="size-4 shrink-0 text-ensena-primary" aria-label="Verified tutor" />
                )}
                {isFoundingTutor(tutor.name) && <FoundingBadge kind="Tutor" compact />}
              </div>
              <p className="truncate text-sm text-ensena-muted">
                {tutor.subjectTitle} | {tutor.levels.join(", ")}
              </p>
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

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ensena-ink">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium">{rating.rating}</span>
              <span className="text-ensena-muted">({rating.reviews})</span>
            </span>
            <span className="text-ensena-border">·</span>
            <span className="text-ensena-muted">{tutor.lessonsTaught} lessons</span>
            <span
              className={cn(
                "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold",
                tutor.availableToday ? "bg-ensena-success/10 text-ensena-success" : "bg-ensena-bg-soft text-ensena-muted"
              )}
            >
              {tutor.availableToday ? "Online" : "Away"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[tutor.subject, ...tutor.levels].slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className={cn("size-1.5 rounded-full", tutor.availableToday ? "bg-ensena-success" : "bg-ensena-muted")} />
        <span className={tutor.availableToday ? "text-ensena-success" : "text-ensena-muted"}>
          {tutor.availableToday ? "Available today" : "Available tomorrow"}
        </span>
      </div>

      <Link
        href={`/find-teachers/${tutor.slug}/discovery-session`}
        className="flex items-center justify-between gap-3 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-sm hover:bg-ensena-primary/10"
      >
        <span className="font-medium text-ensena-ink">Discovery Session · 25 min</span>
        <span className="font-semibold text-ensena-primary">From {formatNaira(discoveryPrice)}</span>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-ensena-border pt-3.5">
        <p className="text-base font-semibold text-ensena-ink">
          {formatNaira(tutor.price)}
          <span className="block text-xs font-normal text-ensena-muted">/ hour</span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium hover:bg-ensena-bg-soft"
            render={<Link href={`/find-teachers/${tutor.slug}`} />}
          >
            View Profile
          </Button>
          <Button
            nativeButton={false}
            className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-4 text-sm font-semibold text-white"
            render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
          >
            Book Instantly
          </Button>
        </div>
      </div>

      <p className="text-xs text-ensena-muted">
        {tutor.yearsExperience}+ years experience | Speaks {tutor.languages.join(", ")}
      </p>
    </article>
  );
}
