"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Heart, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { useSavedTutor } from "@/hooks/use-saved-tutor";
import { useTutorRating } from "@/hooks/use-reviews";
import { qualificationLine, verificationBadgeLabel } from "@/lib/academic-matching";
import { formatNaira } from "@/lib/format";
import { isFoundingTutor } from "@/lib/tutor-recognition";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

export function AcademicTutorResultCard({
  tutor,
  isBestMatch,
  bestMatchLabel = "Best Match",
  academicLevel,
  researchLabels,
  serviceLabels,
  secondAction = "book-instantly",
  showSendPreApproval = false,
}: {
  tutor: TutorListing;
  isBestMatch: boolean;
  bestMatchLabel?: string;
  academicLevel: "Undergraduate" | "Masters" | "PhD";
  researchLabels?: string[];
  serviceLabels?: string[];
  secondAction?: "book-instantly" | "view-profile";
  showSendPreApproval?: boolean;
}) {
  const [saved, toggleSaved] = useSavedTutor(tutor.slug);
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);
  const qLine = academicLevel !== "Undergraduate" ? qualificationLine(tutor) : null;
  const verified = academicLevel !== "Undergraduate" ? verificationBadgeLabel(tutor, academicLevel) : null;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:flex-row sm:p-6",
        isBestMatch ? "border-ensena-primary/40 ring-1 ring-ensena-primary/20" : "border-ensena-border"
      )}
    >
      {isBestMatch && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-ensena-primary px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm">
          {bestMatchLabel}
        </span>
      )}

      <Link href={`/find-teachers/${tutor.slug}`} className="relative size-24 shrink-0 self-start overflow-hidden rounded-xl sm:size-32">
        <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="128px" className="object-cover" />
      </Link>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/find-teachers/${tutor.slug}`} className="truncate font-heading text-base font-semibold text-ensena-ink hover:underline">
                {tutor.name}
              </Link>
              <VerifiedTutorBadge tutorName={tutor.name} />
              {isFoundingTutor(tutor.name) && <FoundingBadge kind="Tutor" compact />}
            </div>
            <p className="text-sm text-ensena-muted">{qLine ?? tutor.subjectTitle}</p>
          </div>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved tutors" : "Save tutor"}
            onClick={toggleSaved}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
          >
            <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-ensena-ink">
          <Star className="size-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{rating.rating}</span>
          <span className="text-ensena-muted">({rating.reviews} reviews)</span>
        </div>

        {researchLabels && researchLabels.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-ensena-ink">Research Areas</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {researchLabels.map((label) => (
                <span key={label} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {serviceLabels && serviceLabels.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-ensena-ink">Services</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {serviceLabels.map((label) => (
                <span key={label} className="rounded-full border border-ensena-border px-2.5 py-1 text-xs font-medium text-ensena-muted">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {academicLevel === "Undergraduate" && <p className="mt-2 text-sm text-ensena-muted">{tutor.bio}</p>}

        {verified && (
          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-ensena-success">
            <BadgeCheck className="size-3.5" /> {verified}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-base font-semibold text-ensena-ink">
            {formatNaira(tutor.price)} <span className="text-xs font-normal text-ensena-muted">/ hour</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              className="h-9 rounded-full border-ensena-border text-xs font-medium hover:bg-ensena-bg-soft"
              render={<Link href={`/find-teachers/${tutor.slug}/discovery-session`} />}
            >
              Book Discovery
            </Button>
            {secondAction === "view-profile" ? (
              <Button
                nativeButton={false}
                className="h-9 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary/90"
                render={<Link href={`/find-teachers/${tutor.slug}`} />}
              >
                View Profile
              </Button>
            ) : (
              <Button
                nativeButton={false}
                className="h-9 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary/90"
                render={<Link href={`/find-teachers/${tutor.slug}/book`} />}
              >
                Book Instantly
              </Button>
            )}
            {showSendPreApproval && (
              <Button
                variant="outline"
                nativeButton={false}
                className="h-9 rounded-full border-ensena-border text-xs font-medium hover:bg-ensena-bg-soft"
                render={<Link href={`/find-teachers/${tutor.slug}`} />}
              >
                Send Pre-Approval
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
