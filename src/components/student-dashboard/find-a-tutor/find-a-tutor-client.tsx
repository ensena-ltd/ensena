"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  BookOpen,
  CalendarClock,
  GraduationCap,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { defaultFilters, type FiltersState } from "@/components/find-teachers/teacher-filters";
import { MobileSearchBar } from "@/components/find-teachers/mobile-search-bar";
import { MobileFilterChips } from "@/components/find-teachers/mobile-filter-chips";
import { MobileFilterSheet } from "@/components/find-teachers/mobile-filter-sheet";
import { MobileTeacherCard } from "@/components/find-teachers/mobile-teacher-card";
import { FindATutorCard } from "@/components/student-dashboard/find-a-tutor/find-a-tutor-card";
import { filterTutors, sortTutors } from "@/lib/tutor-search";
import { useLiveTutorListings } from "@/lib/tutor-live-overlay";
import {
  availabilityOptions,
  languageOptions,
  sortOptions,
  subjectOptions,
  tutorTypeOptions,
  type Language,
  type SortOption,
  type TutorType,
} from "@/lib/tutors";

// Reuses the exact same tutor dataset, filter/sort logic (filterTutors,
// sortTutors, FiltersState) and profile/booking/discovery-session routes as
// the public /find-teachers page — this is a new results layout embedded in
// the student-dashboard shell, not a new tutor-discovery engine.
const ALL = "All";
const ANY_PRICE = "Any price";
const LEVEL_OPTIONS = ["Primary", "Secondary", "Undergraduate", "Masters", "PhD"];
const EXAM_OPTIONS = ["WAEC / NECO", "JAMB / UTME"];
const PRICE_BANDS: { label: string; maxPrice: number }[] = [
  { label: ANY_PRICE, maxPrice: defaultFilters.maxPrice },
  { label: "Up to ₦2,500 / hr", maxPrice: 2500 },
  { label: "Up to ₦3,500 / hr", maxPrice: 3500 },
  { label: "Up to ₦5,000 / hr", maxPrice: 5000 },
];

const trustStrip = [
  { icon: ShieldCheck, title: "Verified Tutors", description: "Every tutor is screened & verified" },
  { icon: GraduationCap, title: "Quality Guarantee", description: "Consistently high-rated lessons" },
  { icon: Lock, title: "Secure Payments", description: "Your payment is held safely in escrow" },
  { icon: CalendarClock, title: "24/7 Support", description: "Help whenever you need it" },
];

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border text-sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FindATutorClient() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  // Reflects the dashboard tutor's own live saved profile, same as the
  // public /find-teachers page — see tutor-live-overlay.ts.
  const tutorListings = useLiveTutorListings();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [subject, setSubject] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [exam, setExam] = useState(ALL);
  const [priceLabel, setPriceLabel] = useState(ANY_PRICE);
  const [tutorType, setTutorType] = useState(ALL);
  const [language, setLanguage] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [sort, setSort] = useState<SortOption>("Most relevant");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [listView, setListView] = useState<"grid" | "list">("grid");

  const filters: FiltersState = useMemo(
    () => ({
      supportTypes: [],
      facultyIds: [],
      departmentIds: [],
      courseIds: [],
      fieldIds: [],
      researchAreaIds: [],
      levels: [level, exam].filter((v) => v !== ALL),
      subjects: subject === ALL ? [] : [subject],
      tutorTypes: tutorType === ALL ? [] : [tutorType as TutorType],
      languages: language === ALL ? [] : [language as Language],
      availability: availability === ALL ? [] : [availability as (typeof availabilityOptions)[number]],
      maxPrice: PRICE_BANDS.find((b) => b.label === priceLabel)?.maxPrice ?? defaultFilters.maxPrice,
    }),
    [level, exam, subject, tutorType, language, availability, priceLabel]
  );

  const results = useMemo(() => {
    const filtered = filterTutors(tutorListings, {
      query,
      level: ALL,
      filters,
      allLevels: ALL,
    });
    return sortTutors(filtered, sort);
  }, [tutorListings, query, filters, sort]);

  const popularSubjects = useMemo(() => {
    const counts = new Map<string, number>();
    tutorListings.forEach((t) => counts.set(t.subject, (counts.get(t.subject) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [tutorListings]);

  const topExams = useMemo(() => {
    return EXAM_OPTIONS.map((examOption) => ({
      label: examOption,
      count: tutorListings.filter((t) => t.levels.includes(examOption)).length,
    }));
  }, [tutorListings]);

  const hasResults = results.length > 0;

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Find a Tutor</h1>
        <p className="mt-1 text-sm text-ensena-muted">Search and connect with verified tutors across every subject and level.</p>
      </div>

      <div className="mt-5 hidden flex-wrap items-end gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 lg:flex">
        <div className="grid flex-1 grid-cols-4 gap-3">
          <FieldSelect label="Subject" value={subject} options={[ALL, ...subjectOptions]} onChange={setSubject} />
          <FieldSelect label="Academic Level" value={level} options={[ALL, ...LEVEL_OPTIONS]} onChange={setLevel} />
          <FieldSelect label="Exam" value={exam} options={[ALL, ...EXAM_OPTIONS]} onChange={setExam} />
          <FieldSelect
            label="Price Range"
            value={priceLabel}
            options={PRICE_BANDS.map((b) => b.label)}
            onChange={setPriceLabel}
          />
          <FieldSelect label="Tutor Type" value={tutorType} options={[ALL, ...tutorTypeOptions]} onChange={setTutorType} />
          <FieldSelect label="Language" value={language} options={[ALL, ...languageOptions]} onChange={setLanguage} />
          <FieldSelect
            label="Availability"
            value={availability}
            options={[ALL, ...availabilityOptions]}
            onChange={setAvailability}
          />
        </div>
        <Button
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-6 text-sm font-semibold text-white"
        >
          Search
        </Button>
      </div>

      <div className="mt-4 lg:hidden">
        <div className="-mx-4 sm:-mx-6">
          <MobileSearchBar query={query} onQueryChange={setQuery} />
          <MobileFilterChips filters={filters} onOpenSheet={() => setSheetOpen(true)} />
        </div>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>
          <Select value={sort} onValueChange={(v) => v && setSort(v as SortOption)}>
            <SelectTrigger className="h-11 flex-1 rounded-full border-ensena-border px-4 text-sm font-semibold text-ensena-ink">
              <ArrowUpDown className="size-4 shrink-0 text-ensena-muted" />
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

      <div ref={resultsRef} className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-ensena-ink">
              {results.length} {results.length === 1 ? "tutor" : "tutors"} found
            </p>
            <div className="hidden items-center gap-3 lg:flex">
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
              <div className="flex items-center gap-1 rounded-lg border border-ensena-border p-1">
                <button
                  type="button"
                  onClick={() => setListView("grid")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${listView === "grid" ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted"}`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setListView("list")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${listView === "list" ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted"}`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {hasResults ? (
            <>
              <div className={`mt-4 hidden gap-5 lg:grid ${listView === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
                {results.map((tutor) => (
                  <FindATutorCard key={tutor.slug} tutor={tutor} />
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-4 lg:hidden">
                {results.map((tutor) => (
                  <MobileTeacherCard key={tutor.slug} tutor={tutor} />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ensena-border p-12 text-center text-ensena-muted">
              No tutors match your filters. Try clearing a few and searching again.
            </div>
          )}
        </div>

        <div className="hidden w-72 shrink-0 flex-col gap-5 lg:flex">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <BookOpen className="size-4 text-ensena-primary" /> Popular Subjects
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {popularSubjects.map(([label, count]) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => setSubject(label)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-ensena-muted">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <Tag className="size-4 text-ensena-primary" /> Top Exams
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {topExams.map(({ label, count }) => (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => setExam(label)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-ensena-muted">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border p-5 text-sm">
            <p className="font-semibold text-ensena-ink">Not sure who to pick?</p>
            <p className="mt-1 text-ensena-muted">Book a free Discovery Session to meet a tutor before committing.</p>
            <Link
              href="/find-teachers"
              className="mt-3 flex h-9 w-full items-center justify-center rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover"
            >
              Browse all tutors
            </Link>
          </div>
        </div>
      </div>

      {sheetOpen && (
        <MobileFilterSheet
          filters={filters}
          onApply={(next) => {
            setLevel(next.levels.find((l) => LEVEL_OPTIONS.includes(l)) ?? ALL);
            setExam(next.levels.find((l) => EXAM_OPTIONS.includes(l)) ?? ALL);
            setSubject(next.subjects[0] ?? ALL);
            setTutorType(next.tutorTypes[0] ?? ALL);
            setLanguage(next.languages[0] ?? ALL);
            setAvailability(next.availability[0] ?? ALL);
            setPriceLabel(PRICE_BANDS.find((b) => b.maxPrice === next.maxPrice)?.label ?? ANY_PRICE);
          }}
          onClose={() => setSheetOpen(false)}
          computeCount={(draft) =>
            filterTutors(tutorListings, {
              query,
              level: ALL,
              filters: draft,
              allLevels: ALL,
            }).length
          }
        />
      )}

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustStrip.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex flex-col items-start gap-2.5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
                <Icon className="size-4.5" />
              </span>
              <h3 className="font-heading text-sm font-semibold text-ensena-ink">{item.title}</h3>
              <p className="text-xs text-ensena-muted">{item.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
