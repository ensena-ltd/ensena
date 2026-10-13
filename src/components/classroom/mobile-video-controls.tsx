"use client";

import { useState } from "react";
import { Briefcase, ChevronUp, Mic, MicOff, MessageSquare, MoreHorizontal, PenSquare, PhoneOff, Video, VideoOff } from "lucide-react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { cn } from "@/lib/utils";

function Circle({ active, danger, onClick, label, icon: Icon }: { active?: boolean; danger?: boolean; onClick: () => void; label: string; icon: typeof Mic }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full",
        danger ? "bg-rose-600 text-white hover:bg-rose-700" : active ? "bg-white text-ensena-ink" : "bg-white/15 text-white hover:bg-white/25"
      )}
    >
      <Icon className="size-4.5" />
    </button>
  );
}

// The floating translucent control card from the Group Class mobile Video
// reference screen — replaces the flush white toolbar Whiteboard/Lab modes
// use, since Video mode is meant to feel like an immersive full-screen call
// with controls hovering over it, not a page with a bar docked underneath.
// Private Class's own Video reference screen uses a docked white bar
// instead — see PrivateVideoControls below.
export function MobileVideoControls({
  role,
  session,
  state,
  timerLabel,
  onOpenMore,
  onOpenTools,
}: {
  role: ClassroomRole;
  session: ClassroomSession;
  state: ClassroomLiveState;
  timerLabel: string;
  onOpenMore: () => void;
  onOpenTools: () => void;
}) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 rounded-3xl bg-black/45 px-3 pb-3 pt-2.5 backdrop-blur-md">
      <div className="relative flex items-center justify-center">
        <button type="button" onClick={onOpenMore} aria-label="More options" className="absolute left-0 flex size-7 items-center justify-center rounded-full text-white/80 hover:text-white">
          <MoreHorizontal className="size-4" />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-white">{session.kind === "group" ? session.title : "Private Class"}</p>
          <p className="font-mono text-[11px] text-white/70">{timerLabel}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-3">
        <Circle active={!state.micOn} onClick={() => state.setMicOn((v) => !v)} label={state.micOn ? "Mute" : "Unmute"} icon={state.micOn ? Mic : MicOff} />
        <Circle active={!state.camOn} onClick={() => state.setCamOn((v) => !v)} label={state.camOn ? "Stop Camera" : "Start Camera"} icon={state.camOn ? Video : VideoOff} />
        <Circle onClick={() => state.setMainMode("whiteboard-video")} label="Whiteboard" icon={PenSquare} />
        <Circle onClick={onOpenTools} label="Tools" icon={Briefcase} />
        <Circle danger onClick={state.onLeave} label={role === "tutor" && session.kind === "group" ? "End Class" : "End"} icon={PhoneOff} />
      </div>
    </div>
  );
}

function DockedIconButton({
  active,
  accent,
  onClick,
  label,
  icon: Icon,
  caret,
  onCaretClick,
}: {
  active?: boolean;
  accent?: boolean;
  onClick: () => void;
  label: string;
  icon: typeof Mic;
  caret?: boolean;
  onCaretClick?: () => void;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center">
      {caret && (
        <button type="button" onClick={onCaretClick} aria-label={`${label} device options`} className="mb-0.5 flex size-4 items-center justify-center text-ensena-muted">
          <ChevronUp className="size-3" />
        </button>
      )}
      <button
        type="button"
        aria-pressed={active}
        onClick={onClick}
        className={cn("flex flex-col items-center gap-1 text-[11px] font-medium", active || accent ? "text-ensena-primary" : "text-ensena-ink")}
      >
        <Icon className="size-5" />
        {label}
      </button>
    </div>
  );
}

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
    <div className="absolute bottom-full left-1/2 z-30 mb-2 w-48 -translate-x-1/2 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
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

// Private Class's mobile Video reference screen's docked control bar — a
// plain white bar (not a floating card) with Mic/Camera (each with a real
// device-picker caret, the same enumerateDevices() list the desktop toolbar
// and Settings panel use), Whiteboard, Tools, Chat, and More. There's no
// separate red hang-up button in this row — matching the reference screen
// exactly — End Class/Leave is reachable from the "More" sheet instead (see
// classroom-tools-panel.tsx's MobileToolsPanel).
export function PrivateVideoControls({
  state,
  onOpenChat,
  onOpenTools,
  onOpenMore,
}: {
  state: ClassroomLiveState;
  onOpenChat: () => void;
  onOpenTools: () => void;
  onOpenMore: () => void;
}) {
  const [caretOpen, setCaretOpen] = useState<"mic" | "camera" | null>(null);

  return (
    <div className="relative flex shrink-0 items-center justify-around border-t border-ensena-border bg-ensena-surface px-1 py-2.5">
      <div className="relative flex flex-1 justify-center">
        <DockedIconButton
          active={!state.micOn}
          onClick={() => state.setMicOn((v) => !v)}
          label={state.micOn ? "Mic" : "Unmute"}
          icon={state.micOn ? Mic : MicOff}
          caret
          onCaretClick={() => setCaretOpen((v) => (v === "mic" ? null : "mic"))}
        />
        {caretOpen === "mic" && <DeviceCaretMenu label="Microphone" options={state.microphones} selectedId={state.selectedMicId} onSelect={state.setMicId} onClose={() => setCaretOpen(null)} />}
      </div>
      <div className="relative flex flex-1 justify-center">
        <DockedIconButton
          active={!state.camOn}
          onClick={() => state.setCamOn((v) => !v)}
          label={state.camOn ? "Camera" : "Start"}
          icon={state.camOn ? Video : VideoOff}
          caret
          onCaretClick={() => setCaretOpen((v) => (v === "camera" ? null : "camera"))}
        />
        {caretOpen === "camera" && <DeviceCaretMenu label="Camera" options={state.cameras} selectedId={state.selectedCameraId} onSelect={state.setCameraId} onClose={() => setCaretOpen(null)} />}
      </div>
      <DockedIconButton accent onClick={() => state.setMainMode("whiteboard-video")} label="Whiteboard" icon={PenSquare} />
      <DockedIconButton onClick={onOpenTools} label="Tools" icon={Briefcase} />
      <DockedIconButton onClick={onOpenChat} label="Chat" icon={MessageSquare} />
      <DockedIconButton onClick={onOpenMore} label="More" icon={MoreHorizontal} />
    </div>
  );
}
