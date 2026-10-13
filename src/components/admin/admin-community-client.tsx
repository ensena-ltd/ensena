"use client";

import { useState } from "react";
import Link from "next/link";

import { useCommunityPosts } from "@/hooks/use-community-posts";
import { moderatePostStatus } from "@/lib/community-store";
import { cn } from "@/lib/utils";

const tabs = ["Overview", "Posts", "Reports", "Categories", "Members"] as const;
type Tab = (typeof tabs)[number];

// Prepared admin management for the future Community feature — not linked
// from admin-sidebar.tsx and not part of admin-permissions-data.ts's
// allSections while community is disabled (see feature-flags.ts), so it
// stays reachable only by an admin who already knows this exact URL, and
// the route itself 404s while the flag is off (see this component's
// page.tsx). Community Reports intentionally reuse the existing Reports &
// Issues queue (admin-reports-data.ts's "Community Post"/"Community
// Comment" types) rather than a second moderation system — this tab is
// just a Community-scoped view of that same data.
export function AdminCommunityClient() {
  const posts = useCommunityPosts();
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Community</h1>
        <p className="mt-1 text-sm text-ensena-muted">Prepared for the future Community feature. Currently disabled for every user (see feature-flags.ts).</p>
      </div>

      <div className="mt-5 flex gap-1 border-b border-ensena-border">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("border-b-2 px-3.5 py-2.5 text-sm font-medium", tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">Total Posts</p>
            <p className="mt-1 text-lg font-semibold text-ensena-ink">{posts.length}</p>
          </div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">Total Comments</p>
            <p className="mt-1 text-lg font-semibold text-ensena-ink">{posts.reduce((sum, p) => sum + p.commentCount, 0)}</p>
          </div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">Reported Posts</p>
            <p className="mt-1 text-lg font-semibold text-ensena-ink">{posts.filter((p) => p.reportCount > 0).length}</p>
          </div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <p className="text-xs text-ensena-muted">Answered Questions</p>
            <p className="mt-1 text-lg font-semibold text-ensena-ink">{posts.filter((p) => p.bestAnswerCommentId).length}</p>
          </div>
        </div>
      )}

      {tab === "Posts" && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                <th className="px-4 py-2.5 font-medium">Post</th>
                <th className="px-4 py-2.5 font-medium">Author</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Replies</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-ensena-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ensena-ink">{p.title}</td>
                  <td className="px-4 py-3 text-ensena-ink">{p.authorName}</td>
                  <td className="px-4 py-3 text-ensena-muted">{p.subject ?? p.type}</td>
                  <td className="px-4 py-3 text-ensena-muted">{p.commentCount}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", p.status === "Published" ? "bg-emerald-100 text-emerald-700" : p.status === "Flagged" ? "bg-amber-100 text-amber-700" : "bg-ensena-bg-soft text-ensena-muted")}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/community/post/${p.id}`} className="text-xs font-semibold text-ensena-primary hover:underline">View</Link>
                      {p.status !== "Removed" && (
                        <button type="button" onClick={() => moderatePostStatus(p.id, "Removed")} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "Reports" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="text-sm text-ensena-muted">
            Community reports flow into the existing <Link href="/admin/reports" className="font-semibold text-ensena-primary hover:underline">Reports &amp; Issues</Link> queue
            (types <code className="rounded bg-ensena-bg-soft px-1.5 py-0.5 text-xs">Community Post</code> / <code className="rounded bg-ensena-bg-soft px-1.5 py-0.5 text-xs">Community Comment</code>) rather than a separate moderation system.
          </p>
        </div>
      )}

      {tab === "Categories" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="text-sm text-ensena-muted">
            Categories map to existing post types (see community-data.ts&apos;s CATEGORY_TO_POST_TYPES) and reuse Ensena&apos;s existing subjects, academic levels and exams. There is no separate Community taxonomy to manage here.
          </p>
        </div>
      )}

      {tab === "Members" && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          <p className="text-sm text-ensena-muted">
            Community identity is a real Ensena account (student, tutor or admin). There are no separate Community member records to manage; use the existing <Link href="/admin/users" className="font-semibold text-ensena-primary hover:underline">Users</Link> section.
          </p>
        </div>
      )}
    </div>
  );
}
