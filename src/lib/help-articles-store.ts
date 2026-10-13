// Real, persisted Help Center articles — localStorage-backed, same idiom as
// support-store.ts. Seeded with the initial article set (SEED_HELP_ARTICLES)
// so every Help Center has real content from first load; anything an admin
// creates, edits, publishes, or archives is layered on top through the same
// "legacy + real merge" pattern used elsewhere in this app, keyed by id so
// an edit to a seed article overrides it in place rather than duplicating it.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { SEED_HELP_ARTICLES, type HelpArticle, type HelpArticleAudience, type HelpArticleStatus } from "@/lib/help-articles-data";

const HELP_ARTICLES_KEY = "ensena_help_articles";
export const HELP_ARTICLES_EVENT = "ensena:help-articles-changed";

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

const EMPTY: HelpArticle[] = [];
const readRaw = makeCachedReader<HelpArticle[]>(HELP_ARTICLES_KEY, EMPTY);

function writeJson(value: HelpArticle[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HELP_ARTICLES_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(HELP_ARTICLES_EVENT));
}

// Cached on the real array's own (already-stable) reference so repeated
// calls between actual writes return the identical merged array instance —
// required for useSyncExternalStore (see use-help-articles.ts): a fresh
// array on every call, even with identical contents, causes React to think
// the store changed on every render and re-render in a loop.
let cachedReal: HelpArticle[] | null = null;
let cachedMerged: HelpArticle[] = SEED_HELP_ARTICLES;

function getMerged(): HelpArticle[] {
  const real = readRaw();
  if (real !== cachedReal) {
    cachedReal = real;
    const overridden = new Set(real.map((a) => a.id));
    cachedMerged = [...SEED_HELP_ARTICLES.filter((a) => !overridden.has(a.id)), ...real];
  }
  return cachedMerged;
}

export function getAllHelpArticles(): HelpArticle[] {
  return getMerged();
}

export function getHelpArticle(id: string): HelpArticle | undefined {
  return getMerged().find((a) => a.id === id);
}

export function getHelpArticleBySlug(slug: string): HelpArticle | undefined {
  return getMerged().find((a) => a.slug === slug);
}

// What a Help Center should actually render: published only, and scoped to
// the audience asking (plus anything filed under "All"). Admin's own list
// view calls getAllHelpArticles() directly so drafts/archived stay visible
// there.
//
// Cached per audience on the current getMerged() reference, not recomputed
// fresh every call — useSyncExternalStore (see use-help-articles.ts)
// requires a snapshot function to return the identical array reference when
// nothing has changed, or React treats every render as a store update and
// loops.
const publishedCache = new Map<HelpArticleAudience, { source: HelpArticle[]; result: HelpArticle[] }>();
export function getPublishedHelpArticles(audience: HelpArticleAudience): HelpArticle[] {
  const source = getMerged();
  const cached = publishedCache.get(audience);
  if (cached && cached.source === source) return cached.result;
  const result = source.filter((a) => a.status === "Published" && (a.audience === audience || a.audience === "All"));
  publishedCache.set(audience, { source, result });
  return result;
}

export function getPublishedHelpArticleBySlug(slug: string, audience: HelpArticleAudience): HelpArticle | undefined {
  return getPublishedHelpArticles(audience).find((a) => a.slug === slug);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueSlug(base: string, ignoreId?: string): string {
  const taken = new Set(getMerged().filter((a) => a.id !== ignoreId).map((a) => a.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export interface HelpArticleInput {
  title: string;
  category: string;
  audience: HelpArticleAudience;
  shortDescription: string;
  content: string[];
  author: string;
  featured?: boolean;
}

// Creates a new article as a Draft — publishing is a separate, explicit
// action (see publishHelpArticle) so a half-written article never appears
// live by accident.
export async function createHelpArticle(input: HelpArticleInput): Promise<HelpArticle> {
  const exists = (candidate: string) => getMerged().some((a) => a.id === candidate);
  const id = await generateUniqueReferenceCode("article", exists);
  const nowISO = new Date().toISOString();
  const created: HelpArticle = {
    id,
    slug: uniqueSlug(slugify(input.title)),
    title: input.title,
    category: input.category,
    audience: input.audience,
    shortDescription: input.shortDescription,
    content: input.content,
    author: input.author,
    featured: input.featured,
    status: "Draft",
    publishedAt: null,
    updatedAt: nowISO,
  };
  writeJson([...readRaw(), created]);
  return created;
}

// A seed article has no entry in real storage until an edit touches it —
// this materializes it there (with the patch applied) instead of silently
// dropping the mutation, so seed articles are just as editable as ones
// created through Admin.
function updateArticle(id: string, patch: Partial<HelpArticle>): void {
  const real = readRaw();
  const current = real.find((a) => a.id === id) ?? SEED_HELP_ARTICLES.find((a) => a.id === id);
  if (!current) return;
  const updated: HelpArticle = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const next = real.some((a) => a.id === id) ? real.map((a) => (a.id === id ? updated : a)) : [...real, updated];
  writeJson(next);
}

export function updateHelpArticleContent(id: string, input: HelpArticleInput): void {
  const current = getMerged().find((a) => a.id === id);
  if (!current) return;
  const slug = current.title === input.title ? current.slug : uniqueSlug(slugify(input.title), id);
  updateArticle(id, {
    title: input.title,
    slug,
    category: input.category,
    audience: input.audience,
    shortDescription: input.shortDescription,
    content: input.content,
    author: input.author,
    featured: input.featured,
  });
}

export function setHelpArticleStatus(id: string, status: HelpArticleStatus): void {
  const current = getMerged().find((a) => a.id === id);
  if (!current) return;
  const publishedAt = status === "Published" ? current.publishedAt ?? new Date().toISOString() : current.publishedAt;
  updateArticle(id, { status, publishedAt });
}

// Whether `id` belongs to one of the built-in seed articles — used by the
// admin UI to warn that "Delete" will archive rather than remove it (a seed
// article always exists in code, so it can never be truly deleted).
export function isSeedHelpArticle(id: string): boolean {
  return SEED_HELP_ARTICLES.some((a) => a.id === id);
}

export function deleteHelpArticle(id: string): void {
  // A seed article can be archived but never truly deleted (it always
  // exists in code) — Archived already removes it from every public Help
  // Center, which is the only user-visible effect deletion would have.
  if (SEED_HELP_ARTICLES.some((a) => a.id === id)) {
    setHelpArticleStatus(id, "Archived");
    return;
  }
  writeJson(readRaw().filter((a) => a.id !== id));
}

export function subscribeHelpArticles(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(HELP_ARTICLES_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(HELP_ARTICLES_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
