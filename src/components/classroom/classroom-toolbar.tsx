"use client";

import { useState } from "react";
import {
  Briefcase,
  ChevronUp,
  ClipboardList,
  FileText,
  FlaskConical,
  Hand,
  Mic,
  MicOff,
  MessageSquare,
  MoreHorizontal,
  NotebookPen,
  PenSquare,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import type { ClassroomLiveState, MainMode } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { cn } from "@/lib/utils";

// The three primary classroom modes, as a single segmented control — kept
// for Lab mode's own toolbar (not yet redesigned to its own reference
// screen); Video/Whiteboard modes below use direct one-tap buttons instead,
// per their own reference screens.
const modeOptions: { mode: MainMode; label: string }[] = [
  { mode: "video", label: "Video" },
  { mode: "whiteboard", label: "Whiteboard" },
  { mode: "whiteboard-video", label: "Whiteboard + Video" },
];

export function ClassroomModeSwitcher({ mainMode, setMainMode, className }: { mainMode: MainMode; setMainMode: (mode: MainMode) => void; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5 rounded-full bg-white/10 p-1", className)}>
      {modeOptions.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          aria-pressed={mainMode === opt.mode}
          onClick={() => setMainMode(opt.mode)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
            mainMode === opt.mode ? "bg-white text-ensena-ink" : "text-white/70 hover:text-white"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  label,
  icon: Icon,
  compact,
  badge,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Mic;
  compact: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors",
        compact ? "size-11" : "h-14 w-16",
        active ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-ink hover:bg-ensena-bg-soft"
      )}
    >
      <Icon className="size-4.5" />
      {!compact && <span>{label}</span>}
      {typeof badge === "number" && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

// The bordered-card button style the Private Class reference screens use on
// desktop (icon over label, visible outline) — visually distinct from the
// borderless ToolButton above, which Group Class's own reference screens
// use instead.
function CardToolButton({
  active,
  onClick,
  label,
  icon: Icon,
  badge,
  caret,
  onCaretClick,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Mic;
  badge?: number;
  /** A small device-picker affordance above Mic/Camera. */
  caret?: boolean;
  onCaretClick?: () => void;
}) {
  return (
    <div className="relative flex shrink-0 flex-col items-center">
      {caret && (
        <button
          type="button"
          onClick={onCaretClick}
          aria-label={`${label} device options`}
          className="mb-0.5 flex size-4 items-center justify-center text-ensena-muted hover:text-ensena-ink"
        >
          <ChevronUp className="size-3" />
        </button>
      )}
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "relative flex h-14 w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-medium transition-colors",
          active ? "border-rose-200 bg-rose-50 text-rose-600" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
        )}
      >
        <Icon className="size-4.5" />
        <span>{label}</span>
        {typeof badge === "number" && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-semibold text-white">{badge}</span>
        )}
      </button>
    </div>
  );
}

// Real device-selection popover, opened from the caret above Mic/Camera —
// the exact same enumerateDevices() list use-local-media.ts already
// exposes for the Settings panel, just reachable one tap closer for the
// two devices someone actually switches mid-lesson.
function DeviceCaretMenu({
  label,
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  label: string;
  options: { deviceId: string; label: string }[];
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full left-1/2 z-30 mb-2 w-52 -translate-x-1/2 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">{label}</p>
      {options.length === 0 && <p className="px-2 py-1.5 text-xs text-ensena-muted">No devices found</p>}
      {options.map((opt) => (
        <button
          key={opt.deviceId}
          type="button"
          onClick={() => {
            onSelect(opt.deviceId);
            onClose();
          }}
          className={cn(
            "block w-full truncate rounded-lg px-2 py-1.5 text-left text-xs",
            opt.deviceId === selectedId ? "bg-ensena-primary/10 font-semibold text-ensena-primary" : "text-ensena-ink hover:bg-ensena-bg-soft"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// Group Class's own reference screen has no dedicated Activities/Timer
// icons in its bottom row (unlike Private Class's, which exposes Files/
// Notes directly) — "More" is where those actually live for a group class,
// rather than a decorative catch-all. Settings stays reachable from the
// top bar for every session kind, so it isn't duplicated here.
function GroupMoreMenu({ state }: { state: ClassroomLiveState }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ToolButton onClick={() => setOpen((v) => !v)} label="More" icon={MoreHorizontal} compact={false} />
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-48 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              state.setSidebarTab("activities");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <ClipboardList className="size-3.5" /> Activities
          </button>
          <button
            type="button"
            onClick={() => {
              state.setSidebarTab("timer");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <FileText className="size-3.5" /> Lesson Timer
          </button>
        </div>
      )}
    </div>
  );
}

function LeaveButton({ role, compact, isGroupTutor, onLeave }: { role: ClassroomRole; compact: boolean; isGroupTutor: boolean; onLeave: () => void }) {
  const label = isGroupTutor ? "End Class" : compact ? "Leave Classroom" : role === "tutor" ? "Leave Class" : "Leave";
  return (
    <button
      type="button"
      onClick={onLeave}
      className={cn(
        "flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-rose-600 font-semibold text-white hover:bg-rose-700",
        compact ? "h-11 w-full text-sm" : "h-14 px-4 text-xs"
      )}
    >
      <PhoneOff className="size-4" />
      {label}
    </button>
  );
}

export function ClassroomToolbar({
  role,
  session,
  state,
  compact = false,
  onOpenChat,
  onOpenMore,
  onOpenFiles,
  onOpenNotes,
  onOpenParticipants,
}: {
  role: ClassroomRole;
  session: ClassroomSession;
  state: ClassroomLiveState;
  compact?: boolean;
  onOpenChat?: () => void;
  /** Mobile only — desktop's Private Class toolbar has direct Files/Notes/Tools buttons instead of a catch-all "More"; Group Class's own "More" is self-contained (see GroupMoreMenu). */
  onOpenMore?: () => void;
  onOpenFiles?: () => void;
  onOpenNotes?: () => void;
  onOpenParticipants?: () => void;
}) {
  const [caretOpen, setCaretOpen] = useState<"mic" | "camera" | null>(null);
  const isGroupTutor = role === "tutor" && session.kind === "group";
  const isWhiteboardMode = state.mainMode === "whiteboard" || state.mainMode === "whiteboard-video";

  // The same button both enters and leaves Whiteboard mode — neither
  // reference screen's bottom row has a separate "Video" icon, so
  // Whiteboard toggles instead of being one-way. Group Class's own
  // Whiteboard reference screen shows the Participants panel open by
  // default; leaving it back to Video closes that panel again, matching
  // Video's reference screen showing no side panel at all.
  function toggleWhiteboardMode() {
    if (isWhiteboardMode) {
      state.setMainMode("video");
      if (session.kind === "group") state.setSidebarTab(null);
      return;
    }
    state.setMainMode("whiteboard-video");
    if (session.kind === "group" && !compact) state.setSidebarTab("participants");
  }

  // Mobile — icon row (borderless, light theme) + a separate full-width
  // Leave Classroom row beneath it, matching the reference screen exactly
  // rather than squeezing Leave into the same row as everything else.
  if (compact) {
    return (
      <div className="flex shrink-0 flex-col gap-2 border-t border-ensena-border bg-ensena-surface px-2 py-2">
        <div className="flex items-center justify-center gap-1">
          {isWhiteboardMode ? (
            // Whiteboard mode's own drawing tools live in the left rail
            // inside the canvas itself (see whiteboard-rail.tsx) — this row
            // stays focused on navigating between classroom surfaces,
            // matching its own reference screen.
            <>
              <ToolButton compact onClick={() => state.setMainMode("video")} label="Video" icon={Video} />
              {onOpenFiles && <ToolButton compact onClick={onOpenFiles} label="Files" icon={FileText} />}
              {onOpenChat && <ToolButton compact onClick={onOpenChat} label="Chat" icon={MessageSquare} badge={state.chat.length} />}
              {onOpenMore && <ToolButton compact onClick={onOpenMore} label="More" icon={MoreHorizontal} />}
            </>
          ) : (
            <>
              <ToolButton compact active={!state.micOn} onClick={() => state.setMicOn((v) => !v)} label={state.micOn ? "Mute" : "Unmute"} icon={state.micOn ? Mic : MicOff} />
              <ToolButton compact active={!state.camOn} onClick={() => state.setCamOn((v) => !v)} label={state.camOn ? "Stop Video" : "Start Video"} icon={state.camOn ? Video : VideoOff} />
              {session.kind !== "group" && (
                <ToolButton compact active={state.screenSharing} onClick={() => state.setScreenSharing((v) => !v)} label="Share" icon={state.screenSharing ? ScreenShareOff : ScreenShare} />
              )}
              {session.kind !== "counselling" && (
                <ToolButton compact onClick={toggleWhiteboardMode} label="Whiteboard" icon={PenSquare} />
              )}
              {onOpenParticipants && <ToolButton compact onClick={onOpenParticipants} label="Participants" icon={Users} badge={session.participantCount} />}
              {onOpenChat && <ToolButton compact onClick={onOpenChat} label="Chat" icon={MessageSquare} badge={state.chat.length} />}
              {onOpenMore && <ToolButton compact onClick={onOpenMore} label="More" icon={MoreHorizontal} />}
            </>
          )}
        </div>
        <LeaveButton role={role} compact isGroupTutor={isGroupTutor} onLeave={state.onLeave} />
      </div>
    );
  }

  // Desktop, Private Class — ONE bordered-card row, present in both Video
  // and Whiteboard mode (matching both reference screens exactly): Mic/
  // Camera (with a device-picker caret), Share Screen, Whiteboard, Tools,
  // Chat, Files, Notes, Participants, then Leave Class set apart.
  if (session.kind !== "group" && (state.mainMode === "video" || isWhiteboardMode)) {
    return (
      <div className="relative flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-ensena-border bg-ensena-surface px-3 py-2.5">
        <CardToolButton
          active={!state.micOn}
          onClick={() => state.setMicOn((v) => !v)}
          label={state.micOn ? "Mic" : "Unmute"}
          icon={state.micOn ? Mic : MicOff}
          caret
          onCaretClick={() => setCaretOpen((v) => (v === "mic" ? null : "mic"))}
        />
        {caretOpen === "mic" && (
          <div className="relative">
            <DeviceCaretMenu label="Microphone" options={state.microphones} selectedId={state.selectedMicId} onSelect={state.setMicId} onClose={() => setCaretOpen(null)} />
          </div>
        )}
        <CardToolButton
          active={!state.camOn}
          onClick={() => state.setCamOn((v) => !v)}
          label={state.camOn ? "Camera" : "Start Video"}
          icon={state.camOn ? Video : VideoOff}
          caret
          onCaretClick={() => setCaretOpen((v) => (v === "camera" ? null : "camera"))}
        />
        {caretOpen === "camera" && (
          <div className="relative">
            <DeviceCaretMenu label="Camera" options={state.cameras} selectedId={state.selectedCameraId} onSelect={state.setCameraId} onClose={() => setCaretOpen(null)} />
          </div>
        )}
        <CardToolButton active={state.screenSharing} onClick={() => state.setScreenSharing((v) => !v)} label="Share Screen" icon={state.screenSharing ? ScreenShareOff : ScreenShare} />
        {session.kind !== "counselling" && <CardToolButton active={isWhiteboardMode} onClick={toggleWhiteboardMode} label="Whiteboard" icon={PenSquare} />}
        {/* Teaching Tools only ever attach to the whiteboard surface — see the matching Group Class comment below. */}
        {session.kind !== "counselling" && (
          <CardToolButton onClick={() => (isWhiteboardMode ? undefined : toggleWhiteboardMode())} label="Tools" icon={Briefcase} />
        )}
        {session.labApplies && <CardToolButton onClick={() => state.setMainMode("lab")} label="Virtual Lab" icon={FlaskConical} />}
        {onOpenChat && <CardToolButton onClick={onOpenChat} label="Chat" icon={MessageSquare} badge={state.chat.length} />}
        {onOpenFiles && <CardToolButton onClick={onOpenFiles} label="Files" icon={FileText} />}
        {onOpenNotes && <CardToolButton onClick={onOpenNotes} label="Notes" icon={NotebookPen} />}
        {onOpenParticipants && <CardToolButton onClick={onOpenParticipants} label="Participants" icon={Users} badge={session.participantCount} />}
        {role === "student" && <CardToolButton active={state.handRaised} onClick={state.toggleMyHand} label={state.handRaised ? "Lower Hand" : "Raise Hand"} icon={Hand} />}
        <div className="ml-2">
          <LeaveButton role={role} compact={false} isGroupTutor={isGroupTutor} onLeave={state.onLeave} />
        </div>
      </div>
    );
  }

  // Desktop, Group Class — ONE plain-icon row, also present in both Video
  // and Whiteboard mode: Mute/Stop Video/Share Screen/Whiteboard/Tools/
  // Participants/Chat/Raise Hand/More, then End Class set apart.
  if (session.kind === "group" && (state.mainMode === "video" || isWhiteboardMode)) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-1 border-t border-ensena-border bg-ensena-surface px-3 py-2.5">
        <ToolButton active={!state.micOn} onClick={() => state.setMicOn((v) => !v)} label={state.micOn ? "Mute" : "Unmute"} icon={state.micOn ? Mic : MicOff} compact={false} />
        <ToolButton active={!state.camOn} onClick={() => state.setCamOn((v) => !v)} label={state.camOn ? "Stop Video" : "Start Video"} icon={state.camOn ? Video : VideoOff} compact={false} />
        <ToolButton active={state.screenSharing} onClick={() => state.setScreenSharing((v) => !v)} label="Share Screen" icon={state.screenSharing ? ScreenShareOff : ScreenShare} compact={false} />
        <ToolButton active={isWhiteboardMode} onClick={toggleWhiteboardMode} label="Whiteboard" icon={PenSquare} compact={false} />
        {/* Teaching Tools only ever attach to the whiteboard surface — from
            Video mode this jumps straight there (its own left rail's Tools
            button opens the actual library), rather than a "Tools" entry
            point with nothing real to show yet. */}
        <ToolButton onClick={() => (isWhiteboardMode ? undefined : toggleWhiteboardMode())} label="Tools" icon={Briefcase} compact={false} />
        {onOpenParticipants && <ToolButton onClick={onOpenParticipants} label="Participants" icon={Users} badge={session.participantCount} compact={false} />}
        {onOpenChat && <ToolButton onClick={onOpenChat} label="Chat" icon={MessageSquare} badge={state.chat.length} compact={false} />}
        {role === "student" ? (
          <ToolButton active={state.handRaised} onClick={state.toggleMyHand} label={state.handRaised ? "Lower Hand" : "Raise Hand"} icon={Hand} compact={false} />
        ) : (
          // A host doesn't raise their own hand — this shows how many
          // students currently have theirs up (real synced presence, see
          // use-hand-raise.ts) and opens Participants, where each one can be
          // individually acknowledged/lowered.
          <ToolButton
            active={state.participants.some((p) => p.handRaised)}
            onClick={onOpenParticipants ?? (() => {})}
            label="Raised Hands"
            icon={Hand}
            badge={state.participants.filter((p) => p.handRaised).length}
            compact={false}
          />
        )}
        <GroupMoreMenu state={state} />
        <div className="ml-2">
          <LeaveButton role={role} compact={false} isGroupTutor={isGroupTutor} onLeave={state.onLeave} />
        </div>
      </div>
    );
  }

  // Desktop, every other mode (Lab) — unchanged pending its own reference screen.
  return (
    <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-neutral-950 px-2 py-2.5">
      <ToolButton active={!state.micOn} onClick={() => state.setMicOn((v) => !v)} label={state.micOn ? "Mute" : "Unmute"} icon={state.micOn ? Mic : MicOff} compact={false} />
      <ToolButton active={!state.camOn} onClick={() => state.setCamOn((v) => !v)} label={state.camOn ? "Stop Video" : "Start Video"} icon={state.camOn ? Video : VideoOff} compact={false} />
      <ToolButton active={state.screenSharing} onClick={() => state.setScreenSharing((v) => !v)} label="Share" icon={state.screenSharing ? ScreenShareOff : ScreenShare} compact={false} />
      <ClassroomModeSwitcher mainMode={state.mainMode} setMainMode={state.setMainMode} />
      {session.labApplies && (
        <ToolButton active={state.mainMode === "lab"} onClick={() => state.setMainMode("lab")} label="Virtual Lab" icon={FlaskConical} compact={false} />
      )}
      {onOpenChat && <ToolButton onClick={onOpenChat} label="Chat" icon={MessageSquare} badge={state.chat.length} compact={false} />}
      {role === "student" && (
        <ToolButton active={state.handRaised} onClick={state.toggleMyHand} label={state.handRaised ? "Lower Hand" : "Raise Hand"} icon={Hand} compact={false} />
      )}
      {onOpenMore && <ToolButton onClick={onOpenMore} label="More" icon={MoreHorizontal} compact={false} />}
      <div className="ml-2">
        <LeaveButton role={role} compact={false} isGroupTutor={isGroupTutor} onLeave={state.onLeave} />
      </div>
    </div>
  );
}
