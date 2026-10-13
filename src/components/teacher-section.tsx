"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { TeacherCard } from "@/components/teacher-card";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import type { Teacher } from "@/lib/data";

interface TeacherSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  teachers: Teacher[];
  badge?: "Top Rated" | "New" | "Trending";
  viewAllLabel: string;
  viewAllHref?: string;
}

export function TeacherSection({
  id,
  title,
  subtitle,
  teachers,
  badge,
  viewAllLabel,
  viewAllHref = "/find-teachers",
}: TeacherSectionProps) {
  const { scrollerRef, scrollBy } = useHorizontalScroll(280);

  if (teachers.length === 0) return null;

  return (
    <section id={id} className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-sm text-ensena-muted lg:text-base">{subtitle}</p>}
        </div>
        <Link
          href={viewAllHref}
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
        >
          {viewAllLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="relative mt-5 lg:mt-8">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
        >
          {teachers.map((teacher, i) => (
            <TeacherCard key={`${teacher.name}-${i}`} teacher={teacher} badge={badge} />
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
