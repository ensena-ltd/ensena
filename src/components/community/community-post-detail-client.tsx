"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, Flag, Heart } from "lucide-react";

import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { Button } from "@/components/ui/button";
import { useCommunityPosts } from "@/hooks/use-community-posts";
import { addComment, markBestAnswer, reportContentCount, toggleHelpfulPost } from "@/lib/community-store";
import { createReport } from "@/lib/reports-store";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Real Enseña identity, not a Community-only account — see
// community-ask-client.tsx's matching note about the lack of a real
// cross-page session on public pages.
export function CommunityPostDetailClient({ id, viewerName, viewerRole }: { id: string; viewerName: string; viewerRole: "Student" | "Tutor" }) {
  const posts = useCommunityPosts();
  const post = posts.find((p) => p.id === id);
  const [reply, setReply] = useState("");

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-ensena-muted">This post could not be found.</p>
        <Link href="/community" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Community</Link>
      </div>
    );
  }

  const isAuthor = post.authorName === viewerName;
  const tags = [post.subject, post.academicLevel, post.exam].filter((t): t is string => Boolean(t));

  function handleReport() {
    createReport({
      type: "Community Post",
      reportedName: post!.authorName,
      reportedRole: post!.authorRole,
      reporterName: viewerName,
      reporterRole: viewerRole,
      reason: "Community post reported",
      description: `Reported post: "${post!.title}"`,
      priority: "Low",
      communityPostId: post!.id,
    });
    reportContentCount(post!.id);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/community" className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Community
      </Link>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex items-center gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white", post.authorRole === "Tutor" ? "bg-violet-500" : "bg-ensena-primary")}>
            {initials(post.authorName)}
          </span>
          <div>
            <p className="flex items-center gap-1 text-sm font-semibold text-ensena-ink">
              {post.authorName}
              {post.authorRole === "Tutor" && <VerifiedTutorBadge tutorName={post.authorName} />}
            </p>
            <p className="text-xs text-ensena-muted">{post.authorRole === "Tutor" ? "Tutor" : "Student"}{post.academicLevel ? ` · ${post.academicLevel}` : ""}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h1 className="font-heading text-xl font-semibold text-ensena-ink">{post.title}</h1>
          {post.bestAnswerCommentId && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" /> Answered
            </span>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ensena-ink">{post.body}</p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{t}</span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-5 border-t border-ensena-border pt-3 text-sm text-ensena-muted">
          <button type="button" onClick={() => toggleHelpfulPost(post!.id, viewerName)} className={cn("flex items-center gap-1.5", post.helpfulBy.includes(viewerName) ? "text-ensena-primary" : "hover:text-ensena-primary")}>
            <Heart className="size-4" /> Helpful {post.helpfulCount}
          </button>
          <button type="button" onClick={handleReport} className="ml-auto flex items-center gap-1.5 hover:text-rose-600">
            <Flag className="size-4" /> Report
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <h2 className="font-heading text-sm font-semibold text-ensena-ink">Comments</h2>
        <p className="mt-3 text-sm text-ensena-muted">
          Comments aren&apos;t part of this preview yet. See community-store.ts&apos;s addComment/markBestAnswer for the ready-to-use functions once Community is activated.
        </p>

        <div className="mt-4 flex items-end gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
            className="flex-1 rounded-xl border border-ensena-border p-2.5 text-sm outline-none focus-visible:border-ensena-primary"
          />
          <Button
            disabled={!reply.trim()}
            onClick={() => {
              addComment({ postId: post!.id, authorName: viewerName, authorRole: viewerRole, body: reply.trim() });
              setReply("");
            }}
            className="h-10 shrink-0 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            Post
          </Button>
        </div>

        {isAuthor && post.bestAnswerCommentId && (
          <button type="button" onClick={() => markBestAnswer(post!.id, undefined)} className="mt-3 text-xs font-semibold text-ensena-muted hover:text-ensena-ink">
            Clear Best Answer
          </button>
        )}
      </div>
    </div>
  );
}
