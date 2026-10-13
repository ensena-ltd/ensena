"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Lock, CalendarClock, Tag, Map, ArrowUpDown, SlidersHorizontal } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TeacherSearchHero,
  ALL_LEVELS,
} from "@/components/find-teachers/teacher-search-hero";
import {
  TeacherFilters,
  defaultFilters,
  type FiltersState,
} from "@/components/find-teachers/teacher-filters";
import { TeacherResultCard } from "@/components/find-teachers/teacher-result-card";
import { MobileSearchBar } from "@/components/find-teachers/mobile-search-bar";
import { MobileFilterChips } from "@/components/find-teachers/mobile-filter-chips";
import { MobileFilterSheet } from "@/components/find-teachers/mobile-filter-sheet";
import { MobileTeacherCard } from "@/components/find-teachers/mobile-teacher-card";
import { filterTutors, sortTutors } from "@/lib/tutor-search";
import { useLiveTutorListings } from "@/lib/tutor-live-overlay";
import {
  academicLevelFilterOptions,
  availabilityOptions,
  sortOptions,
  type SortOption,
} from "@/lib/tutors";

const PAGE_SIZE = 6;
const MAX_VISIBLE = 300;

const trustStrip = [
  {
    icon: ShieldCheck,
    title: "Verified Tutors",
    description: "All tutors are screened & verified",
  },
  {
    icon: Lock,
    title: "Safe & Secure",
    description: "Your safety and privacy are our priority",
  },
  {
    icon: CalendarClock,
    title: "Flexible Learning",
    description: "Learn anytime, anywhere",
  },
  {
    icon: Tag,
    title: "Affordable Prices",
    description: "Quality tutoring that fits your budget",
  },
];

export function FindTeachersClient() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [level, setLevel] = useState(searchParams.get("level") ?? ALL_LEVELS);
  const [filters, setFilters] = useState<FiltersState>(() => {
    const subjectParam = searchParams.get("subject");
    const availabilityParam = searchParams.get("availability");
    const validAvailability = availabilityOptions.find((option) => option === availabilityParam);
    return {
      ...defaultFilters,
      ...(subjectParam ? { subjects: [subjectParam] } : {}),
      ...(validAvailability ? { availability: [validAvailability] } : {}),
    };
  });
  const [sort, setSort] = useState<SortOption>("Most relevant");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // The dashboard tutor's entry here reflects their live saved profile
  // (support types, academic specialization, levels) — not the frozen seed
  // snapshot — so a teacher's own dashboard edits actually reach these
  // search/filter results, not just their own profile page.
  const tutorListings = useLiveTutorListings();

  const results = useMemo(() => {
    const filtered = filterTutors(tutorListings, {
      query,
      level,
      filters,
      allLevels: ALL_LEVELS,
    });
    return sortTutors(filtered, sort);
  }, [tutorListings, query, level, filters, sort]);

  const resetVisibleCount = () => setVisibleCount(PAGE_SIZE);

  // Reset how many cards are shown whenever the result set itself changes
  // (adjusting state during render, per React's guidance for derived resets).
  const [prevResults, setPrevResults] = useState(results);
  if (prevResults !== results) {
    setPrevResults(results);
    setVisibleCount(PAGE_SIZE);
  }

  const hasResults = results.length > 0;
  const displayedItems = hasResults
    ? Array.from({ length: Math.min(visibleCount, MAX_VISIBLE) }, (_, i) => ({
        tutor: results[i % results.length],
        key: `${results[i % results.length].slug}-${Math.floor(i / results.length)}`,
      }))
    : [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasResults) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, MAX_VISIBLE));
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasResults]);

  return (
    <>
      <div className="hidden lg:block">
        <TeacherSearchHero
          query={query}
          level={level}
          levelOptions={academicLevelFilterOptions}
          onQueryChange={setQuery}
          onLevelChange={setLevel}
        />
      </div>

      <div className="lg:hidden">
        <MobileSearchBar query={query} onQueryChange={setQuery} />
        <MobileFilterChips filters={filters} onOpenSheet={() => setSheetOpen(true)} />
        <div className="mt-3 flex gap-3 px-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
          <Select value={sort} onValueChange={(v) => v && setSort(v as SortOption)}>
            <SelectTrigger className="h-12 flex-1 rounded-full border-ensena-border px-4 text-sm font-semibold text-ensena-ink">
              <ArrowUpDown className="size-4 shrink-0 text-ensena-muted" />
              <span className="text-ensena-muted">Sort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="hidden lg:block">
            <TeacherFilters
              filters={filters}
              onChange={setFilters}
              onApply={resetVisibleCount}
            />
          </div>

          <div className="flex-1">
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <p className="text-sm font-medium text-ensena-ink">
                {results.length} {results.length === 1 ? "tutor" : "tutors"} found
              </p>
              <label className="flex items-center gap-2 text-sm text-ensena-muted">
                Sort by:
                <Select value={sort} onValueChange={(v) => v && setSort(v as SortOption)}>
                  <SelectTrigger className="h-9 rounded-lg border-ensena-border text-sm font-medium text-ensena-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="flex items-center justify-between gap-4 lg:hidden">
              <p className="text-sm font-medium text-ensena-ink">
                {results.length} {results.length === 1 ? "tutor" : "tutors"} found
              </p>
              <span className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted">
                <Map className="size-4" />
                Map view
              </span>
            </div>

            {hasResults ? (
              <>
                <div className="mt-6 hidden flex-col gap-6 lg:flex">
                  {displayedItems.map(({ tutor, key }) => (
                    <TeacherResultCard key={key} tutor={tutor} />
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-4 lg:hidden">
                  {displayedItems.map(({ tutor, key }) => (
                    <MobileTeacherCard key={key} tutor={tutor} />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-ensena-border p-12 text-center text-ensena-muted">
                No tutors match your filters. Try clearing a few and searching again.
              </div>
            )}

            {hasResults && (
              <div ref={sentinelRef} className="mt-8 flex items-center justify-center gap-2 py-4">
                <Loader2 className="size-4 animate-spin text-ensena-muted" />
                <span className="text-sm text-ensena-muted">Loading more tutors…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {sheetOpen && (
        <MobileFilterSheet
          filters={filters}
          onApply={setFilters}
          onClose={() => setSheetOpen(false)}
          computeCount={(draft) =>
            filterTutors(tutorListings, {
              query,
              level,
              filters: draft,
              allLevels: ALL_LEVELS,
            }).length
          }
        />
      )}

      <section className="bg-ensena-bg-soft py-12">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 sm:px-6 lg:px-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustStrip.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col items-start gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold text-ensena-ink">
                  {item.title}
                </h3>
                <p className="text-sm text-ensena-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
