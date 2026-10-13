"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

// Signs a person out after 15 minutes without touching Ensena, with a
// one-minute warning first. "Last activity" is shared between every open
// tab through localStorage, so working in one tab keeps the others signed
// in, and the warning disappears everywhere as soon as they're active again.
// Live classrooms count as active the whole time — watching a lesson
// without clicking must never log anyone out mid-class.

const IDLE_LIMIT_MS = 15 * 60_000;
const WARNING_MS = 60_000;
const STORAGE_KEY = "ensena_last_activity";
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

function readLastActivity(): number {
  try {
    return Number(window.localStorage.getItem(STORAGE_KEY)) || Date.now();
  } catch {
    return Date.now();
  }
}

function writeLastActivity(at: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(at));
  } catch {
    // Storage blocked — this tab still tracks its own activity.
  }
}

export function IdleSessionGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActivity = useRef(0);
  const loggingOut = useRef(false);
  const inClassroom = pathname.includes("/classroom") || pathname.includes("classroom-");

  // Only runs for a real signed-in Supabase session.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    loggingOut.current = false;
    lastActivity.current = Date.now();
    writeLastActivity(lastActivity.current);

    let lastWrite = 0;
    function markActive() {
      const now = Date.now();
      lastActivity.current = now;
      // Throttle storage writes; reading is cheap.
      if (now - lastWrite > 5_000) {
        lastWrite = now;
        writeLastActivity(now);
      }
    }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) lastActivity.current = Math.max(lastActivity.current, Number(e.newValue) || 0);
    }

    function check() {
      if (loggingOut.current) return;
      if (inClassroom) markActive();
      const last = Math.max(lastActivity.current, readLastActivity());
      const idleFor = Date.now() - last;
      if (idleFor >= IDLE_LIMIT_MS) {
        loggingOut.current = true;
        setSecondsLeft(null);
        router.replace("/logout?reason=idle");
        return;
      }
      setSecondsLeft(idleFor >= IDLE_LIMIT_MS - WARNING_MS ? Math.ceil((IDLE_LIMIT_MS - idleFor) / 1000) : null);
    }

    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, markActive, { passive: true });
    window.addEventListener("storage", onStorage);
    // Coming back to a tab that slept past the limit logs out straight away.
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 1_000);
    return () => {
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, markActive);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [signedIn, inClassroom, router]);

  if (!signedIn || secondsLeft === null) return null;

  function stay() {
    const now = Date.now();
    lastActivity.current = now;
    writeLastActivity(now);
    setSecondsLeft(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-desc">
      <div className="w-full max-w-sm rounded-3xl border border-ensena-border bg-ensena-surface p-6 text-center shadow-xl">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock className="size-6" />
        </span>
        <h2 id="idle-title" className="mt-3 font-heading text-lg font-semibold text-ensena-ink">Are you still there?</h2>
        <p id="idle-desc" className="mt-1.5 text-sm text-ensena-muted">
          For your security, you&apos;ll be logged out in <span className="font-semibold text-ensena-ink" aria-live="polite">{secondsLeft}s</span> because you haven&apos;t used Ensena for a while.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" autoFocus onClick={stay} className="h-11 rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
            Stay logged in
          </button>
          <button type="button" onClick={() => router.replace("/logout")} className="h-10 rounded-full text-sm font-medium text-ensena-muted hover:text-ensena-ink">
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}
