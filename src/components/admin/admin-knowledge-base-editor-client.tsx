"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHelpArticles } from "@/hooks/use-help-articles";
import { logAdminAction } from "@/lib/admin-audit-log";
import { currentActorLabel } from "@/lib/admin-session";
import { HELP_ARTICLE_CATEGORIES, type HelpArticleAudience } from "@/lib/help-articles-data";
import { createHelpArticle, setHelpArticleStatus, updateHelpArticleContent, type HelpArticleInput } from "@/lib/help-articles-store";

const audiences: HelpArticleAudience[] = ["Student", "Tutor", "Public", "All", "Admin"];

// Create and Edit share this one form — the only difference is whether
// articleId is set. Content is entered as plain paragraphs separated by a
// blank line, matching how every seed article is already structured
// (help-articles-data.ts), and is split back into the same string[] shape
// on save.
export function AdminKnowledgeBaseEditorClient({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const articles = useHelpArticles();
  const existing = articleId ? articles.find((a) => a.id === articleId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState(existing?.category ?? HELP_ARTICLE_CATEGORIES[0]);
  const [audience, setAudience] = useState<HelpArticleAudience>(existing?.audience ?? "All");
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription ?? "");
  const [content, setContent] = useState(existing?.content.join("\n\n") ?? "");
  const [featured, setFeatured] = useState(existing?.featured ?? false);
  const [toast, setToast] = useState<string | null>(null);

  if (articleId && !existing) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This article could not be found.</p>
        <Link href="/admin/knowledge-base" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Knowledge Base</Link>
      </div>
    );
  }

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function buildInput(): HelpArticleInput | null {
    if (!title.trim() || !shortDescription.trim() || !content.trim()) {
      flash("Title, short description and content are all required.");
      return null;
    }
    return {
      title: title.trim(),
      category,
      audience,
      shortDescription: shortDescription.trim(),
      content: content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      author: existing?.author ?? currentActorLabel(),
      featured,
    };
  }

  async function saveDraft() {
    const input = buildInput();
    if (!input) return;
    if (existing) {
      updateHelpArticleContent(existing.id, input);
      logAdminAction("Updated article", currentActorLabel(), input.title);
      flash("Changes saved.");
    } else {
      const created = await createHelpArticle(input);
      logAdminAction("Created article", currentActorLabel(), input.title);
      router.push(`/admin/knowledge-base/${created.id}`);
    }
  }

  async function saveAndPublish() {
    const input = buildInput();
    if (!input) return;
    if (existing) {
      updateHelpArticleContent(existing.id, input);
      setHelpArticleStatus(existing.id, "Published");
      logAdminAction("Published article", currentActorLabel(), input.title);
      flash("Article published.");
    } else {
      const created = await createHelpArticle(input);
      setHelpArticleStatus(created.id, "Published");
      logAdminAction("Published article", currentActorLabel(), input.title);
      router.push(`/admin/knowledge-base/${created.id}`);
    }
  }

  return (
    <div>
      <Link href="/admin/knowledge-base" className="flex w-fit items-center gap-1.5 text-sm font-medium text-ensena-muted hover:text-ensena-primary">
        <ChevronLeft className="size-4" /> Back to Knowledge Base
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">{existing ? "Edit Article" : "New Article"}</h1>
          {existing && <p className="mt-1 text-sm text-ensena-muted">Status: <span className="font-semibold text-ensena-ink">{existing.status}</span></p>}
        </div>
        {existing && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/admin/knowledge-base/${existing.id}/preview`} />} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
            <Eye className="size-3.5" /> Preview
          </Button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 lg:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm lg:col-span-2">
          <span className="text-xs font-medium text-ensena-muted">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" placeholder="e.g. Finding and booking the right tutor" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Audience</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value as HelpArticleAudience)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
            {audiences.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Category</span>
          <input value={category} onChange={(e) => setCategory(e.target.value)} list="help-article-categories" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          <datalist id="help-article-categories">
            {HELP_ARTICLE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1.5 text-sm lg:col-span-2">
          <span className="text-xs font-medium text-ensena-muted">Short description</span>
          <input value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" placeholder="One sentence shown in Help Center article lists" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm lg:col-span-2">
          <span className="text-xs font-medium text-ensena-muted">Content (separate paragraphs with a blank line)</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} className="rounded-lg border border-ensena-border p-3 text-sm leading-relaxed" />
        </label>

        <label className="flex items-center gap-2 text-sm lg:col-span-2">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 rounded border-ensena-border" />
          <span className="text-ensena-ink">Featured</span>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Button variant="outline" onClick={saveDraft} className="h-10 rounded-full border-ensena-border px-5 text-sm font-medium">
          {existing ? "Save Changes" : "Save as Draft"}
        </Button>
        <Button onClick={saveAndPublish} className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
          {existing?.status === "Published" ? "Update" : "Publish"}
        </Button>
        {existing && existing.status === "Published" && (
          <Button
            variant="outline"
            onClick={() => {
              setHelpArticleStatus(existing.id, "Draft");
              logAdminAction("Unpublished article", currentActorLabel(), existing.title);
              flash("Article unpublished. It's no longer visible publicly.");
            }}
            className="h-10 rounded-full border-ensena-border px-5 text-sm font-medium"
          >
            Unpublish
          </Button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
