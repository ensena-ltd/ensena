// No real backend/session exists in this app (see demo-auth.ts), so saved
// teachers and recently-viewed teachers are tracked in localStorage, per
// visitor/browser — same idiom as discovery-sessions-data.ts's
// hasCompletedFreeDiscovery/markFreeDiscoveryCompleted. A CustomEvent is
// dispatched on every mutation so multiple mounted components (e.g. several
// TeacherCard heart buttons for the same tutor) stay in sync via
// useSyncExternalStore.
//
// Each getter below caches its parsed result keyed off the raw localStorage
// string, so it returns the *same* array reference until the underlying
// value actually changes — required for useSyncExternalStore, which expects
// getSnapshot to be cheap and stable (a fresh array on every call would
// trigger React's "getSnapshot should be cached" infinite-loop guard).
const SAVED_KEY = "ensena_saved_tutors";
const RECENTLY_VIEWED_KEY = "ensena_recently_viewed_tutors";
const RECENTLY_VIEWED_LIMIT = 20;

export const SAVED_TUTORS_EVENT = "ensena:saved-tutors-changed";
export const RECENTLY_VIEWED_EVENT = "ensena:recently-viewed-changed";

export const EMPTY_SLUGS: string[] = [];

function parseSlugList(raw: string | null): string[] {
  if (!raw) return EMPTY_SLUGS;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : EMPTY_SLUGS;
  } catch {
    return EMPTY_SLUGS;
  }
}

function makeCachedReader(key: string) {
  let cachedRaw: string | null = null;
  let cachedParsed: string[] = EMPTY_SLUGS;
  return (): string[] => {
    if (typeof window === "undefined") return EMPTY_SLUGS;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = parseSlugList(raw);
    }
    return cachedParsed;
  };
}

const readSaved = makeCachedReader(SAVED_KEY);
const readRecentlyViewed = makeCachedReader(RECENTLY_VIEWED_KEY);

function writeSlugList(key: string, slugs: string[], eventName: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(slugs));
  window.dispatchEvent(new CustomEvent(eventName));
}

export function getSavedTutorSlugs(): string[] {
  return readSaved();
}

export function isTutorSaved(slug: string): boolean {
  return readSaved().includes(slug);
}

export function toggleSavedTutor(slug: string): boolean {
  const current = readSaved();
  const isSaved = current.includes(slug);
  const next = isSaved ? current.filter((s) => s !== slug) : [slug, ...current];
  writeSlugList(SAVED_KEY, next, SAVED_TUTORS_EVENT);
  return !isSaved;
}

export function getRecentlyViewedSlugs(limit = RECENTLY_VIEWED_LIMIT): string[] {
  const all = readRecentlyViewed();
  return limit >= all.length ? all : all.slice(0, limit);
}

export function recordTutorViewed(slug: string): void {
  const current = readRecentlyViewed();
  const next = [slug, ...current.filter((s) => s !== slug)].slice(0, RECENTLY_VIEWED_LIMIT);
  writeSlugList(RECENTLY_VIEWED_KEY, next, RECENTLY_VIEWED_EVENT);
}
