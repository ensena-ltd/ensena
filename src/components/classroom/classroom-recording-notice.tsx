"use client";

import { useState, useSyncExternalStore } from "react";
import { Info, X } from "lucide-react";

// No-op subscribe — sessionStorage's own value never changes from outside
// this tab while the page is open, so there's nothing to react to beyond
// the one-time SSR-to-client correction useSyncExternalStore already
// provides; `dismiss()` below drives its own re-render via plain state.
function subscribe(): () => void {
  return () => {};
}

// The classroom page IS server-rendered with real session data (see
// TutorPrivateClassroomPage/StudentPrivateClassroomPage — synchronous
// server components, not client-only), so this notice genuinely goes
// through hydration. Reading sessionStorage in a lazy useState initializer
// (the previous approach) makes the CLIENT's first render disagree with
// what the SERVER rendered (always "not dismissed" server-side, since
// sessionStorage doesn't exist there) — a real hydration mismatch, which
// React recovers from by discarding and remounting the whole subtree,
// double-firing every descendant's effects (this is what caused the
// classroom chat's live messages to arrive twice — see
// use-classroom-chat.ts). useSyncExternalStore's getServerSnapshot is the
// sanctioned way to say "the server's answer is always X, then correct to
// the client's real answer in a single clean post-hydration render," with
// no mismatch and no effect+setState.
function getServerSnapshot(): boolean {
  return true;
}

function getClientSnapshot(storageKey: string): boolean {
  try {
    return Boolean(window.sessionStorage.getItem(storageKey));
  } catch {
    return false;
  }
}

// Attendance (join/leave timestamps) is already recorded silently for every
// classroom visit (class-attendance-store.ts, wired in classroom-shell.tsx)
// — this notice is what makes that existing collection properly disclosed,
// per "don't silently record users without disclosure." Shown once per real
// visit (sessionStorage, not localStorage — a genuinely new tab/session
// sees it again), auto-dismissible, and positioned as a toast so it can
// never block a control the way a persistent top banner could in this
// already-dense classroom UI.
export function ClassroomRecordingNotice({ classroomId }: { classroomId: string }) {
  const storageKey = `ensena_classroom_notice_seen:${classroomId}`;
  const previouslyDismissed = useSyncExternalStore(subscribe, () => getClientSnapshot(storageKey), getServerSnapshot);
  const [justDismissed, setJustDismissed] = useState(false);
  const dismissed = previouslyDismissed || justDismissed;

  function dismiss() {
    setJustDismissed(true);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // best-effort only — not seeing this again on a later reload isn't critical
    }
  }

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-4 top-20 z-[70] mx-auto max-w-sm rounded-2xl border border-ensena-border bg-ensena-surface p-3.5 shadow-xl sm:inset-x-auto sm:right-6">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
        <p className="flex-1 text-xs text-ensena-ink">
          This session&apos;s attendance and activity may be reviewed by Enseña for safety, quality, and dispute-resolution purposes.
        </p>
        <button type="button" aria-label="Dismiss" onClick={dismiss} className="shrink-0 text-ensena-muted hover:text-ensena-ink">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
