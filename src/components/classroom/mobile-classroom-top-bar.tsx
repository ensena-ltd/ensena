"use client";

import { useState } from "react";
import { Check, ChevronDown, Clock, MessageCircle, UserPlus } from "lucide-react";

import { Logo } from "@/components/logo";
import type { ClassroomSession } from "@/lib/classroom-data";
import { cn } from "@/lib/utils";

// Real invite flow, shared with the desktop Participants panel's own
// button — copies this exact classroom's URL rather than a fabricated
// invite-token system.
async function copyClassroomInviteLink(onDone: (copied: boolean) => void) {
  try {
    await navigator.clipboard.writeText(window.location.href);
    onDone(true);
  } catch {
    window.prompt("Copy this classroom link to invite someone:", window.location.href);
    onDone(false);
  }
}

function IconCircle({ onClick, badge, transparent, children, label }: { onClick: () => void; badge?: boolean; transparent: boolean; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-full",
        transparent ? "bg-black/35 text-white hover:bg-black/50" : "bg-ensena-bg-soft text-ensena-ink hover:bg-ensena-border"
      )}
    >
      {children}
      {badge && <span className="absolute right-1 top-1 size-2 rounded-full bg-ensena-primary" />}
    </button>
  );
}

// Private Class's mobile Video reference screen — a solid white bar with
// the full horizontal logo, a two-line lesson identity ("Subject • Topic" /
// the real editable session label), and a real elapsed-time dropdown
// (same duration/started-at facts the desktop header's own dropdown
// shows), rather than the transparent-over-video + Invite/Chat icon
// treatment every other mobile classroom screen uses.
function PrivateVideoTopBar({ session, sessionLabel, timerLabel }: { session: ClassroomSession; sessionLabel: string; timerLabel: string }) {
  const [timeOpen, setTimeOpen] = useState(false);

  return (
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-ensena-border bg-ensena-surface px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Logo horizontal size={22} className="shrink-0" />
        <span className="h-7 w-px shrink-0 bg-ensena-border" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold text-ensena-ink">
            {session.subject}
            {session.topic && (
              <>
                <span className="size-1 shrink-0 rounded-full bg-ensena-primary" />
                {session.topic}
              </>
            )}
          </p>
          <p className="truncate text-xs text-ensena-muted">{sessionLabel}</p>
        </div>
      </div>

      <div className="relative shrink-0">
        <button type="button" onClick={() => setTimeOpen((v) => !v)} className="flex items-center gap-1 text-ensena-ink">
          <Clock className="size-4 text-ensena-muted" />
          <span className="font-mono text-sm font-bold">{timerLabel}</span>
          <ChevronDown className="size-3.5 text-ensena-muted" />
        </button>
        {timeOpen && (
          <div className="absolute right-0 top-9 z-30 w-52 rounded-2xl border border-ensena-border bg-ensena-surface p-3 text-xs shadow-lg">
            <p className="font-semibold text-ensena-ink">{session.durationLabel} session</p>
            <p className="mt-0.5 text-ensena-muted">Started at {session.time}</p>
          </div>
        )}
      </div>
    </header>
  );
}

// The mobile-only Classroom header, distinct from the desktop ClassroomTopBar
// — matches the reference mobile screens' compact "logo + subject/kind +
// invite/chat" pattern rather than the desktop identity-card layout, which
// has no room on a phone. `transparent` is Group Class Video mode's look
// (no visible bar, blends into the dark video below it); every other mode
// (and Private Class Video, which gets its own solid-white reference
// screen — see PrivateVideoTopBar) keeps a real white bar like the rest of
// the app's mobile chrome.
export function MobileClassroomTopBar({
  session,
  transparent,
  isPrivateVideo = false,
  sessionLabel,
  onOpenChat,
  hasUnreadChat,
  timerLabel,
}: {
  session: ClassroomSession;
  transparent: boolean;
  /** Private Class's own Video reference screen — see PrivateVideoTopBar. */
  isPrivateVideo?: boolean;
  sessionLabel?: string;
  onOpenChat: () => void;
  hasUnreadChat: boolean;
  timerLabel: string;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const isGroup = session.kind === "group";

  if (isPrivateVideo) return <PrivateVideoTopBar session={session} sessionLabel={sessionLabel ?? session.subject} timerLabel={timerLabel} />;

  return (
    // "transparent" doesn't mean literal CSS transparency here — the header
    // sits in normal document flow directly above the (also near-black)
    // video stage, so using the exact same dark shade as that stage reads
    // as one continuous dark surface with no visible seam, without needing
    // this bar to be absolutely positioned over content it isn't part of.
    <header className={cn("relative z-20 flex shrink-0 items-center justify-between gap-2 px-3 py-2.5", transparent ? "bg-ensena-ink" : "border-b border-ensena-border bg-ensena-surface")}>
      <div className="relative flex min-w-0 items-center gap-1.5">
        <button type="button" onClick={() => setInfoOpen((v) => !v)} className="flex min-w-0 items-center gap-1.5">
          <Logo iconOnly size={26} className="shrink-0" />
          <ChevronDown className={cn("size-3.5 shrink-0", transparent ? "text-white/80" : "text-ensena-muted")} />
        </button>
        {infoOpen && (
          <div className="absolute left-0 top-10 z-30 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-3 text-xs shadow-lg">
            <p className="font-semibold text-ensena-ink">{session.subject}</p>
            <p className="mt-0.5 text-ensena-muted">{session.durationLabel} session · Started at {session.time}</p>
            <p className="mt-1.5 font-mono font-semibold text-ensena-primary">{timerLabel} remaining</p>
            <button
              type="button"
              onClick={() => copyClassroomInviteLink(setCopied)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-ensena-bg-soft px-3 py-1.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-border"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <UserPlus className="size-3.5" />}
              {copied ? "Link copied" : "Invite"}
            </button>
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-bold", transparent ? "text-white" : "text-ensena-ink")}>{session.subject}</p>
          <p className={cn("flex items-center gap-1 truncate text-xs", transparent ? "text-white/75" : "text-ensena-muted")}>
            {isGroup ? `Group Class • ${session.participantCount} Students` : "Private Class"}
            {!isGroup && <span className="size-1.5 rounded-full bg-emerald-500" />}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <IconCircle onClick={() => copyClassroomInviteLink(setCopied)} transparent={transparent} label="Invite">
          {copied ? <Check className="size-4" /> : <UserPlus className="size-4" />}
        </IconCircle>
        <IconCircle onClick={onOpenChat} badge={hasUnreadChat} transparent={transparent} label="Chat">
          <MessageCircle className="size-4" />
        </IconCircle>
      </div>
    </header>
  );
}
