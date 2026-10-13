"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, SlidersHorizontal } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MobileSearchBar } from "@/components/find-teachers/mobile-search-bar";
import {
  GroupClassesHero,
  ALL_LEVELS,
} from "@/components/group-classes-page/group-classes-hero";
import {
  GroupClassesFilters,
  defaultGroupClassFilters,
  type GroupClassFiltersState,
} from "@/components/group-classes-page/group-classes-filters";
import { MobileGroupClassFilterChips } from "@/components/group-classes-page/mobile-group-class-filter-chips";
import { MobileGroupClassFilterSheet } from "@/components/group-classes-page/mobile-group-class-filter-sheet";
import { GroupClassResultCard } from "@/components/group-classes-page/group-class-result-card";
import { MobileGroupClassResultCard } from "@/components/group-classes-page/mobile-group-class-result-card";
import { Pagination } from "@/components/group-classes-page/pagination";
import { useReviews } from "@/hooks/use-reviews";
import { useGroupClassListings } from "@/hooks/use-group-class-listings";
import { sortOptions, type GroupClassListing, type GroupClassSortOption } from "@/lib/group-classes-data";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";

const PAGE_SIZE = 9;

export function GroupClassesClient() {
  const reviews = useReviews();
  const groupClassListings = useGroupClassListings();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState(ALL_LEVELS);
  const [filters, setFilters] = useState<GroupClassFiltersState>(defaultGroupClassFilters);
  const [sort, setSort] = useState<GroupClassSortOption>("Popular");
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  function matches(cls: GroupClassListing, activeFilters: GroupClassFiltersState): boolean {
    const q = query.trim().toLowerCase();
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    if (
      q &&
      !cls.title.toLowerCase().includes(q) &&
      !cls.subject.toLowerCase().includes(q) &&
      !cls.levelBadge.toLowerCase().includes(q) &&
      !cls.gradeLevel.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (level !== ALL_LEVELS && cls.levelBadge !== level) return false;
    // A class never qualifies for a support type just because of its
    // subject/level — only classes explicitly declared with a selected
    // support type match (see academic-support-types.ts).
    if (activeFilters.supportTypes.length && !activeFilters.supportTypes.some((t) => cls.supportTypes.includes(t))) {
      return false;
    }
    if (activeFilters.levels.length && !activeFilters.levels.includes(cls.levelBadge)) return false;
    if (activeFilters.grades.length && !activeFilters.grades.includes(cls.gradeLevel)) return false;
    if (activeFilters.subjects.length && !activeFilters.subjects.includes(cls.subject)) return false;
    if (cls.price > activeFilters.maxPrice) return false;
    if (activeFilters.classSizeMax !== null && cls.maxSeats > activeFilters.classSizeMax) return false;
    if (activeFilters.availability.includes("Today") && !cls.days.includes(today)) return false;
    if (
      activeFilters.availability.includes("Weekend") &&
      !cls.days.includes("Sat") &&
      !cls.days.includes("Sun")
    ) {
      return false;
    }
    return true;
  }

  const results = useMemo(() => {
    let list = groupClassListings.filter((cls) => matches(cls, filters));

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "Price: Low to High":
          return a.price - b.price;
        case "Price: High to Low":
          return b.price - a.price;
        case "Highest Rated":
          return computeEffectiveTutorRating(b.tutorName, b.rating, b.reviews).rating - computeEffectiveTutorRating(a.tutorName, a.rating, a.reviews).rating;
        case "Seats Left":
          return b.maxSeats - b.enrolled - (a.maxSeats - a.enrolled);
        default:
          return computeEffectiveTutorRating(b.tutorName, b.rating, b.reviews).reviews - computeEffectiveTutorRating(a.tutorName, a.rating, a.reviews).reviews;
      }
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matches is a fresh closure each render over the same query/level/reviews already listed below
  }, [query, level, filters, sort, reviews, groupClassListings]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const [prevResults, setPrevResults] = useState(results);
  if (prevResults !== results) {
    setPrevResults(results);
    if (page !== 1) setPage(1);
  }

  return (
    <>
      <div className="hidden lg:block">
        <GroupClassesHero
          query={query}
          level={level}
          onQueryChange={setQuery}
          onLevelChange={setLevel}
        />
      </div>

      <div className="lg:hidden">
        <MobileSearchBar query={query} onQueryChange={setQuery} />
        <MobileGroupClassFilterChips filters={filters} onOpenSheet={() => setSheetOpen(true)} />
        <div className="mt-3 flex gap-3 px-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
          <Select value={sort} onValueChange={(v) => v && setSort(v as GroupClassSortOption)}>
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
            <GroupClassesFilters filters={filters} onChange={setFilters} />
          </div>

          <div className="flex-1">
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <p className="text-sm font-medium text-ensena-ink">
                {results.length} group {results.length === 1 ? "class" : "classes"} found
              </p>
              <label className="flex items-center gap-2 text-sm text-ensena-muted">
                Sort by:
                <Select value={sort} onValueChange={(v) => v && setSort(v as GroupClassSortOption)}>
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

            <p className="text-sm font-medium text-ensena-ink lg:hidden">
              {results.length} group {results.length === 1 ? "class" : "classes"} found
            </p>

            {pageItems.length > 0 ? (
              <>
                <div className="mt-6 hidden flex-col gap-6 lg:flex">
                  {pageItems.map((cls) => (
                    <GroupClassResultCard key={cls.slug} groupClass={cls} />
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-4 lg:hidden">
                  {pageItems.map((cls) => (
                    <MobileGroupClassResultCard key={cls.slug} groupClass={cls} />
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-ensena-border p-12 text-center text-ensena-muted">
                No group classes match your filters. Try clearing a few and searching again.
              </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {sheetOpen && (
        <MobileGroupClassFilterSheet
          filters={filters}
          onClose={() => setSheetOpen(false)}
          onApply={setFilters}
          computeCount={(draft) => groupClassListings.filter((cls) => matches(cls, draft)).length}
        />
      )}
    </>
  );
}
