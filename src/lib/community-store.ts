// Real, persisted Community store — same makeCachedReader/writeJson+
// CustomEvent idiom as support-store.ts. Fully functional if ever called,
// but nothing in the live app calls it while community is off (see
// feature-flags.ts) — only the gated /community, /community/ask,
// /community/post/[id] and /admin/community routes read from it, and those
// routes render notFound()/the legacy page instead of mounting when the
// flag is off, so no fetch/read happens on any normal MVP page.
import { generateUniqueReferenceCode } from "@/lib/booking-reference";
import { dashboardStudent } from "@/lib/student-dashboard-data";
import { dashboardTutor } from "@/lib/tutor-dashboard-data";
import type { CommunityAttachment, CommunityAuthorRole, CommunityComment, CommunityContentStatus, CommunityPost, CommunityPostType } from "@/lib/community-data";

const POSTS_KEY = "ensena_community_posts";
const COMMENTS_KEY = "ensena_community_comments";
export const COMMUNITY_EVENT = "ensena:community-changed";

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

// Reference examples from the approved design spec (the "Learn together"
// mobile/desktop mockups) — kept as real seed content so activation shows
// a populated feed immediately, matching how every other Ensena list
// (bookings, group classes, payouts) is seeded rather than starting empty.
const SEED_POSTS: CommunityPost[] = [
  {
    id: "cmp-1",
    authorName: dashboardStudent.name,
    authorRole: "Student",
    title: "How do I solve simultaneous equations?",
    body: "I'm struggling with substitution and elimination. Can someone explain when I should use each method and maybe share an example?",
    type: "QUESTION",
    subject: "Mathematics",
    academicLevel: "Secondary",
    exam: "WAEC",
    createdAtISO: "2026-08-31T13:00:00.000Z",
    updatedAtISO: "2026-08-31T13:00:00.000Z",
    status: "Published",
    helpfulCount: 12,
    helpfulBy: [],
    commentCount: 6,
    savedBy: [],
    reportCount: 0,
  },
  {
    id: "cmp-2",
    authorName: dashboardTutor.name,
    authorRole: "Tutor",
    title: "3 things I recommend before your WAEC Mathematics exam",
    body: "Don't just practice questions. Make sure you understand the concepts deeply and know how to apply them. Here are three things every student should do before exam day.",
    type: "TUTOR_INSIGHT",
    subject: "Mathematics",
    exam: "WAEC",
    createdAtISO: "2026-08-31T10:00:00.000Z",
    updatedAtISO: "2026-08-31T10:00:00.000Z",
    status: "Published",
    helpfulCount: 24,
    helpfulBy: [],
    commentCount: 8,
    savedBy: [],
    reportCount: 0,
  },
  {
    id: "cmp-3",
    authorName: "Aisha Salisu",
    authorRole: "Student",
    title: "Can anyone recommend a good resource for Calculus?",
    body: "I'm in my first year and I find limits and derivatives really confusing. Any YouTube channels, notes or websites you recommend?",
    type: "RESOURCE",
    subject: "Mathematics",
    academicLevel: "Undergraduate",
    createdAtISO: "2026-08-30T15:00:00.000Z",
    updatedAtISO: "2026-08-30T15:00:00.000Z",
    status: "Published",
    helpfulCount: 5,
    helpfulBy: [],
    commentCount: 3,
    savedBy: [],
    reportCount: 0,
  },
];

const SEED_COMMENTS: CommunityComment[] = [];

const readPostsStored = makeCachedReader<CommunityPost[]>(POSTS_KEY, []);
const readCommentsStored = makeCachedReader<CommunityComment[]>(COMMENTS_KEY, []);

function writePosts(value: CommunityPost[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(POSTS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(COMMUNITY_EVENT));
}

function writeComments(value: CommunityComment[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(COMMUNITY_EVENT));
}

// Cached on the underlying stored reference so repeated calls between
// writes return the identical array instance (required for
// useSyncExternalStore — see the matching comment in support-store.ts).
let cachedStoredPosts: CommunityPost[] | null = null;
let cachedMergedPosts: CommunityPost[] = SEED_POSTS;
function getMergedPosts(): CommunityPost[] {
  const stored = readPostsStored();
  if (stored !== cachedStoredPosts) {
    cachedStoredPosts = stored;
    const overridden = new Set(stored.map((p) => p.id));
    cachedMergedPosts = [...SEED_POSTS.filter((p) => !overridden.has(p.id)), ...stored];
  }
  return cachedMergedPosts;
}

let cachedStoredComments: CommunityComment[] | null = null;
let cachedMergedComments: CommunityComment[] = SEED_COMMENTS;
function getMergedComments(): CommunityComment[] {
  const stored = readCommentsStored();
  if (stored !== cachedStoredComments) {
    cachedStoredComments = stored;
    const overridden = new Set(stored.map((c) => c.id));
    cachedMergedComments = [...SEED_COMMENTS.filter((c) => !overridden.has(c.id)), ...stored];
  }
  return cachedMergedComments;
}

export function getCommunityPosts(): CommunityPost[] {
  return getMergedPosts().filter((p) => p.status !== "Removed");
}

export function getCommunityPost(id: string): CommunityPost | undefined {
  return getMergedPosts().find((p) => p.id === id);
}

export function getCommentsForPost(postId: string): CommunityComment[] {
  return getMergedComments().filter((c) => c.postId === postId && c.status !== "Removed");
}

function updatePost(id: string, patch: Partial<CommunityPost>): void {
  const all = readPostsStored();
  const current = all.find((p) => p.id === id) ?? SEED_POSTS.find((p) => p.id === id);
  if (!current) return;
  const updated = { ...current, ...patch, updatedAtISO: new Date().toISOString() };
  const next = all.some((p) => p.id === id) ? all.map((p) => (p.id === id ? updated : p)) : [...all, updated];
  writePosts(next);
}

export async function createCommunityPost(input: {
  authorName: string;
  authorRole: CommunityAuthorRole;
  title: string;
  body: string;
  type: CommunityPostType;
  subject?: string;
  academicLevel?: string;
  exam?: string;
  attachments?: CommunityAttachment[];
}): Promise<CommunityPost> {
  const exists = (candidate: string) => getMergedPosts().some((p) => p.id === candidate);
  const id = await generateUniqueReferenceCode("community", exists);
  const nowISO = new Date().toISOString();
  const created: CommunityPost = {
    ...input,
    id,
    status: "Published",
    createdAtISO: nowISO,
    updatedAtISO: nowISO,
    helpfulCount: 0,
    helpfulBy: [],
    commentCount: 0,
    savedBy: [],
    reportCount: 0,
  };
  writePosts([...readPostsStored(), created]);
  return created;
}

export function addComment(input: {
  postId: string;
  parentCommentId?: string;
  authorName: string;
  authorRole: CommunityAuthorRole;
  body: string;
}): CommunityComment {
  const id = `${input.postId}-c${getMergedComments().filter((c) => c.postId === input.postId).length + 1}`;
  const comment: CommunityComment = {
    ...input,
    id,
    createdAtISO: new Date().toISOString(),
    helpfulCount: 0,
    helpfulBy: [],
    status: "Published",
  };
  writeComments([...readCommentsStored(), comment]);
  const post = getCommunityPost(input.postId);
  if (post) updatePost(input.postId, { commentCount: post.commentCount + 1 });
  return comment;
}

export function toggleHelpfulPost(id: string, userName: string): void {
  const post = getCommunityPost(id);
  if (!post) return;
  const already = post.helpfulBy.includes(userName);
  const helpfulBy = already ? post.helpfulBy.filter((n) => n !== userName) : [...post.helpfulBy, userName];
  updatePost(id, { helpfulBy, helpfulCount: helpfulBy.length });
}

export function toggleSavedPost(id: string, userName: string): void {
  const post = getCommunityPost(id);
  if (!post) return;
  const already = post.savedBy.includes(userName);
  const savedBy = already ? post.savedBy.filter((n) => n !== userName) : [...post.savedBy, userName];
  updatePost(id, { savedBy });
}

// Settable only by the post's own author (enforced by the caller, matching
// how e.g. group-class-review actions check ownership before calling the
// store) — ties the future "✓ Answered" badge to one specific comment.
export function markBestAnswer(postId: string, commentId: string | undefined): void {
  updatePost(postId, { bestAnswerCommentId: commentId });
}

export function reportContentCount(postId: string): void {
  const post = getCommunityPost(postId);
  if (!post) return;
  updatePost(postId, { reportCount: post.reportCount + 1 });
}

export function moderatePostStatus(id: string, status: CommunityContentStatus): void {
  updatePost(id, { status });
}

export function subscribeCommunity(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COMMUNITY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COMMUNITY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
