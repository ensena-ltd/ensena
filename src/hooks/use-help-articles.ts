"use client";

import { useSyncExternalStore } from "react";

import { getAllHelpArticles, getPublishedHelpArticles, subscribeHelpArticles } from "@/lib/help-articles-store";
import type { HelpArticle, HelpArticleAudience } from "@/lib/help-articles-data";

// All articles, every status — for Admin's Knowledge Base list.
export function useHelpArticles(): HelpArticle[] {
  return useSyncExternalStore(subscribeHelpArticles, getAllHelpArticles, getAllHelpArticles);
}

// Published articles for one audience (plus "All") — for the actual Public,
// Student and Tutor Help Centers. getPublishedHelpArticles is re-called
// per audience, so each is memoized as its own stable snapshot function.
const publishedSnapshots = new Map<HelpArticleAudience, () => HelpArticle[]>();
function snapshotFor(audience: HelpArticleAudience): () => HelpArticle[] {
  let fn = publishedSnapshots.get(audience);
  if (!fn) {
    fn = () => getPublishedHelpArticles(audience);
    publishedSnapshots.set(audience, fn);
  }
  return fn;
}

export function usePublishedHelpArticles(audience: HelpArticleAudience): HelpArticle[] {
  const snapshot = snapshotFor(audience);
  return useSyncExternalStore(subscribeHelpArticles, snapshot, snapshot);
}
