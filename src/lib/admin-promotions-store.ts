"use client";

// Real, persisted featured-placement state — localStorage-backed, same
// idiom as every other store in this app. Previously these were plain
// static arrays (admin-promotions-data.ts) that the Promotions page mutated
// only in its own local component state — meaning "Feature Tutor" from a
// tutor's own profile page had nothing real to write to, so it only ever
// showed a toast. This store is the one real place both the Promotions
// page and any per-tutor/per-class "Feature" action read and write, so the
// two surfaces can never disagree about what's actually featured.
import {
  featuredGroupClassSlots as seedFeaturedGroupClassSlots,
  featuredTutorSlots as seedFeaturedTutorSlots,
  type FeaturedGroupClassSlot,
  type FeaturedTutorSlot,
} from "@/lib/admin-promotions-data";

const TUTORS_KEY = "ensena_featured_tutors";
const CLASSES_KEY = "ensena_featured_group_classes";
export const FEATURED_EVENT = "ensena:featured-placements-changed";

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const readTutorsRaw = makeCachedReader<FeaturedTutorSlot[]>(TUTORS_KEY, seedFeaturedTutorSlots);
const readClassesRaw = makeCachedReader<FeaturedGroupClassSlot[]>(CLASSES_KEY, seedFeaturedGroupClassSlots);

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(FEATURED_EVENT));
}

export function getFeaturedTutors(): FeaturedTutorSlot[] {
  return readTutorsRaw();
}

export function getFeaturedGroupClasses(): FeaturedGroupClassSlot[] {
  return readClassesRaw();
}

const DEFAULT_FEATURE_DAYS = 30;
function defaultFeaturedUntilLabel(): string {
  const d = new Date();
  d.setDate(d.getDate() + DEFAULT_FEATURE_DAYS);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function featureTutor(input: { id: string; name: string; subject: string; rating: number; image: string }): void {
  const current = readTutorsRaw();
  if (current.some((t) => t.id === input.id)) return;
  writeJson(TUTORS_KEY, [...current, { ...input, featuredUntil: defaultFeaturedUntilLabel() }]);
}

export function unfeatureTutor(id: string): void {
  writeJson(TUTORS_KEY, readTutorsRaw().filter((t) => t.id !== id));
}

export function isTutorFeatured(id: string): boolean {
  return readTutorsRaw().some((t) => t.id === id);
}

export function featureGroupClass(input: { id: string; title: string; tutor: string; seatsFilled: number; seatsTotal: number }): void {
  const current = readClassesRaw();
  if (current.some((c) => c.id === input.id)) return;
  writeJson(CLASSES_KEY, [...current, { ...input, featuredUntil: defaultFeaturedUntilLabel() }]);
}

export function unfeatureGroupClass(id: string): void {
  writeJson(CLASSES_KEY, readClassesRaw().filter((c) => c.id !== id));
}

export function isGroupClassFeatured(id: string): boolean {
  return readClassesRaw().some((c) => c.id === id);
}

export function subscribeFeaturedPlacements(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(FEATURED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(FEATURED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
