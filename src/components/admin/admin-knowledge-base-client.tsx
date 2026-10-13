"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useHelpArticles } from "@/hooks/use-help-articles";
import { logAdminAction } from "@/lib/admin-audit-log";
import { currentActorLabel } from "@/lib/admin-session";
import type { HelpArticleAudience, HelpArticleStatus } from "@/lib/help-articles-data";
import { deleteHelpArticle, isSeedHelpArticle, setHelpArticleStatus } from "@/lib/help-articles-store";
import { cn } from "@/lib/utils";

const audienceFilters: (HelpArticleAudience | "All Audiences")[] = ["All Audiences", "Student", "Tutor", "Public", "All", "Admin"];
const statusTabs: (HelpArticleStatus | "All")[] = ["All", "Published", "Draft", "Archived"];

const statusStyles: Record<HelpArticleStatus, string> = {
  Published: "bg-emerald-100 text-emerald-700",
  Draft: "bg-amber-100 text-amber-700",
  Archived: "bg-ensena-bg-soft text-ensena-muted",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// The single Admin management surface for every article shown across the
// Public, Student, Tutor and (internal) Admin Help Centers — those pages
// all read published articles through help-articles-store.ts, so a change
// made here is what "Update once, reflect everywhere" actually means.
export function AdminKnowledgeBaseClient() {
  const router = useRouter();
  const articles = useHelpArticles();
  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<(typeof statusTabs)[number]>("All");
  const [audienceFilter, setAudienceFilter] = useState<(typeof audienceFilters)[number]>("All Audiences");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [toast, setToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  const categories = useMemo(() => ["All Categories", ...Array.from(new Set(articles.map((a) => a.category)))], [articles]);

  const filtered = articles.filter((a) => {
    const matchesStatus = statusTab === "All" || a.status === statusTab;
    const matchesAudience = audienceFilter === "All Audiences" || a.audience === audienceFilter;
    const matchesCategory = categoryFilter === "All Categories" || a.category === categoryFilter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || a.title.toLowerCase().includes(q) || a.shortDescription.toLowerCase().includes(q);
    return matchesStatus && matchesAudience && matchesCategory && matchesQuery;
  });

  function togglePublish(id: string, currentStatus: HelpArticleStatus, title: string) {
    const next: HelpArticleStatus = currentStatus === "Published" ? "Draft" : "Published";
    setHelpArticleStatus(id, next);
    logAdminAction(next === "Published" ? "Published article" : "Unpublished article", currentActorLabel(), title);
    flash(next === "Published" ? "Article published." : "Article unpublished. It's no longer visible publicly.");
  }

  function archive(id: string, title: string) {
    setHelpArticleStatus(id, "Archived");
    logAdminAction("Archived article", currentActorLabel(), title);
    flash("Article archived.");
  }

  function confirmDelete() {
    if (!confirmDeleteId) return;
    const article = articles.find((a) => a.id === confirmDeleteId);
    deleteHelpArticle(confirmDeleteId);
    logAdminAction("Deleted article", currentActorLabel(), article?.title ?? confirmDeleteId);
    flash(article && isSeedHelpArticle(article.id) ? "Article archived." : "Article deleted.");
    setConfirmDeleteId(null);
  }

  const deleteTarget = confirmDeleteId ? articles.find((a) => a.id === confirmDeleteId) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Knowledge Base</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage the articles shown across the Public, Student and Tutor Help Centers.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/admin/knowledge-base/new" />} className="h-10 shrink-0 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
          <Plus className="size-4" /> New Article
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
        {statusTabs.map((t) => (
          <button key={t} type="button" onClick={() => setStatusTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium transition-colors", statusTab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-4 text-sm"
          />
        </div>
        <select value={audienceFilter} onChange={(e) => setAudienceFilter(e.target.value as (typeof audienceFilters)[number])} className="h-10 rounded-full border border-ensena-border px-3.5 text-sm">
          {audienceFilters.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-full border border-ensena-border px-3.5 text-sm">
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-ensena-border text-xs text-ensena-muted">
              <th className="py-2.5 pl-4 pr-3 font-medium">Title</th>
              <th className="py-2.5 pr-3 font-medium">Audience</th>
              <th className="py-2.5 pr-3 font-medium">Category</th>
              <th className="py-2.5 pr-3 font-medium">Status</th>
              <th className="py-2.5 pr-3 font-medium">Last Updated</th>
              <th className="py-2.5 pr-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-ensena-border text-sm last:border-0 hover:bg-ensena-bg-soft">
                <td className="py-3 pl-4 pr-3">
                  <p className="font-medium text-ensena-ink">{a.title}{a.featured && <span className="ml-1.5 rounded-full bg-ensena-primary/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-primary align-middle">Featured</span>}</p>
                  <p className="mt-0.5 max-w-[360px] truncate text-xs text-ensena-muted">{a.shortDescription}</p>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{a.audience}</td>
                <td className="py-3 pr-3 text-ensena-muted">{a.category}</td>
                <td className="py-3 pr-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[a.status])}>{a.status}</span>
                </td>
                <td className="py-3 pr-3 text-ensena-muted">{formatDate(a.updatedAt)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    <button type="button" title="Preview" onClick={() => router.push(`/admin/knowledge-base/${a.id}/preview`)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink">
                      <Eye className="size-4" />
                    </button>
                    <button type="button" title="Edit" onClick={() => router.push(`/admin/knowledge-base/${a.id}`)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink">
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublish(a.id, a.status, a.title)}
                      disabled={a.status === "Archived"}
                      className="h-8 shrink-0 rounded-full border border-ensena-border px-3 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft disabled:opacity-40"
                    >
                      {a.status === "Published" ? "Unpublish" : "Publish"}
                    </button>
                    {a.status !== "Archived" && (
                      <button type="button" title="Archive" onClick={() => archive(a.id, a.title)} className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink">
                        <Archive className="size-4" />
                      </button>
                    )}
                    <button type="button" title="Delete" onClick={() => setConfirmDeleteId(a.id)} className="flex size-8 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-ensena-muted">No articles match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title={deleteTarget && isSeedHelpArticle(deleteTarget.id) ? "Archive this article?" : "Delete this article?"}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            {deleteTarget && isSeedHelpArticle(deleteTarget.id)
              ? "This is one of Ensena's built-in articles. It will be archived and hidden from every Help Center, but not permanently removed."
              : "This will permanently delete this article. This can't be undone."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmDelete} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
              {deleteTarget && isSeedHelpArticle(deleteTarget.id) ? "Archive" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
