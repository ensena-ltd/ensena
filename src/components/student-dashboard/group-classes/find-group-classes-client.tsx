"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Headphones, Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FindGroupClassesCard } from "@/components/student-dashboard/group-classes/find-group-classes-card";
import { useReviews } from "@/hooks/use-reviews";
import { useGroupClassListings } from "@/hooks/use-group-class-listings";
import { computeEffectiveTutorRating } from "@/lib/reviews-store";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { sortOptions, subjectFilterOptions, type GroupClassSortOption } from "@/lib/group-classes-data";

// Reuses the exact same group-class dataset as the public /group-classes
// page (groupClassListings) — this is a new dashboard-embedded layout, not
// a second data source. "View Class" hands off to the existing
// /group-classes/[slug] booking page (cohorts, weekly/monthly plans, etc.)
// unchanged, per the approved MVP: recommend by grade level, keep filters
// to five simple fields, no new booking UI.
const ALL_SUBJECTS = "All Subjects";
const ALL_LEVELS = "All Levels";
const ALL_EXAMS = "All Exams";
const ANY_DAY = "Any Day";
const LEVEL_OPTIONS = ["Primary", "Secondary", "Undergraduate", "Masters", "PhD"];
const EXAM_OPTIONS = ["WAEC / NECO", "JAMB / UTME"];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PRICE_BANDS: { label: string; maxPrice: number }[] = [
  { label: "Any price", maxPrice: Infinity },
  { label: "Up to ₦1,500 / session", maxPrice: 1500 },
  { label: "Up to ₦2,500 / session", maxPrice: 2500 },
  { label: "Up to ₦3,500 / session", maxPrice: 3500 },
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

export function FindGroupClassesClient() {
  const reviews = useReviews();
  const groupClassListings = useGroupClassListings();
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState(ALL_SUBJECTS);
  const [level, setLevel] = useState(ALL_LEVELS);
  const [exam, setExam] = useState(ALL_EXAMS);
  const [day, setDay] = useState(ANY_DAY);
  const [priceLabel, setPriceLabel] = useState(PRICE_BANDS[0].label);
  const [sort, setSort] = useState<GroupClassSortOption>("Popular");

  const maxPrice = PRICE_BANDS.find((b) => b.label === priceLabel)?.maxPrice ?? Infinity;
  const hasActiveFilters =
    subject !== ALL_SUBJECTS || level !== ALL_LEVELS || exam !== ALL_EXAMS || day !== ANY_DAY || priceLabel !== PRICE_BANDS[0].label;

  function clearFilters() {
    setSubject(ALL_SUBJECTS);
    setLevel(ALL_LEVELS);
    setExam(ALL_EXAMS);
    setDay(ANY_DAY);
    setPriceLabel(PRICE_BANDS[0].label);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = groupClassListings.filter((cls) => {
      if (q && !cls.title.toLowerCase().includes(q) && !cls.subject.toLowerCase().includes(q) && !cls.levelBadge.toLowerCase().includes(q)) {
        return false;
      }
      if (subject !== ALL_SUBJECTS && cls.subject !== subject) return false;
      if (level !== ALL_LEVELS && cls.levelBadge !== level) return false;
      if (exam !== ALL_EXAMS && cls.levelBadge !== exam) return false;
      if (day !== ANY_DAY && !cls.days.includes(day)) return false;
      if (cls.price > maxPrice) return false;
      return true;
    });

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
  }, [query, subject, level, exam, day, maxPrice, sort, reviews, groupClassListings]);

  const recommended = useMemo(
    () => groupClassListings.filter((cls) => cls.gradeLevel === dashboardStudent.level).slice(0, 6),
    [groupClassListings]
  );

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Group Classes</h1>
        <p className="mt-1 text-sm text-ensena-muted">Learn together in interactive classes led by expert tutors.</p>
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to learn?"
          aria-label="What do you want to learn?"
          className="h-12 w-full rounded-2xl border border-ensena-border bg-ensena-surface pl-11 pr-4 text-sm text-ensena-ink outline-none focus:border-ensena-primary"
        />
      </div>

      <div className="mt-3 flex items-end gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        <div className="grid min-w-[640px] shrink-0 grid-cols-5 gap-2 lg:min-w-0 lg:flex-1">
          <FieldSelect label="Subject" value={subject} options={[ALL_SUBJECTS, ...subjectFilterOptions]} onChange={setSubject} />
          <FieldSelect label="Academic Level" value={level} options={[ALL_LEVELS, ...LEVEL_OPTIONS]} onChange={setLevel} />
          <FieldSelect label="Exam" value={exam} options={[ALL_EXAMS, ...EXAM_OPTIONS]} onChange={setExam} />
          <FieldSelect label="Day" value={day} options={[ANY_DAY, ...DAY_OPTIONS]} onChange={setDay} />
          <FieldSelect label="Price" value={priceLabel} options={PRICE_BANDS.map((b) => b.label)} onChange={setPriceLabel} />
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-ensena-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-2">
              <h2 className="whitespace-nowrap font-heading text-lg font-semibold text-ensena-ink">Recommended for You</h2>
              <span className="whitespace-nowrap rounded-full bg-ensena-secondary px-2.5 py-0.5 text-xs font-semibold text-ensena-ink">{dashboardStudent.level}</span>
            </div>
            {recommended.length > 0 && (
              <button
                type="button"
                onClick={() => document.getElementById("all-group-classes")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline"
              >
                View all for {dashboardStudent.level} <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
          <p className="mt-0.5 text-sm text-ensena-muted">Group classes that match your academic level.</p>

          {recommended.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommended.map((cls) => (
                <FindGroupClassesCard key={cls.slug} groupClass={cls} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-ensena-border p-6 text-center">
              <p className="text-sm text-ensena-muted">No group classes for {dashboardStudent.level} right now.</p>
              <button
                type="button"
                onClick={() => document.getElementById("all-group-classes")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-2 text-sm font-semibold text-ensena-primary hover:underline"
              >
                Explore all classes
              </button>
            </div>
          )}

          <div id="all-group-classes" className="mt-8 flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-semibold text-ensena-ink">All Group Classes</h2>
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

          {filtered.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {filtered.map((cls) => (
                <FindGroupClassesCard key={cls.slug} groupClass={cls} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-ensena-border p-12 text-center text-ensena-muted">
              No group classes match your filters. Try clearing a few and searching again.
            </div>
          )}

          <div className="mt-8 flex items-center gap-4 rounded-2xl bg-ensena-primary/5 p-5 lg:hidden">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary">
              <Headphones className="size-5" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ensena-ink">Need help?</p>
              <p className="text-xs text-ensena-muted">Not sure which class is right for you?</p>
            </div>
            <Link
              href="/student-dashboard/messages"
              className="flex h-9 shrink-0 items-center justify-center rounded-full border border-ensena-primary px-3.5 text-xs font-semibold text-ensena-primary"
            >
              Talk to a Counsellor
            </Link>
          </div>
        </div>

        <div className="hidden w-72 shrink-0 flex-col gap-5 lg:flex">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Why join Group Classes?</h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              <li>
                <p className="font-medium text-ensena-ink">Learn with peers</p>
                <p className="text-xs text-ensena-muted">Collaborate and grow together.</p>
              </li>
              <li>
                <p className="font-medium text-ensena-ink">Affordable</p>
                <p className="text-xs text-ensena-muted">Get quality lessons at a lower cost.</p>
              </li>
              <li>
                <p className="font-medium text-ensena-ink">Structured learning</p>
                <p className="text-xs text-ensena-muted">Stay consistent with a class schedule.</p>
              </li>
              <li>
                <p className="font-medium text-ensena-ink">Expert tutors</p>
                <p className="text-xs text-ensena-muted">Learn from verified, experienced tutors.</p>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl bg-ensena-primary/5 p-5">
            <p className="text-sm font-semibold text-ensena-ink">Need help?</p>
            <p className="mt-1 text-xs text-ensena-muted">Not sure which class is right for you?</p>
            <Link
              href="/student-dashboard/messages"
              className="mt-3 flex h-9 w-full items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/10"
            >
              Talk to a Counsellor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
