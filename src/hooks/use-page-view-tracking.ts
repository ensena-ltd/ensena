"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { recordPageView, type DeviceType } from "@/lib/page-analytics-store";

const VISITOR_ID_KEY = "ensena_visitor_id";
const SESSION_ID_KEY = "ensena_session_id";

// A real, persisted anonymous visitor id (localStorage — survives across
// visits/tabs) and a real per-tab session id (sessionStorage — resets when
// the tab/browser closes), matching the spec's "session/visitor id" field.
// Neither is tied to login — an anonymous visitor still gets a stable id, so
// "Visitors" genuinely includes them.
function getOrCreateId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  storage.setItem(key, id);
  return id;
}

function detectDevice(): DeviceType {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  if (/iPad/i.test(ua) || (/Tablet/i.test(ua) && !/Mobile/i.test(ua)) || (width >= 768 && width < 1024 && /Mobi|Android/i.test(ua))) return "Tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua) || width < 768) return "Mobile";
  return "Desktop";
}

// The one, documented page-view rule for the whole app: exactly one event
// per real client-side navigation to a NEW pathname. `usePathname()` only
// changes on a genuine route change (never on a re-render, a remount of this
// same route, or a query-string-only change), and the `lastTracked` ref
// guard additionally absorbs React StrictMode's dev-only double-invocation
// of effects on mount — without it, local dev would double-count every
// first page load. Revisiting the same path via a later, separate
// navigation (A → B → A) is deliberately still counted again: each real
// navigation is its own view, which is standard page-view semantics.
export function usePageViewTracking(): void {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTracked.current === pathname) return;
    lastTracked.current = pathname;
    try {
      const visitorId = getOrCreateId(window.localStorage, VISITOR_ID_KEY);
      const sessionId = getOrCreateId(window.sessionStorage, SESSION_ID_KEY);
      recordPageView({ path: pathname, device: detectDevice(), visitorId, sessionId });
    } catch {
      // Tracking must never break the page it instruments — a private-
      // browsing storage exception or similar is silently swallowed.
    }
  }, [pathname]);
}
