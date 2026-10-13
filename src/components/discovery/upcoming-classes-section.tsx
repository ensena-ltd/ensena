"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { formatNaira } from "@/lib/format";
import type { UpcomingGroupClass } from "@/lib/discovery-groups-data";

function UpcomingClassCard({ groupClass }: { groupClass: UpcomingGroupClass }) {
  const seatsLeft = groupClass.maxSeats - groupClass.seatsEnrolled;

  return (
    <article className="flex w-[46vw] shrink-0 flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 transition-all hover:-translate-y-1 hover:shadow-xl sm:w-56 lg:w-64 lg:p-5">
      <div className="flex items-center gap-2.5">
        <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-ensena-border">
          <Image src={groupClass.teacherImage} alt={`Portrait of ${groupClass.teacherName}`} fill sizes="36px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ensena-ink">{groupClass.subject}</p>
          <p className="truncate text-xs text-ensena-muted">{groupClass.teacherName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-ensena-muted">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5" /> {groupClass.dayLabel} · {groupClass.startDateLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5" /> {groupClass.timeLabel}
        </span>
      </div>

      <p className="text-xs font-medium text-ensena-muted">
        {seatsLeft}/{groupClass.maxSeats} seats remaining
      </p>

      <div className="mt-auto flex items-center justify-between pt-1">
        <p className="text-sm font-semibold text-ensena-ink">
          {formatNaira(groupClass.price)} <span className="font-normal text-ensena-muted">/ session</span>
        </p>
      </div>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/group-classes/${groupClass.slug}`} />}
        className="h-9 w-full rounded-full border-ensena-border text-sm font-medium hover:bg-ensena-bg-soft"
      >
        View Class
      </Button>
    </article>
  );
}

interface UpcomingClassesSectionProps {
  title: string;
  subtitle?: string;
  classes: UpcomingGroupClass[];
}

export function UpcomingClassesSection({ title, subtitle, classes }: UpcomingClassesSectionProps) {
  const { scrollerRef, scrollBy } = useHorizontalScroll(280);

  if (classes.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-ensena-muted lg:text-base">{subtitle}</p>}
        </div>
        <Link
          href="#teachers"
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
        >
          View all classes
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="relative mt-5 lg:mt-8">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
        >
          {classes.map((groupClass) => (
            <UpcomingClassCard key={groupClass.slug} groupClass={groupClass} />
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
