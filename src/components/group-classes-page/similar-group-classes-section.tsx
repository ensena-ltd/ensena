"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { SimilarGroupClassCard } from "@/components/group-classes-page/similar-group-class-card";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import type { GroupClassListing } from "@/lib/group-classes-data";

// Same scroll-shell as TeacherSection (teacher-section.tsx) — heading +
// "View all" link + horizontal scroller with desktop arrow buttons — kept
// as its own small copy rather than generalizing TeacherSection itself, so
// the tutor page's own "Similar Tutors" section can't be affected by
// anything done here.
export function SimilarGroupClassesSection({
  title,
  groupClasses,
  viewAllLabel,
  viewAllHref = "/group-classes",
}: {
  title: string;
  groupClasses: GroupClassListing[];
  viewAllLabel: string;
  viewAllHref?: string;
}) {
  const { scrollerRef, scrollBy } = useHorizontalScroll(280);

  if (groupClasses.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-2xl">{title}</h2>
        <Link href={viewAllHref} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex">
          {viewAllLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="relative mt-5 lg:mt-6">
        <div ref={scrollerRef} className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden">
          {groupClasses.map((cls) => (
            <SimilarGroupClassCard key={cls.slug} groupClass={cls} />
          ))}
        </div>

        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
  );
}
