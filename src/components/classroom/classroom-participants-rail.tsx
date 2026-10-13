import Image from "next/image";
import { useState } from "react";
import { Check, Hand, Mic, MicOff, UserPlus, Volume2, VideoOff } from "lucide-react";

import type { ClassroomParticipantView, ClassroomRole } from "@/lib/classroom-data";
import { initials } from "@/components/classroom/classroom-utils";
import { cn } from "@/lib/utils";

function Avatar({ participant }: { participant: ClassroomParticipantView }) {
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-ensena-primary/20">
      {participant.image ? (
        <Image src={participant.image} alt={participant.name} fill sizes="36px" className="object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center text-xs font-semibold text-ensena-primary">{initials(participant.name)}</span>
      )}
    </div>
  );
}

// Real invite flow: copies this exact classroom's own URL — the tutor's
// browser bar right now — rather than fabricating a separate invite-token
// system. Anyone the tutor sends it to still goes through Ensena's normal
// auth/enrollment to actually get in; this just saves retyping the link.
function InviteStudentCard() {
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this classroom link to invite a student:", window.location.href);
    }
  }

  return (
    <button
      type="button"
      onClick={handleInvite}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/20 p-2.5 text-center text-white/70 hover:border-white/40 hover:text-white"
    >
      {copied ? <Check className="size-5 text-emerald-400" /> : <UserPlus className="size-5" />}
      <span className="text-xs font-medium">{copied ? "Link copied" : "Invite Student"}</span>
    </button>
  );
}

// The Group Class Whiteboard reference screen's student cell — a small
// square avatar with an overlapping mic badge and the name printed below,
// arranged in a grid rather than a row. A raised hand is real, synced
// presence (see use-hand-raise.ts) — a subtle brand-color ring plus a
// tutor-clickable acknowledge badge, not a decorative always-on icon.
function StudentCard({
  participant,
  canModerate,
  onToggleMute,
  onLowerHand,
}: {
  participant: ClassroomParticipantView;
  canModerate: boolean;
  onToggleMute?: (id: string) => void;
  onLowerHand?: (name: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="relative">
        <Avatar participant={participant} />
        {participant.handRaised && (
          <button
            type="button"
            onClick={() => onLowerHand?.(participant.name)}
            aria-label={canModerate ? `Lower ${participant.name}'s hand` : `${participant.name} raised their hand`}
            disabled={!canModerate}
            className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-neutral-900 bg-ensena-primary text-white"
          >
            <Hand className="size-2.5" />
          </button>
        )}
        {canModerate && onToggleMute ? (
          <button
            type="button"
            onClick={() => onToggleMute(participant.id)}
            aria-label={participant.micOn ? `Mute ${participant.name}` : `Unmute ${participant.name}`}
            className={cn(
              "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-neutral-900",
              participant.micOn ? "bg-emerald-500" : "bg-rose-500"
            )}
          >
            {participant.micOn ? <Mic className="size-2.5 text-white" /> : <MicOff className="size-2.5 text-white" />}
          </button>
        ) : (
          <span className={cn("absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-neutral-900", participant.micOn ? "bg-emerald-500" : "bg-rose-500")}>
            {participant.micOn ? <Mic className="size-2.5 text-white" /> : <MicOff className="size-2.5 text-white" />}
          </span>
        )}
      </div>
      <p className="w-full truncate text-xs font-medium text-white">
        {participant.name}
        {participant.isSelf && <span className="text-white/40"> (You)</span>}
      </p>
    </div>
  );
}

// A single row — same visual treatment for the tutor and every student, no
// bordered box — matching the Private Class / flat-list reference screens.
function ParticipantRow({
  participant,
  canModerate,
  onToggleMute,
  onLowerHand,
}: {
  participant: ClassroomParticipantView;
  canModerate: boolean;
  onToggleMute?: (id: string) => void;
  onLowerHand?: (name: string) => void;
}) {
  // connectionState only ever populated for a Group Class (see
  // use-group-webrtc-mesh.ts) — enrolled-but-not-yet-connected is a real,
  // distinct state from "here and muted," not something a mic-only status
  // line can express.
  const notJoined = participant.connectionState === "not-joined";
  return (
    <div className={cn("flex items-center gap-2.5 rounded-xl px-1.5 py-2 hover:bg-white/5", participant.handRaised && "bg-ensena-primary/5", notJoined && "opacity-50")}>
      <Avatar participant={participant} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {participant.name}
          {participant.isSelf && <span className="text-white/40"> (You)</span>}
        </p>
        {notJoined ? (
          <p className="text-[11px] text-white/40">Not joined</p>
        ) : (
          <p className={cn("text-[11px]", participant.micOn ? "text-emerald-400" : "text-white/40")}>
            {participant.connectionState === "connecting" ? "Connecting…" : participant.micOn ? "On Air" : "Muted"}
          </p>
        )}
      </div>
      {participant.handRaised && (
        <button
          type="button"
          onClick={() => onLowerHand?.(participant.name)}
          disabled={!canModerate}
          aria-label={canModerate ? `Lower ${participant.name}'s hand` : `${participant.name} raised their hand`}
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ensena-primary/15 text-ensena-primary"
        >
          <Hand className="size-3.5" />
        </button>
      )}
      {!participant.camOn && <VideoOff className="size-3.5 shrink-0 text-white/40" />}
      {canModerate && onToggleMute ? (
        <button
          type="button"
          onClick={() => onToggleMute(participant.id)}
          aria-label={participant.micOn ? `Mute ${participant.name}` : `Unmute ${participant.name}`}
          className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", participant.micOn ? "text-white/40 hover:bg-white/10" : "bg-rose-500/20 text-rose-400")}
        >
          {participant.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </button>
      ) : (
        <span className="flex size-6 shrink-0 items-center justify-center text-white/40">{participant.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}</span>
      )}
    </div>
  );
}

// Group classes get the "Tutor / Students" grouped panel from the
// reference screens (a live-presence status line, the tutor called out on
// their own, then a moderation grid) — a 1:1 lesson keeps the simpler flat
// list, since "Tutor (1) / Students (1)" headers would be noise for a
// two-person room.
export function ClassroomParticipantsRail({
  role,
  participants,
  onToggleMute,
  onLowerHand,
  groupMode = false,
}: {
  role: ClassroomRole;
  participants: ClassroomParticipantView[];
  onToggleMute?: (id: string) => void;
  /** Real, synced acknowledgement — see use-hand-raise.ts. Tutor-only in practice (a student's own button is disabled). */
  onLowerHand?: (participantName: string) => void;
  groupMode?: boolean;
}) {
  if (groupMode) {
    const tutor = participants.find((p) => p.role === "tutor");
    // Students with a raised hand surface first — the whole point of
    // raising a hand is to be noticed without the tutor having to scan a
    // grid for it.
    const students = [...participants.filter((p) => p.role === "student")].sort((a, b) => Number(b.handRaised) - Number(a.handRaised));
    const canModerate = role === "tutor";
    const unmutedStudentIds = students.filter((s) => s.micOn).map((s) => s.id);
    const raisedCount = students.filter((s) => s.handRaised).length;

    return (
      <div className="flex flex-col gap-4 p-1">
        <div className="flex items-center gap-2 rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
          <Volume2 className="size-3.5 shrink-0" /> Everyone can see and hear you
        </div>

        {raisedCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-ensena-primary/10 px-3 py-2 text-xs font-medium text-ensena-primary">
            <Hand className="size-3.5 shrink-0" /> {raisedCount} {raisedCount === 1 ? "hand" : "hands"} raised
          </div>
        )}

        {tutor && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Tutor (1)</p>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 px-2.5 py-2">
              <Avatar participant={tutor} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {tutor.name}
                  {tutor.isSelf && <span className="text-white/40"> (You)</span>}
                </p>
                <p className="text-[11px] text-emerald-400">On Air</p>
              </div>
              {!tutor.camOn && <VideoOff className="size-3.5 shrink-0 text-white/40" />}
              {tutor.micOn ? <Mic className="size-3.5 shrink-0 text-emerald-400" /> : <MicOff className="size-3.5 shrink-0 text-rose-400" />}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Students ({students.length})</p>
            {canModerate && onToggleMute && unmutedStudentIds.length > 0 && (
              <button type="button" onClick={() => unmutedStudentIds.forEach(onToggleMute)} className="text-[11px] font-semibold text-ensena-primary hover:underline">
                Mute All
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {students.map((s) => (
              <StudentCard key={s.id} participant={s} canModerate={canModerate} onToggleMute={onToggleMute} onLowerHand={onLowerHand} />
            ))}
          </div>
          {canModerate && (
            <div className="mt-2">
              <InviteStudentCard />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {participants.map((p) => (
        <ParticipantRow key={p.id} participant={p} canModerate={role === "tutor" && !p.isSelf} onToggleMute={onToggleMute} onLowerHand={onLowerHand} />
      ))}
    </div>
  );
}
