"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, BookOpen, CalendarClock, GraduationCap, Heart, Lock, ShieldCheck, Star, Tag, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoundingBadge } from "@/components/shared/founding-badge";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { formatNaira } from "@/lib/format";
import type { TutorDirectoryEntry } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { PersonAvatar, useLiveNow } from "./live-shared";
import { availabilityLabel, expertiseTags, experienceLabel, platformWeekday, teachingLevels, tutorTitle } from "./tutor-ui";

const ALL = "All";
const ANY_PRICE = "Any price";
const SORTS = ["Most relevant", "Highest rated", "Most lessons", "Price: low to high", "Price: high to low"] as const;
type Sort = (typeof SORTS)[number];
const PRICE_BANDS = [
  { label: ANY_PRICE, max: Infinity },
  { label: "Up to ₦2,500 / hr", max: 2500 },
  { label: "Up to ₦3,500 / hr", max: 3500 },
  { label: "Up to ₦5,000 / hr", max: 5000 },
  { label: "Up to ₦10,000 / hr", max: 10000 },
];
const AVAILABILITY = ["Available today", "Weekdays", "Weekends", "Evenings"] as const;

const trustStrip = [
  { icon: ShieldCheck, title: "Verified Tutors", description: "Every tutor is screened & verified" },
  { icon: GraduationCap, title: "Quality Guarantee", description: "Consistently high-rated lessons" },
  { icon: Lock, title: "Secure Payments", description: "Your payment is held safely in escrow" },
  { icon: CalendarClock, title: "24/7 Support", description: "Help whenever you need it" },
];

const norm = (s: string) => s.toLowerCase();

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border text-sm" aria-label={label} title={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option === ALL ? `All ${label.toLowerCase()}` : option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Real, approved tutors from Supabase — searched, filtered and sorted in the browser. */
export function FindATutorReal({ tutors, savedIds, studentSubjects, generatedAtMs }: { tutors: TutorDirectoryEntry[]; savedIds: string[]; studentSubjects: string[]; generatedAtMs: number }) {
  const searchParams = useSearchParams();
  const nowMs = useLiveNow(generatedAtMs);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [subject, setSubject] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [exam, setExam] = useState(ALL);
  const [price, setPrice] = useState(ANY_PRICE);
  const [qualification, setQualification] = useState(ALL);
  const [language, setLanguage] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [sort, setSort] = useState<Sort>("Most relevant");
  const [view, setView] = useState<"grid" | "list">("grid");

  const options = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
    return {
      subjects: uniq(tutors.flatMap((t) => t.subjects)),
      levels: uniq(tutors.flatMap(teachingLevels)),
      exams: uniq(tutors.flatMap((t) => t.exams)),
      qualifications: uniq(tutors.map((t) => t.qualification)),
      languages: uniq(tutors.flatMap((t) => t.languages)),
    };
  }, [tutors]);
  const wanted = useMemo(() => studentSubjects.map(norm), [studentSubjects]);
  const todayDow = platformWeekday(nowMs);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const max = PRICE_BANDS.find((b) => b.label === price)?.max ?? Infinity;
    const relevance = (t: TutorDirectoryEntry) => t.subjects.filter((s) => wanted.some((w) => norm(s).includes(w) || w.includes(norm(s)))).length;
    return tutors
      .filter((t) => {
        if (q && ![t.name, t.headline, t.bio, ...t.subjects, ...t.exams].some((f) => norm(f).includes(q))) return false;
        if (subject !== ALL && !t.subjects.includes(subject)) return false;
        if (level !== ALL && !t.levels.includes(level)) return false;
        if (exam !== ALL && !t.exams.includes(exam)) return false;
        if (qualification !== ALL && t.qualification !== qualification) return false;
        if (language !== ALL && !t.languages.includes(language)) return false;
        if (max !== Infinity && (t.pricePerHour === null || t.pricePerHour > max)) return false;
        if (availability === "Available today" && !t.teachingDays.includes(todayDow)) return false;
        if (availability === "Weekdays" && !t.teachingDays.some((d) => d >= 1 && d <= 5)) return false;
        if (availability === "Weekends" && !t.teachingDays.some((d) => d === 0 || d === 6)) return false;
        if (availability === "Evenings" && !t.teachesEvenings) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "Highest rated":
            return (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount;
          case "Most lessons":
            return b.lessonsTaught - a.lessonsTaught;
          case "Price: low to high":
            return (a.pricePerHour ?? Infinity) - (b.pricePerHour ?? Infinity);
          case "Price: high to low":
            return (b.pricePerHour ?? 0) - (a.pricePerHour ?? 0);
          default:
            return relevance(b) - relevance(a) || (b.rating ?? 0) - (a.rating ?? 0) || b.lessonsTaught - a.lessonsTaught;
        }
      });
  }, [tutors, query, subject, level, exam, qualification, language, price, availability, sort, wanted, todayDow]);

  const popularSubjects = useMemo(() => {
    const counts = new Map<string, number>();
    tutors.forEach((t) => t.subjects.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  }, [tutors]);
  const topExams = useMemo(() => options.exams.map((e) => ({ label: e, count: tutors.filter((t) => t.exams.includes(e)).length })).sort((a, b) => b.count - a.count).slice(0, 4), [options.exams, tutors]);

  function clearAll() {
    setQuery("");
    setSubject(ALL);
    setLevel(ALL);
    setExam(ALL);
    setPrice(ANY_PRICE);
    setQualification(ALL);
    setLanguage(ALL);
    setAvailability(ALL);
  }

  const filtersActive = query || [subject, level, exam, qualification, language, availability].some((v) => v !== ALL) || price !== ANY_PRICE;

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Find a Tutor</h1>
        <p className="mt-1 text-sm text-ensena-muted">Search and connect with verified tutors across every subject and level.</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-4 lg:flex-row lg:items-end">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FieldSelect label="Subjects" value={subject} options={[ALL, ...options.subjects]} onChange={setSubject} />
          <FieldSelect label="Levels" value={level} options={[ALL, ...options.levels]} onChange={setLevel} />
          <FieldSelect label="Exams" value={exam} options={[ALL, ...options.exams]} onChange={setExam} />
          <FieldSelect label="Price range" value={price} options={PRICE_BANDS.map((b) => b.label)} onChange={setPrice} />
          <FieldSelect label="Qualifications" value={qualification} options={[ALL, ...options.qualifications]} onChange={setQualification} />
          <FieldSelect label="Languages" value={language} options={[ALL, ...options.languages]} onChange={setLanguage} />
          <FieldSelect label="Availability" value={availability} options={[ALL, ...AVAILABILITY]} onChange={setAvailability} />
        </div>
        <Button
          onClick={() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-6 text-sm font-semibold text-white"
        >
          Search
        </Button>
      </div>

      {query && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-ensena-primary/10 px-3 py-1 font-medium text-ensena-primary">
            Results for &ldquo;{query}&rdquo;
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      )}

      <div ref={resultsRef} className="mt-6 flex scroll-mt-6 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-ensena-ink">
              {results.length} {results.length === 1 ? "tutor" : "tutors"} found
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-ensena-muted">
                Sort by:
                <Select value={sort} onValueChange={(v) => v && setSort(v as Sort)}>
                  <SelectTrigger className="h-9 rounded-lg border-ensena-border text-sm font-medium text-ensena-ink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORTS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="hidden items-center gap-1 rounded-lg border border-ensena-border p-1 lg:flex">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={cn("rounded-md px-2.5 py-1 text-xs font-medium capitalize", view === v ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {results.length > 0 ? (
            <div className={cn("mt-4 grid grid-cols-1 gap-5", view === "grid" && "lg:grid-cols-2")}>
              {results.map((t) => (
                <TutorCard key={t.id} tutor={t} initiallySaved={savedIds.includes(t.id)} nowMs={nowMs} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ensena-border p-12 text-center text-ensena-muted">
              {tutors.length === 0 ? "No verified tutors yet. New tutors join every week." : "No tutors match your filters. Try clearing a few and searching again."}
              {filtersActive && tutors.length > 0 && (
                <button type="button" onClick={clearAll} className="mt-3 block w-full text-sm font-semibold text-ensena-primary hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-72">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <BookOpen className="size-4 text-ensena-primary" /> Popular Subjects
            </h2>
            <ul className="mt-3 flex flex-col gap-1.5">
              {popularSubjects.map(([label, count]) => (
                <li key={label}>
                  <button type="button" onClick={() => setSubject(label)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft", subject === label && "bg-ensena-primary/5 text-ensena-primary")}>
                    <span>{label}</span>
                    <span className="text-xs text-ensena-muted">{count}</span>
                  </button>
                </li>
              ))}
              {popularSubjects.length === 0 && <li className="px-2 text-sm text-ensena-muted">No subjects yet.</li>}
            </ul>
          </div>

          {topExams.length > 0 && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
                <Tag className="size-4 text-ensena-primary" /> Top Exams
              </h2>
              <ul className="mt-3 flex flex-col gap-1.5">
                {topExams.map(({ label, count }) => (
                  <li key={label}>
                    <button type="button" onClick={() => setExam(label)} className={cn("flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft", exam === label && "bg-ensena-primary/5 text-ensena-primary")}>
                      <span>{label}</span>
                      <span className="text-xs text-ensena-muted">{count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-ensena-border p-5 text-sm">
            <p className="font-semibold text-ensena-ink">Not sure who to pick?</p>
            <p className="mt-1 text-ensena-muted">Book a free Discovery Session to meet a tutor before committing.</p>
            <button
              type="button"
              onClick={() => {
                clearAll();
                resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="mt-3 flex h-9 w-full items-center justify-center rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover"
            >
              Browse all tutors
            </button>
          </div>
        </div>
      </div>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustStrip.map((item) => (
          <div key={item.title} className="flex flex-col items-start gap-2.5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
              <item.icon className="size-4.5" />
            </span>
            <h3 className="font-heading text-sm font-semibold text-ensena-ink">{item.title}</h3>
            <p className="text-xs text-ensena-muted">{item.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function TutorCard({ tutor: t, initiallySaved, nowMs }: { tutor: TutorDirectoryEntry; initiallySaved: boolean; nowMs: number }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const profileHref = `/student-dashboard/tutors/${t.id}`;
  const bookable = Boolean(t.pricePerHour) && !t.onVacation;
  const avail = availabilityLabel(t, nowMs);
  const levels = teachingLevels(t);

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setTutorSaved(t.id, next);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "Couldn't update your saved tutors.");
      }
    });
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <Link href={profileHref} className="relative shrink-0">
          <PersonAvatar name={t.name} image={t.image} className="size-16 text-xl" />
          <span className={cn("absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white", t.online ? "bg-ensena-success" : "bg-ensena-muted")} aria-hidden="true" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Link href={profileHref} className="truncate font-heading text-base font-semibold text-ensena-ink hover:underline">
                  {t.name}
                </Link>
                <BadgeCheck className="size-4 shrink-0 text-ensena-primary" aria-label="Verified tutor" />
                {t.founding && <FoundingBadge kind="Tutor" compact />}
              </div>
              <p className="truncate text-sm text-ensena-muted">
                {tutorTitle(t)}
                {levels.length > 0 && ` | ${levels.join(", ")}`}
              </p>
            </div>
            <button
              type="button"
              aria-pressed={saved}
              aria-label={saved ? "Remove from saved tutors" : "Save tutor"}
              disabled={pending}
              onClick={toggleSaved}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted transition-colors hover:bg-ensena-bg-soft"
            >
              <Heart className={cn("size-4", saved && "fill-ensena-primary text-ensena-primary")} />
            </button>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ensena-ink">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {t.rating !== null ? (
                <>
                  <span className="font-medium">{t.rating}</span>
                  <span className="text-ensena-muted">({t.reviewCount})</span>
                </>
              ) : (
                <span className="text-ensena-muted">New</span>
              )}
            </span>
            <span className="text-ensena-border">·</span>
            <span className="text-ensena-muted">
              {t.lessonsTaught} {t.lessonsTaught === 1 ? "lesson" : "lessons"}
            </span>
            <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-semibold", t.online ? "bg-ensena-success/10 text-ensena-success" : "bg-ensena-bg-soft text-ensena-muted")}>
              {t.online ? "Online" : "Away"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {expertiseTags(t, 4).map((tag) => (
          <span key={tag} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className={cn("size-1.5 rounded-full", avail.today ? "bg-ensena-success" : "bg-ensena-muted")} />
        <span className={avail.today ? "text-ensena-success" : "text-ensena-muted"}>{avail.label}</span>
      </div>

      <Link href={`/student-dashboard/messages?tutor=${t.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-ensena-primary/5 px-3.5 py-2.5 text-sm hover:bg-ensena-primary/10">
        <span className="font-medium text-ensena-ink">Discovery Session · 25 min</span>
        <span className="font-semibold text-ensena-primary">
          {t.discoveryEnabled ? (t.discoveryPrice ? `From ${formatNaira(t.discoveryPrice)}` : "Free") : `Ask ${t.name.split(" ")[0]}`}
        </span>
      </Link>

      <div className="flex items-center justify-between gap-3 border-t border-ensena-border pt-3.5">
        <p className="text-base font-semibold text-ensena-ink">
          {t.pricePerHour ? formatNaira(t.pricePerHour) : "—"}
          <span className="block text-xs font-normal text-ensena-muted">/ hour</span>
        </p>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium hover:bg-ensena-bg-soft" render={<Link href={profileHref} />}>
            View Profile
          </Button>
          {bookable ? (
            <Button nativeButton={false} className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-4 text-sm font-semibold text-white" render={<Link href={`${profileHref}/book`} />}>
              Book Instantly
            </Button>
          ) : (
            <Button disabled className="h-10 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white opacity-50">
              Book Instantly
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-ensena-muted">
        {experienceLabel(t.yearsExperience)} | Speaks {t.languages.join(", ") || "English"}
      </p>
    </article>
  );
}
