"use client";

import { useSyncExternalStore } from "react";

import { getCommunityPosts, subscribeCommunity } from "@/lib/community-store";
import type { CommunityPost } from "@/lib/community-data";

// getCommunityPosts() returns a stable, cached reference on the server
// (window is undefined there) and whenever nothing has changed on the
// client — see the matching comment in use-support-requests.ts — so it
// doubles as the server snapshot directly.
export function useCommunityPosts(): CommunityPost[] {
  return useSyncExternalStore(subscribeCommunity, getCommunityPosts, getCommunityPosts);
}
