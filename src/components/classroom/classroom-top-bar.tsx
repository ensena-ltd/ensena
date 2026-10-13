"use client";

import { useState } from "react";
import { ChevronDown, Clock, LogOut, MoreVertical, Pencil, Settings, ShieldCheck, User, Users } from "lucide-react";

import { Logo } from "@/components/logo";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import type { PeerConnectionState } from "@/hooks/use-webrtc-peer";
import { cn } from "@/lib/utils";

function IdentityCard({ label, name, online }: { label: string; name: string; online: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ensena-border px-3 py-1.5">
      <User className="size-4 text-ensena-muted" />
      <div className="leading-tight">
        <p className="text-[10px] text-ensena-muted">{label}</p>
        <p className="text-xs font-semibold text-ensena-ink">{name}</p>
      </div>
      <span className={cn("size-2 rounded-full", online ? "bg-emerald-500" : "bg-ensena-muted/40")} />
    </div>
  );
}

// ONE responsive top bar for every breakpoint — desktop shows named
// Tutor/Student identity cards plus Lesson-time/Settings/Exit for a
// Private Class (the reference screens' own layout for a 1:1 room), while
// a Group Class falls back to a headcount + "Classroom is live" pair
// instead, since "who's who" doesn't fit the same two-card layout once
// there's more than one student.
export function ClassroomTopBar({
  role,
  session,
  timerLabel,
  peerConnectionState,
  connectedCount,
  sessionLabel,
  onEditLabel,
  onLeave,
  onMore,
  onOpenSettings,
  onOpenParticipants,
}: {
  role: ClassroomRole;
  session: ClassroomSession;
  timerLabel: string;
  /** Drives the identity cards' presence dots and the header's real connection state — the same RTCPeerConnection state the video view shows, not a decorative always-green icon. */
  peerConnectionState: PeerConnectionState;
  /** Group Class only — how many tiles are actually live in the video grid right now (self included), as distinct from session.participantCount (the static enrolled-seats number). Undefined for every other kind. */
  connectedCount?: number;
  sessionLabel: string;
  onEditLabel: (next: string) => void;
  onLeave: () => void;
  onMore?: () => void;
  onOpenSettings?: () => void;
  onOpenParticipants?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sessionLabel);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);

  const isOneToOne = session.kind !== "group";
  const isRealVideoSession = session.kind !== "group";
  const connected = peerConnectionState === "connected";
  const tutorOnline = role === "tutor" || connected;
  const studentOnline = role === "student" || connected;

  function commitEdit() {
    setEditing(false);
    onEditLabel(draft);
  }

  return (
    <header className="hidden h-auto min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-ensena-border bg-ensena-surface px-3 py-2 sm:h-16 sm:flex-nowrap sm:px-5 lg:flex">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Logo size={26} className="shrink-0" />
        <span className="hidden h-8 w-px shrink-0 bg-ensena-border sm:block" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ensena-ink">
            {session.subject}
            {session.topic && (
              <>
                <span className="mx-1.5 text-ensena-muted">{isOneToOne ? "•" : "—"}</span>
                {session.topic}
              </>
            )}
          </p>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => e.key === "Enter" && commitEdit()}
              className="h-5 w-full max-w-[240px] rounded border border-ensena-primary px-1 text-xs text-ensena-muted outline-none"
            />
          ) : (
            <button type="button" onClick={() => role === "tutor" && setEditing(true)} className="flex items-center gap-1 truncate text-xs text-ensena-muted">
              <span className="truncate">{sessionLabel}</span>
              {role === "tutor" && <Pencil className="size-2.5 shrink-0" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        {isOneToOne && (
          <div className="hidden items-center gap-1.5 lg:flex">
            <IdentityCard label="Tutor" name={session.tutorName} online={tutorOnline} />
            <IdentityCard label="Student" name={session.studentName ?? "Student"} online={studentOnline} />
          </div>
        )}
        {!isOneToOne && (
          <>
            <button
              type="button"
              onClick={onOpenParticipants}
              title={`${session.participantCount - 1} students enrolled`}
              className="hidden items-center gap-1.5 rounded-xl border border-ensena-border px-3 py-1.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft lg:flex"
            >
              <Users className="size-3.5" />
              {connectedCount !== undefined ? (
                <>
                  {connectedCount} Connected <span className="font-normal text-ensena-muted">· {session.participantCount - 1} Enrolled</span>
                </>
              ) : (
                <>{session.participantCount - 1} Students</>
              )}
              <ChevronDown className="size-3.5 text-ensena-muted" />
            </button>
            <span className="hidden items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 lg:flex">
              <ShieldCheck className="size-3.5" /> Classroom is live
            </span>
          </>
        )}

        <div className="relative hidden lg:block">
          <button
            type="button"
            onClick={() => setTimeMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-ensena-border px-3 py-1.5 text-left"
          >
            <Clock className="size-4 text-ensena-muted" />
            <span className="leading-tight">
              <span className="block text-[10px] text-ensena-muted">Lesson time</span>
              <span className="block font-mono text-xs font-bold text-ensena-ink">{timerLabel}</span>
            </span>
            <ChevronDown className="size-3.5 text-ensena-muted" />
          </button>
          {timeMenuOpen && (
            <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-ensena-border bg-ensena-surface p-3 text-xs shadow-lg">
              <p className="font-semibold text-ensena-ink">{session.durationLabel} session</p>
              <p className="mt-0.5 text-ensena-muted">Started at {session.time}</p>
              {isRealVideoSession && (
                <p className="mt-1.5 text-[11px] text-ensena-muted">{connected ? "Connection is stable." : peerConnectionState === "reconnecting" ? "Reconnecting…" : "Waiting to connect…"}</p>
              )}
            </div>
          )}
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden items-center gap-1.5 rounded-xl border border-ensena-border px-3 py-1.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft lg:flex"
          >
            <Settings className="size-3.5" /> Settings
          </button>
        )}

        <button
          onClick={onLeave}
          type="button"
          className="hidden items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 lg:flex"
        >
          <LogOut className="size-3.5" /> {role === "tutor" && !isOneToOne ? "End Class" : "Exit"}
        </button>

        {/* Mobile: compact people-count + stopwatch readout + kebab instead of the full card set above. */}
        {!isOneToOne && (
          <button
            type="button"
            onClick={onOpenParticipants}
            title={`${session.participantCount} enrolled (incl. tutor)`}
            className="flex items-center gap-1 text-xs font-semibold text-ensena-ink lg:hidden"
          >
            <Users className="size-4" /> {connectedCount ?? session.participantCount} <ChevronDown className="size-3 text-ensena-muted" />
          </button>
        )}
        <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 lg:hidden">
          <Clock className="size-4" /> {timerLabel}
        </span>
        {onMore && (
          <button type="button" aria-label="More options" onClick={onMore} className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft lg:hidden">
            <MoreVertical className="size-4.5" />
          </button>
        )}
      </div>
    </header>
  );
}
