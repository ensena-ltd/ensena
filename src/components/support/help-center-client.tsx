"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Flag, LifeBuoy, Mail, MessageCircle, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { HelpArticle } from "@/lib/help-articles-data";
import { openBenny } from "@/lib/benny";
import { SUPPORT_EMAIL } from "@/lib/support-data";
import type { FaqItem } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

// One reusable Help Center — the tutor, student, public and admin Help
// Centers all render through this component with role-specific content
// passed in as props, rather than hand-duplicated pages. Structure (search,
// FAQ, Knowledge Base, support action cards) stays identical across roles;
// only the content and links change. Knowledge Base articles come from the
// shared help-articles-store (see use-help-articles.ts) rather than being
// hardcoded per role, so editing one in Admin updates every Help Center
// that shows it.
export function HelpCenterClient({
  faqItems,
  knowledgeBaseTitle,
  knowledgeBaseArticles,
  articleHrefFor,
  contactSupportHref,
  reportIssueHref,
  viewRequestsHref,
  highlightContext,
  highlightLabel,
  onClearHighlight,
  liveChat = true,
}: {
  faqItems: FaqItem[];
  knowledgeBaseTitle: string;
  knowledgeBaseArticles: HelpArticle[];
  articleHrefFor: (slug: string) => string;
  contactSupportHref: string;
  reportIssueHref: string;
  // Omitted for anonymous visitors — a Guest has no session to look up a
  // "my requests" list against (see the public Help Center's confirmation
  // page instead, which resolves a single request client-side by id).
  viewRequestsHref?: string;
  // Set when "Contact Support" was opened from a specific area (e.g. a
  // booking or payout page) rather than the dashboard in general — matches
  // FaqItem.tags so the most relevant questions surface first instead of
  // making the person re-scan the whole list.
  highlightContext?: string;
  highlightLabel?: string;
  onClearHighlight?: () => void;
  /** Show the "Chat with Benny" card (off for the staff-only Admin Help Center). */
  liveChat?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const orderedFaqs = highlightContext
    ? [...faqItems].sort((a, b) => (b.tags?.includes(highlightContext) ? 1 : 0) - (a.tags?.includes(highlightContext) ? 1 : 0))
    : faqItems;

  const q = query.trim().toLowerCase();
  const filteredFaqs = orderedFaqs.filter((f) => !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  const filteredArticles = knowledgeBaseArticles.filter(
    (a) => !q || a.title.toLowerCase().includes(q) || a.shortDescription.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
  );

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Help Center</h1>
        <p className="mt-1 text-sm text-ensena-muted">Find answers or get in touch with our support team.</p>
      </div>

      {highlightContext && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-ensena-primary/30 bg-ensena-primary/5 px-4 py-2.5 text-sm text-ensena-ink">
          <span>Showing help related to <span className="font-semibold">{highlightLabel ?? highlightContext}</span> first.</span>
          {onClearHighlight && (
            <button type="button" onClick={onClearHighlight} className="shrink-0 text-xs font-semibold text-ensena-primary hover:underline">
              Show all
            </button>
          )}
        </div>
      )}

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-ensena-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for help articles…"
          className="h-12 w-full rounded-full border border-ensena-border pl-11 pr-4 text-sm"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Frequently Asked Questions</h2>
            <div className="mt-3 flex flex-col divide-y divide-ensena-border">
              {filteredFaqs.map((f, i) => (
                <div key={f.question} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between text-left text-sm font-medium text-ensena-ink"
                  >
                    {f.question}
                    <ChevronDown className={cn("size-4 shrink-0 text-ensena-muted transition-transform", openFaq === i && "rotate-180")} />
                  </button>
                  {openFaq === i && <p className="mt-2 text-sm text-ensena-muted">{f.answer}</p>}
                </div>
              ))}
              {filteredFaqs.length === 0 && <p className="py-4 text-sm text-ensena-muted">No articles match your search.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-ensena-ink">
              <BookOpen className="size-4.5 text-ensena-primary" /> {knowledgeBaseTitle}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {filteredArticles.map((a) => (
                <li key={a.id}>
                  <Link href={articleHrefFor(a.slug)} className="text-left text-sm text-ensena-primary hover:underline">{a.title}</Link>
                </li>
              ))}
              {filteredArticles.length === 0 && <p className="py-2 text-sm text-ensena-muted">No articles match your search.</p>}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {liveChat && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
                <MessageCircle className="size-4 text-ensena-primary" /> Live Chat with Benny
              </h2>
              <p className="mt-1 text-xs text-ensena-muted">Send us a message and our support team replies right in the chat. You&apos;ll be notified if you&apos;ve left.</p>
              <Button onClick={openBenny} className="mt-2.5 h-9 w-full rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">
                Chat with Benny
              </Button>
            </div>
          )}

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <LifeBuoy className="size-4 text-ensena-primary" /> Submit a Ticket
            </h2>
            <p className="mt-1 text-xs text-ensena-muted">Tell us what you need help with. Our support team will reply here and by email.</p>
            <Button nativeButton={false} render={<Link href={contactSupportHref} />} className="mt-2.5 h-9 w-full rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-ensena-primary-hover">
              <Send className="size-3.5" /> Submit Ticket
            </Button>
          </div>

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <Flag className="size-4 text-rose-500" /> Report an Issue
            </h2>
            <p className="mt-1 text-xs text-ensena-muted">A page, button, video or upload not working? Report it and it goes straight to our team.</p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={reportIssueHref} />}
              className="mt-2.5 h-9 w-full rounded-full border-ensena-border text-xs font-medium"
            >
              Report Issue
            </Button>
          </div>

          {viewRequestsHref && (
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Your Support Requests</h2>
              <p className="mt-1 text-xs text-ensena-muted">View and reply to your open support conversations.</p>
              <Link href={viewRequestsHref} className="mt-2.5 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                View My Requests
              </Link>
            </div>
          )}

          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-ensena-ink">
              <Mail className="size-4 text-ensena-primary" /> Technical Support by Email
            </h2>
            <p className="mt-1 text-xs text-ensena-muted">Prefer email? Write to us and include your booking or ticket reference if you have one.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-2.5 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border text-xs font-semibold text-ensena-primary hover:bg-ensena-bg-soft">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}
