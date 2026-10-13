"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { formatNaira } from "@/lib/format";
import { languageFlags } from "@/lib/languages-data";
import type { TutorListing } from "@/lib/tutors";

export function LanguageTutorCard({ tutor }: { tutor: TutorListing }) {
  const flag = languageFlags[tutor.subject];
  const rating = useTutorRating(tutor.name, tutor.rating, tutor.reviews);

  return (
    <article className="flex w-64 shrink-0 flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-all hover:-translate-y-1 hover:shadow-lg">
      <Link href={`/find-teachers/${tutor.slug}`} className="relative mx-auto size-20 overflow-hidden rounded-full">
        <Image src={tutor.image} alt={`Portrait of ${tutor.name}`} fill sizes="80px" className="object-cover" />
      </Link>

      <div className="mt-3 text-center">
        <Link
          href={`/find-teachers/${tutor.slug}`}
          className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-ensena-ink hover:underline"
        >
          {tutor.name} {flag && <span aria-hidden="true">{flag}</span>}
        </Link>
        <p className="text-xs text-ensena-muted">{tutor.subjectTitle}</p>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1 text-sm text-ensena-ink">
        <Star className="size-3.5 fill-amber-400 text-amber-400" />
        <span className="font-medium">{rating.rating}</span>
        <span className="text-ensena-muted">({rating.reviews} reviews)</span>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {tutor.languages.map((lang) => (
          <span key={lang} className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[11px] font-medium text-ensena-ink">
            {lang} {lang === tutor.nativeLanguage ? "Native" : "Fluent"}
          </span>
        ))}
      </div>

      <p className="mt-3 text-center text-sm font-semibold text-ensena-ink">
        {formatNaira(tutor.price)} <span className="font-normal text-ensena-muted">/ hour</span>
      </p>

      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/find-teachers/${tutor.slug}/discovery-session`} />}
        className="mt-3 h-9 w-full rounded-full border-ensena-primary text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5"
      >
        Discovery Session · Free
      </Button>
    </article>
  );
}
