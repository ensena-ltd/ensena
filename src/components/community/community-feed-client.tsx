"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Search, Share2, SlidersHorizontal } from "lucide-react";

import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { useCommunityPosts } from "@/hooks/use-community-posts";
import { CATEGORY_TO_POST_TYPES, type CommunityCategory, type CommunityPost } from "@/lib/community-data";
import { cn } from "@/lib/utils";

const categories: CommunityCategory[] = ["All", "Questions", "Study Tips", "Exams", "Subjects", "Career & Education", "Tutor Insights", "General"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function PostCard({ post, onNeedAuth }: { post: CommunityPost; onNeedAuth: (message: string) => void }) {
  const tags = [post.subject, post.academicLevel, post.exam].filter((t): t is string => Boolean(t));
  return (
    <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", post.authorRole === "Tutor" ? "bg-violet-500" : "bg-ensena-primary")}>
            {initials(post.authorName)}
          </span>
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-ensena-ink">
              {post.authorName}
              {post.authorRole === "Tutor" && <VerifiedTutorBadge tutorName={post.authorName} />}
            </p>
            <p className="text-xs text-ensena-muted">
              {post.authorRole === "Tutor" ? "Tutor" : "Student"}
              {post.academicLevel && post.authorRole === "Student" ? ` · ${post.academicLevel}` : post.subject ? ` · ${post.subject}` : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs text-ensena-muted">{timeAgo(post.createdAtISO)}</span>
      </div>

      <Link href={`/community/post/${post.id}`} className="mt-3 block">
        <p className="font-heading text-base font-semibold text-ensena-ink">{post.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-ensena-muted">{post.body}</p>
      </Link>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-5 text-sm text-ensena-muted">
        <button type="button" onClick={() => onNeedAuth("Sign in to mark this helpful")} className="flex items-center gap-1.5 hover:text-ensena-primary">
          <Heart className="size-4" /> Helpful {post.helpfulCount}
        </button>
        <Link href={`/community/post/${post.id}`} className="flex items-center gap-1.5 hover:text-ensena-ink">
          <MessageCircle className="size-4" /> {post.commentCount}
        </Link>
        <button type="button" onClick={() => onNeedAuth("Sign in to share this post")} className="flex items-center gap-1.5 hover:text-ensena-ink">
          <Share2 className="size-4" /> Share
        </button>
        <button type="button" onClick={() => onNeedAuth("Sign in to save this post")} className="ml-auto flex items-center gap-1.5 hover:text-ensena-ink">
          <Bookmark className="size-4" /> Save
        </button>
      </div>
    </div>
  );
}

// The future Community landing page (see feature-flags.ts's `community`
// flag) — reached at the existing /community URL only once activated;
// until then src/app/community/page.tsx keeps rendering the legacy
// CommunityClient instead. There's no real cross-page auth/session system
// on public pages anywhere in this app (the public Header doesn't track
// login state either), so every interactive action here reuses the same
// AuthPromptModal the rest of the public site already uses rather than
// inventing a new "am I logged in" check.
export function CommunityFeedClient() {
  const posts = useCommunityPosts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("All");
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = posts
    .filter((p) => category === "All" || CATEGORY_TO_POST_TYPES[category].includes(p.type))
    .filter((p) => !q || p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || (p.subject?.toLowerCase().includes(q) ?? false))
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));

  const topicCounts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of [p.subject, p.exam].filter((t): t is string => Boolean(t))) {
      topicCounts.set(tag, (topicCounts.get(tag) ?? 0) + 1);
    }
  }
  const popularTopics = Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const trending = [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, 3);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-ensena-ink">Community</h1>
      <p className="mt-1 text-ensena-muted">Learn together. Get help. Share knowledge.</p>
      <p className="mt-1 max-w-xl text-sm text-ensena-muted">Ask questions, share study tips and learn from students and tutors across Nigeria.</p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, topics or keywords…"
            className="h-12 w-full rounded-full border border-ensena-border pl-11 pr-4 text-sm"
          />
        </div>
        <Button onClick={() => setAuthPrompt("Sign in to ask a question")} className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
          Ask a Question
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              category === c ? "border-ensena-primary bg-ensena-primary text-white" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {c}
          </button>
        ))}
        <span className="ml-auto flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-muted">
          <SlidersHorizontal className="size-4" />
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} onNeedAuth={setAuthPrompt} />
          ))}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No discussions match your search yet.</p>}
        </div>

        <div className="hidden flex-col gap-5 lg:flex">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Popular Topics</h2>
            <ul className="mt-3 flex flex-col gap-2.5 text-sm">
              {popularTopics.map(([topic, count]) => (
                <li key={topic} className="flex items-center justify-between">
                  <span className="text-ensena-ink">{topic}</span>
                  <span className="text-xs text-ensena-muted">{count} discussion{count === 1 ? "" : "s"}</span>
                </li>
              ))}
              {popularTopics.length === 0 && <p className="text-xs text-ensena-muted">No topics yet.</p>}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Trending Discussions</h2>
            <ul className="mt-3 flex flex-col gap-3 text-sm">
              {trending.map((p) => (
                <li key={p.id}>
                  <Link href={`/community/post/${p.id}`} className="font-medium text-ensena-ink hover:text-ensena-primary">{p.title}</Link>
                  <p className="text-xs text-ensena-muted">{p.commentCount} replies · {p.subject ?? p.type}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-sm">
            <h2 className="font-heading text-sm font-semibold text-ensena-ink">Community Guidelines</h2>
            <p className="mt-1 text-xs text-ensena-muted">Be respectful, be helpful and keep every discussion academic.</p>
          </div>
        </div>
      </div>

      {authPrompt && <AuthPromptModal message={authPrompt} onClose={() => setAuthPrompt(null)} />}
    </div>
  );
}
