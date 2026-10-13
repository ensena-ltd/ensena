"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { GroupClassCard } from "@/components/group-class-card";
import { useHorizontalScroll } from "@/hooks/use-horizontal-scroll";
import { groupClasses } from "@/lib/data";

export function GroupClasses() {
  const { scrollerRef, scrollBy } = useHorizontalScroll(300);

  return (
    <section className="bg-ensena-bg-soft py-8 lg:py-20">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-3xl">
              Group Classes
            </h2>
            <p className="mt-2 text-sm text-ensena-muted lg:text-base">
              Learn with others in interactive small group sessions.
            </p>
          </div>
          <a
            href="#teachers"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
          >
            View all classes
            <ArrowRight className="size-4" />
          </a>
        </div>

        <div className="relative mt-5 lg:mt-8">
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {groupClasses.map((groupClass) => (
              <GroupClassCard key={groupClass.name} groupClass={groupClass} />
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
      </div>
    </section>
  );
}
