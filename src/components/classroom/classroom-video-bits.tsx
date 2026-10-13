import Image from "next/image";
import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useRef, useState } from "react";
import { ChevronDown, Columns2, Expand, GripVertical, LayoutGrid, Mic, MicOff, Minimize2, MoreVertical, Pin, Video, VideoOff } from "lucide-react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomParticipantView, ClassroomSession } from "@/lib/classroom-data";
import { initials } from "@/components/classroom/classroom-utils";
import { cn } from "@/lib/utils";

// The actual camera feed — a real MediaStream (local or, once WebRTC
// connects, the remote peer's) bound to a real <video> element, not a
// static profile photo standing in for one. `muted` must be true for the
// LOCAL self-view (playing your own mic back to yourself would echo);
// the remote peer's view should never be muted.
export function VideoStreamView({ stream, muted, sinkId, className }: { stream: MediaStream; muted: boolean; sinkId?: string | null; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
  }, [stream]);

  // Output-device selection only ever applies to unmuted (remote-peer)
  // audio — routing your own muted local preview to a chosen speaker is
  // meaningless. setSinkId is missing on Firefox/Safari, hence the guard.
  useEffect(() => {
    const el = videoRef.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (!el || muted || !sinkId || typeof el.setSinkId !== "function") return;
    el.setSinkId(sinkId).catch(() => {});
  }, [sinkId, muted]);

  // `object-contain` (never `cover`) is the one thing that matters here:
  // every container this renders into varies in aspect ratio (full-stage
  // fill, a 16:9 docked tile, a 1:1 grid cell, a wide teaching-view banner),
  // and a camera stream is essentially always landscape. `cover` scales the
  // stream up to fill whichever dimension is tighter and crops the other —
  // in a squarer-than-16:9 box that crops top/bottom, visually "zooming"
  // into whatever's centered (the person's face). `contain` guarantees the
  // full frame — head, shoulders, background — is always visible, at the
  // cost of letterbox bars in a mismatched container. `bg-black` behind it
  // makes those bars read as an intentional video-call letterbox rather
  // than a gap, and holds regardless of what background (if any) the
  // specific parent tile happens to set.
  return <video ref={videoRef} autoPlay playsInline muted={muted} className={cn("size-full bg-black object-contain", className)} />;
}

export function AvatarFill({ name, image, large = false }: { name: string; image?: string; large?: boolean }) {
  if (image) return <Image src={image} alt={name} fill sizes={large ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, 50vw"} className="object-cover" />;
  // No photo on file for this person (e.g. a tutor's own student roster
  // only stores a name) — a real circular avatar badge, not a giant
  // stretched initial, so it still reads as an intentional "no photo"
  // state rather than a broken image.
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-ensena-ink to-ensena-ink/80">
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-ensena-primary font-semibold text-white",
          large ? "size-20 text-2xl" : "size-8 text-xs"
        )}
      >
        {initials(name)}
      </span>
    </div>
  );
}

// `micOn` overrides participant.micOn when the caller has a live value
// (self's real state.micOn) rather than the seed/simulated field a remote
// participant's own ClassroomParticipantView entry carries.
export function NameBadge({ participant, micOn }: { participant: ClassroomParticipantView; micOn?: boolean }) {
  const isMicOn = micOn ?? participant.micOn;
  return (
    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 py-1.5 pl-1.5 pr-3">
      <span className="flex size-6 items-center justify-center rounded-full bg-ensena-primary">
        {isMicOn ? <Mic className="size-3.5 text-white" /> : <MicOff className="size-3.5 text-white" />}
      </span>
      <span className="text-sm font-medium text-white">
        {participant.name} <span className="text-white/60">({participant.role === "tutor" ? "Tutor" : "Student"})</span>
      </span>
    </div>
  );
}

// Used both in a horizontal-scroll strip (fixed width) and a responsive
// grid (`fill`, sizes to its grid cell) — the group-teaching video reference
// screens use the grid form for the student roster below the tutor's big
// video.
export function StripTile({ participant, fill = false }: { participant: ClassroomParticipantView; fill?: boolean }) {
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-lg border border-white/70", fill ? "w-full" : "w-16 shrink-0 sm:w-24")}>
      <AvatarFill name={participant.name} image={participant.image} />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        {!participant.micOn && <MicOff className="size-2.5 shrink-0 text-white" />}
        <span className="truncate text-[10px] font-medium text-white">{participant.name}</span>
      </div>
    </div>
  );
}

// The small floating "you're on camera" corner window shown over Lab/Tools
// mode — matches every other video app's self-preview convention. Full-size
// video mode uses its own larger layout (ClassroomVideoSection) instead of
// this; the combined Whiteboard + Video mode uses FloatingVideoTiles below
// (both participants, not just self).
export function FloatingSelfTile({ self, state }: { self: ClassroomParticipantView; state: ClassroomLiveState }) {
  return (
    <button
      type="button"
      onClick={() => state.setMainMode("video")}
      aria-label="Back to full-screen video"
      className={cn(
        "absolute bottom-3 right-3 aspect-video w-24 overflow-hidden rounded-lg border-2 border-white shadow-lg sm:w-36",
        !state.camOn && "bg-ensena-ink"
      )}
    >
      {state.camOn && state.localStream ? (
        <VideoStreamView stream={state.localStream} muted />
      ) : state.camOn ? (
        <AvatarFill name={self.name} image={self.image} />
      ) : (
        <div className="flex size-full items-center justify-center">
          <VideoOff className="size-4 text-white" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
        <span className="truncate text-[10px] font-medium text-white">{self.name} (You)</span>
        {!state.micOn && <MicOff className="size-3 shrink-0 text-white" />}
      </div>
    </button>
  );
}


// A docked (not floating) video card for the Private Class Whiteboard
// reference screen's desktop layout — real stream, a Pin control that
// reorders which tile shows first in the column, and a kebab offering the
// one real action that makes sense here (jump to full-screen Video mode).
export function DockedVideoTile({
  participant,
  stream,
  muted,
  micOn,
  sinkId,
  pinned,
  onTogglePin,
  onToggleMic,
  state,
}: {
  participant: ClassroomParticipantView;
  stream: MediaStream | null;
  muted: boolean;
  micOn: boolean;
  sinkId?: string | null;
  pinned: boolean;
  onTogglePin: () => void;
  /** Only set for the self tile — there's no outer Mic/Camera toolbar in this mode (see reference screen), so this IS the mute control. */
  onToggleMic?: () => void;
  state: ClassroomLiveState;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-ensena-border bg-ensena-ink">
      {stream ? <VideoStreamView stream={stream} muted={muted} sinkId={sinkId} /> : <AvatarFill name={participant.name} image={participant.image} />}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
        <button
          type="button"
          onClick={onTogglePin}
          aria-label={pinned ? "Unpin" : "Pin to top"}
          className={cn("flex size-6 items-center justify-center rounded-full bg-black/50 hover:bg-black/70", pinned ? "text-ensena-primary" : "text-white")}
        >
          <Pin className="size-3" />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="More options" className="flex size-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
            <MoreVertical className="size-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-10 w-40 rounded-lg border border-ensena-border bg-ensena-surface p-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  state.setMainMode("video");
                }}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                <Expand className="size-3.5" /> Full-screen
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
        {onToggleMic ? (
          <button type="button" onClick={onToggleMic} aria-label={micOn ? "Mute" : "Unmute"} className="shrink-0 text-white">
            {micOn ? <Mic className="size-3" /> : <MicOff className="size-3 text-rose-400" />}
          </button>
        ) : micOn ? (
          <Mic className="size-3 shrink-0 text-white" />
        ) : (
          <MicOff className="size-3 shrink-0 text-white" />
        )}
        <span className="truncate text-xs font-medium text-white">
          {participant.name} <span className="text-white/60">({participant.role === "tutor" ? "Tutor" : "Student"})</span>
        </span>
      </div>
    </div>
  );
}

// The Private Class Whiteboard reference screen's right-hand video column —
// both real streams, ordered by which one is pinned, with a real docked-vs-
// floating layout switch and a collapse control (collapsing just drops back
// to plain Whiteboard mode with no video shown, which is exactly what
// "collapsed" means — no separate hidden state to track).
export function DockedVideoColumn({
  self,
  peer,
  state,
  onSwitchToFloating,
}: {
  self: ClassroomParticipantView;
  peer: ClassroomParticipantView | undefined;
  state: ClassroomLiveState;
  onSwitchToFloating: () => void;
}) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const tiles = [self, ...(peer ? [peer] : [])].sort((a, b) => (a.id === pinnedId ? -1 : b.id === pinnedId ? 1 : 0));

  return (
    <div className="hidden w-72 shrink-0 flex-col gap-2 border-l border-ensena-border bg-ensena-surface p-2 lg:flex xl:w-80">
      {tiles.map((p) => (
        <DockedVideoTile
          key={p.id}
          participant={p}
          stream={p.id === self.id ? state.localStream : state.remoteStream}
          muted={p.id === self.id ? true : !state.speakerOn}
          micOn={p.id === self.id ? state.micOn : true}
          sinkId={state.selectedSpeakerId}
          pinned={pinnedId === p.id}
          onTogglePin={() => setPinnedId((cur) => (cur === p.id ? null : p.id))}
          onToggleMic={p.id === self.id ? () => state.setMicOn((v) => !v) : undefined}
          state={state}
        />
      ))}
      <div className="mt-auto flex items-center justify-center gap-1 rounded-full border border-ensena-border p-1">
        <button type="button" aria-label="Docked video" className="flex size-7 items-center justify-center rounded-full border border-ensena-primary bg-rose-50 text-ensena-primary">
          <LayoutGrid className="size-3.5" />
        </button>
        <button type="button" onClick={onSwitchToFloating} aria-label="Floating video" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <Columns2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => state.setMainMode("whiteboard")}
          aria-label="Hide video"
          className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// Drag support for the combined-mode floating tile — press-and-drag the
// grip handle to reposition it anywhere within the stage (a fixed bottom-
// right corner permanently covers part of the whiteboard on a phone-sized
// screen, which is exactly the complaint a real tutor would have). Position
// stays `null` (meaning "use the default corner via CSS") until the user
// actually drags once, so nothing shifts on first render.
function useDraggableTile(boundsRef?: RefObject<HTMLDivElement | null>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const dragRef = useRef<{ pointerId: number; startClientX: number; startClientY: number; startLeft: number; startTop: number } | null>(null);

  function clampToBounds(left: number, top: number) {
    const bounds = boundsRef?.current?.getBoundingClientRect();
    const tile = wrapperRef.current?.getBoundingClientRect();
    if (!bounds || !tile) return { left, top };
    const maxLeft = Math.max(0, bounds.width - tile.width);
    const maxTop = Math.max(0, bounds.height - tile.height);
    return { left: Math.min(Math.max(0, left), maxLeft), top: Math.min(Math.max(0, top), maxTop) };
  }

  function onPointerDown(e: ReactPointerEvent) {
    const bounds = boundsRef?.current?.getBoundingClientRect();
    const tile = wrapperRef.current?.getBoundingClientRect();
    if (!bounds || !tile) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const currentLeft = pos?.left ?? tile.left - bounds.left;
    const currentTop = pos?.top ?? tile.top - bounds.top;
    dragRef.current = { pointerId: e.pointerId, startClientX: e.clientX, startClientY: e.clientY, startLeft: currentLeft, startTop: currentTop };
    e.preventDefault();
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;
    setPos(clampToBounds(drag.startLeft + dx, drag.startTop + dy));
  }

  function onPointerUp(e: ReactPointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  }

  return { wrapperRef, pos, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}

// The combined Whiteboard + Video mode's floating tiles — both self AND
// the remote peer, stacked in the corner over the Excalidraw board, rather
// than forcing a choice between teaching visually and staying face-to-face.
// Tapping a tile switches straight to full Video mode (same "tap a video
// tile" convention as ClassroomVideoSection). A drag handle lets the whole
// stack be repositioned (it otherwise permanently covers a corner of the
// board on a phone), and a minimize button collapses it to a small bubble
// when the tutor needs the board fully clear — tapping the bubble restores it.
export function FloatingVideoTiles({
  self,
  peer,
  state,
  boundsRef,
}: {
  self: ClassroomParticipantView;
  peer: ClassroomParticipantView | undefined;
  state: ClassroomLiveState;
  boundsRef?: RefObject<HTMLDivElement | null>;
}) {
  const { wrapperRef, pos, dragHandleProps } = useDraggableTile(boundsRef);
  const [minimized, setMinimized] = useState(false);
  const style = pos ? { left: pos.left, top: pos.top, right: "auto", bottom: "auto" } : undefined;

  if (minimized) {
    return (
      <div ref={wrapperRef} className="absolute bottom-3 right-3 z-20" style={style}>
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label="Show video"
          className="flex size-11 touch-none items-center justify-center rounded-full border-2 border-white bg-ensena-ink shadow-lg"
          {...dragHandleProps}
        >
          <Video className="size-4 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1" style={style}>
      <div className="flex items-center gap-0.5 rounded-full bg-black/60 px-1 py-1">
        <span aria-hidden className="flex size-6 touch-none cursor-grab items-center justify-center text-white/70 active:cursor-grabbing" {...dragHandleProps}>
          <GripVertical className="size-3.5" />
        </span>
        <button type="button" onClick={() => setMinimized(true)} aria-label="Minimize video" className="flex size-6 items-center justify-center rounded-full text-white/80 hover:text-white">
          <Minimize2 className="size-3" />
        </button>
      </div>
      {peer && (
        <button type="button" onClick={() => state.setMainMode("video")} aria-label="Switch to full-screen video" className="aspect-video w-24 overflow-hidden rounded-lg border-2 border-white shadow-lg sm:w-32">
          {state.remoteStream ? (
            <VideoStreamView stream={state.remoteStream} muted={!state.speakerOn} sinkId={state.selectedSpeakerId} />
          ) : (
            <div className="flex size-full items-center justify-center bg-ensena-ink">
              <AvatarFill name={peer.name} image={peer.image} />
            </div>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => state.setMainMode("video")}
        aria-label="Switch to full-screen video"
        className={cn("aspect-video w-24 overflow-hidden rounded-lg border-2 border-white shadow-lg sm:w-32", !state.camOn && "bg-ensena-ink")}
      >
        {state.camOn && state.localStream ? (
          <VideoStreamView stream={state.localStream} muted />
        ) : (
          <div className="flex size-full items-center justify-center">
            <VideoOff className="size-4 text-white" />
          </div>
        )}
      </button>
    </div>
  );
}
