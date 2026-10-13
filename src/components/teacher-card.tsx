"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star } from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import type { Teacher } from "@/lib/data";
import { slugify } from "@/lib/tutors";
import { cn } from "@/lib/utils";

interface TeacherCardProps {
  teacher: Teacher;
  badge?: "Top Rated" | "New" | "Trending";
  className?: string;
}

const badgeStyles: Record<NonNullable<TeacherCardProps["badge"]>, string> = {
  "Top Rated": "bg-amber-100 text-amber-700",
  New: "bg-emerald-100 text-emerald-700",
  Trending: "bg-orange-100 text-orange-700",
};

export function TeacherCard({ teacher, badge, className }: TeacherCardProps) {
  const slug = slugify(teacher.name);
  const [saved, toggleSaved] = useSavedTutor(slug);
  const rating = useTutorRating(teacher.name, Number(teacher.rating ?? 0), teacher.reviews ?? 0);
  const modeLabel = teacher.modes && teacher.modes.length > 0
    ? teacher.modes.includes("Hybrid") || (teacher.modes.includes("Online") && teacher.modes.includes("Physical"))
      ? "Online + In-person"
      : teacher.modes[0]
    : undefined;

  return (
    <article
      className={cn(
        "flex w-[46vw] shrink-0 flex-col overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:w-56 lg:w-64",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={teacher.image}
          alt={`Portrait of ${teacher.name}`}
          fill
          sizes="256px"
          className="object-cover"
        />
        {teacher.availableToday && (
          <span
            className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-ensena-success"
            aria-label="Available today"
          >
            <span className="size-1.5 rounded-full bg-ensena-success" />
            Available today
          </span>
        )}
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved teachers" : "Save teacher"}
          onClick={toggleSaved}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-ensena-ink shadow-sm transition-transform hover:scale-110"
        >
          <Heart
            className={cn(
              "size-4",
              saved && "fill-ensena-primary text-ensena-primary"
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 lg:p-6">
        <div className="flex items-center gap-1.5">
          <h3 className="font-heading text-sm font-semibold text-ensena-ink">
            {teacher.name}
          </h3>
          <VerifiedTutorBadge tutorName={teacher.name} className="size-3.5" />
        </div>
        <p className="text-xs text-ensena-muted">{teacher.subject}</p>

        {(modeLabel || teacher.yearsExperience) && (
          <p className="text-[11px] text-ensena-muted">
            {modeLabel}
            {modeLabel && teacher.yearsExperience ? " · " : ""}
            {teacher.yearsExperience ? `${teacher.yearsExperience}+ yrs exp` : ""}
          </p>
        )}

        {(teacher.rating || badge) && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ensena-ink">
            {teacher.rating && (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="font-medium">{rating.rating}</span>
                {rating.reviews > 0 && (
                  <span className="text-ensena-muted">
                    ({rating.reviews} reviews)
                  </span>
                )}
              </span>
            )}
            {/* Kept inline with the rating rather than absolutely positioned
                over the photo above, where it could sit over a teacher's
                face depending on how that specific photo happens to be
                cropped. */}
            {badge && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeStyles[badge])}>
                {badge}
              </span>
            )}
          </div>
        )}

        <p className="mt-1 text-sm font-semibold text-ensena-ink">
          From {formatNaira(teacher.price)}{" "}
          <span className="font-normal text-ensena-muted">/ hour</span>
        </p>

        <Button
          variant="outline"
          nativeButton={false}
          className="mt-2 h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
          render={<Link href={`/find-teachers/${slug}`} />}
        >
          View Profile
        </Button>
      </div>
    </article>
  );
}
