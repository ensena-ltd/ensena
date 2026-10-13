"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Heart, MapPin, Search, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setTutorSaved } from "@/lib/actions/student-profile";
import { formatNaira } from "@/lib/format";
import type { TutorDirectoryEntry } from "@/lib/tutor-directory-server";
import { cn } from "@/lib/utils";

import { PersonAvatar } from "./live-shared";

const ALL = "All";
const SORTS = ["Best match", "Highest rated", "Lowest price", "Highest price"] as const;
type Sort = (typeof SORTS)[number];
const PRICE_BANDS = [
  { label: "Any price", max: Infinity },
  { label: "Up to ₦2,500 / hr", max: 2500 },
  { label: "Up to ₦5,000 / hr", max: 5000 },
  { label: "Up to ₦10,000 / hr", max: 10000 },
];

const norm = (s: string) => s.toLowerCase();

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border text-sm" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Real, approved tutors from Supabase — searched and filtered in the browser. */
export function FindATutorReal({ tutors, savedIds, studentSubjects }: { tutors: TutorDirectoryEntry[]; savedIds: string[]; studentSubjects: string[] }) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [subject, setSubject] = useState(ALL);
  const [level, setLevel] = useState(ALL);
  const [price, setPrice] = useState(PRICE_BANDS[0].label);
  const [sort, setSort] = useState<Sort>("Best match");

  const subjectOptions = useMemo(() => [ALL, ...[...new Set(tutors.flatMap((t) => t.subjects))].sort()], [tutors]);
  const levelOptions = useMemo(() => [ALL, ...[...new Set(tutors.flatMap((t) => t.levels))].sort()], [tutors]);
  const wanted = useMemo(() => studentSubjects.map(norm), [studentSubjects]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const max = PRICE_BANDS.find((b) => b.label === price)?.max ?? Infinity;
    const matchScore = (t: TutorDirectoryEntry) => t.subjects.filter((s) => wanted.some((w) => norm(s).includes(w) || w.includes(norm(s)))).length;
    return tutors
      .filter((t) => {
        if (q && ![t.name, t.headline, t.bio, ...t.subjects, ...t.exams].some((f) => norm(f).includes(q))) return false;
        if (subject !== ALL && !t.subjects.includes(subject)) return false;
        if (level !== ALL && !t.levels.includes(level)) return false;
        if (max !== Infinity && (t.pricePerHour === null || t.pricePerHour > max)) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "Highest rated":
            return (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount;
          case "Lowest price":
            return (a.pricePerHour ?? Infinity) - (b.pricePerHour ?? Infinity);
          case "Highest price":
            return (b.pricePerHour ?? 0) - (a.pricePerHour ?? 0);
          default:
            return matchScore(b) - matchScore(a) || (b.rating ?? 0) - (a.rating ?? 0);
        }
      });
  }, [tutors, query, subject, level, price, sort, wanted]);

  const filtersActive = query || subject !== ALL || level !== ALL || price !== PRICE_BANDS[0].label;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Find a Tutor</h1>
      <p className="mt-1 text-sm text-ensena-muted">Every tutor here has been verified by Ensena. Book a 1-on-1 lesson at a time that suits you.</p>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-4">
        <label className="flex h-11 items-center gap-2.5 rounded-xl border border-ensena-border px-3.5">
          <Search className="size-4 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject, exam or tutor name"
            aria-label="Search tutors"
            className="h-full flex-1 bg-transparent text-sm text-ensena-ink outline-none placeholder:text-ensena-muted"
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <FieldSelect label="Subject" value={subject} options={subjectOptions} onChange={setSubject} />
          <FieldSelect label="Level" value={level} options={levelOptions} onChange={setLevel} />
          <FieldSelect label="Price" value={price} options={PRICE_BANDS.map((b) => b.label)} onChange={setPrice} />
          <FieldSelect label="Sort" value={sort} options={[...SORTS]} onChange={(v) => setSort(v as Sort)} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm text-ensena-muted">
          {results.length} {results.length === 1 ? "tutor" : "tutors"}
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSubject(ALL);
              setLevel(ALL);
              setPrice(PRICE_BANDS[0].label);
            }}
            className="text-sm font-semibold text-ensena-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-ensena-border p-10 text-center text-sm text-ensena-muted">
          {tutors.length === 0 ? "No tutors are available to book yet. New tutors are being verified, so check back soon." : "No tutors match those filters. Try a broader search."}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((t) => (
            <TutorCard key={t.id} tutor={t} initiallySaved={savedIds.includes(t.id)} highlight={wanted} />
          ))}
        </div>
      )}
    </div>
  );
}

function TutorCard({ tutor: t, initiallySaved, highlight }: { tutor: TutorDirectoryEntry; initiallySaved: boolean; highlight: string[] }) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();
  const profileHref = `/student-dashboard/tutors/${t.id}`;

  function toggleSaved() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await setTutorSaved(t.id, next);
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.message ?? "Couldn't update your saved tutors.");
      } else {
        toast.success(next ? `${t.name} saved.` : `${t.name} removed from saved tutors.`);
      }
    });
  }

  const isMatch = (s: string) => highlight.some((w) => norm(s).includes(w) || w.includes(norm(s)));
  const subjects = [...t.subjects].sort((a, b) => Number(isMatch(b)) - Number(isMatch(a)));

  return (
    <article className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-start gap-3">
        <Link href={profileHref}>
          <PersonAvatar name={t.name} image={t.image} className="size-14" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={profileHref} className="flex items-center gap-1 font-semibold text-ensena-ink hover:underline">
            {t.name} <BadgeCheck className="size-4 text-ensena-primary" aria-label="Verified tutor" />
          </Link>
          <p className="line-clamp-2 text-xs text-ensena-muted">{t.headline || subjects.slice(0, 3).join(", ")}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ensena-muted">
            <span className="flex items-center gap-1 text-ensena-ink">
              <Star className="size-3.5 fill-amber-400 text-amber-400" /> {t.rating !== null ? `${t.rating} (${t.reviewCount})` : "New tutor"}
            </span>
            {t.country && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {t.country}
              </span>
            )}
          </p>
        </div>
        <button type="button" aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save tutor"} disabled={pending} onClick={toggleSaved} className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-ensena-bg-soft">
          <Heart className={cn("size-4", saved ? "fill-rose-500 text-rose-500" : "text-ensena-muted")} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {subjects.slice(0, 5).map((s) => (
          <span key={s} className={cn("rounded-full px-2.5 py-1 text-xs font-medium", isMatch(s) ? "bg-ensena-primary/10 text-ensena-primary" : "bg-ensena-bg-soft text-ensena-ink")}>
            {s}
          </span>
        ))}
        {subjects.length > 5 && <span className="px-1 py-1 text-xs text-ensena-muted">+{subjects.length - 5}</span>}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <span className="text-sm font-semibold text-ensena-ink">{t.pricePerHour ? `${formatNaira(t.pricePerHour)}/hr` : "Price on request"}</span>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={profileHref} />} className="h-9 rounded-full border-ensena-border px-3.5 text-xs font-semibold">
            View Profile
          </Button>
          {t.pricePerHour && (
            <Button nativeButton={false} render={<Link href={`${profileHref}/book`} />} className="h-9 rounded-full bg-ensena-primary px-3.5 text-xs font-semibold text-white">
              Book
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
