"use client";

import { useEffect, useRef, useState } from "react";
import { Columns2, Expand, LayoutGrid, Mic, MicOff, Minimize2, MonitorOff, Repeat2, ShieldCheck, Signal, SignalZero, Users, VideoOff } from "lucide-react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomParticipantView, ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { AvatarFill, NameBadge, VideoStreamView } from "@/components/classroom/classroom-video-bits";
import { cn } from "@/lib/utils";

function ScreenShareView({ role, screenSharing }: { role: ClassroomRole; screenSharing: boolean }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-neutral-900 text-center">
      <MonitorOff className="size-8 text-white/40" />
      <p className="text-sm font-medium text-white">
        {screenSharing ? (role === "tutor" ? "You are sharing your screen." : "The tutor is sharing their screen.") : "Nobody is sharing their screen yet."}
      </p>
    </div>
  );
}

// The real connection-status badge — top-left, matching the reference
// screen (a signal-strength icon rather than a wifi glyph). `null` means
// "not applicable" (a group class, where there's no single 1:1 peer
// connection to report on) and the caller skips rendering this entirely.
function ConnectionBadge({ peerConnectionState }: { peerConnectionState: ClassroomLiveState["peerConnectionState"] }) {
  const connected = peerConnectionState === "connected";
  return (
    <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1.5">
      {connected ? <Signal className="size-3.5 text-emerald-400" /> : <SignalZero className={cn("size-3.5", peerConnectionState === "failed" ? "text-rose-400" : "text-amber-400")} />}
      <span className="text-xs font-medium text-white">
        {connected ? "Connected" : peerConnectionState === "reconnecting" ? "Reconnecting…" : peerConnectionState === "failed" ? "Connection failed" : "Connecting…"}
      </span>
    </div>
  );
}

// Private Class's mobile Video reference screen's top-right pair — a real
// participant count (opens the same Participants view the bottom sheet's
// "More" already exposes) and real session details (Class info), replacing
// desktop's Speaker/Side-by-side ViewMenu, which has no equivalent on a
// phone-sized reference screen.
function MobileVideoTopIcons({ session, state }: { session: ClassroomSession; state: ClassroomLiveState }) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          state.setActiveTool("participants");
          state.setSheetOpen(true);
        }}
        aria-label="Participants"
        className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1.5 text-xs font-semibold text-white"
      >
        <Users className="size-3.5" /> {session.participantCount}
      </button>
      <div className="relative">
        <button
          type="button"
          onClick={() => setInfoOpen((v) => !v)}
          aria-label="Class info"
          className="flex size-8 items-center justify-center rounded-full bg-black/50 text-white"
        >
          <ShieldCheck className="size-4" />
        </button>
        {infoOpen && (
          <div className="absolute right-0 top-10 z-30 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-3 text-xs shadow-lg">
            <p className="font-semibold text-ensena-ink">{session.typeLabel}</p>
            <p className="mt-0.5 text-ensena-muted">
              {session.subject}
              {session.topic ? ` • ${session.topic}` : ""}
            </p>
            <p className="mt-1.5 text-ensena-muted">
              {session.date} · {session.time} · {session.durationLabel}
            </p>
            <p className="mt-1 font-mono text-ensena-muted">{session.bookingReference}</p>
          </div>
        )}
      </div>
    </div>
  );
}

type ViewLayout = "speaker" | "side-by-side";

// A real layout switch — "Side by side" renders both real streams as equal
// tiles instead of one big + one floating, rather than being a decorative
// button that does nothing.
function ViewMenu({ layout, onChange }: { layout: ViewLayout; onChange: (layout: ViewLayout) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute right-3 top-3 z-10">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ensena-ink shadow">
        <LayoutGrid className="size-3.5" /> View
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-40 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("speaker");
              setOpen(false);
            }}
            className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium", layout === "speaker" ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-ink hover:bg-ensena-bg-soft")}
          >
            <LayoutGrid className="size-3.5" /> Speaker view
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("side-by-side");
              setOpen(false);
            }}
            className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-medium", layout === "side-by-side" ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-ink hover:bg-ensena-bg-soft")}
          >
            <Columns2 className="size-3.5" /> Side by side
          </button>
        </div>
      )}
    </div>
  );
}

// `stream` is the real MediaStream to show — local (muted) or remote peer
// (unmuted). Null falls back to the person's profile photo: either the
// camera is genuinely off, or (group-teaching view, or the WebRTC
// connection hasn't come up yet) there's no real feed for this tile.
function BigVideo({ participant, camOn, stream, muted, sinkId, onTap }: { participant: ClassroomParticipantView; camOn: boolean; stream?: MediaStream | null; muted?: boolean; sinkId?: string | null; onTap?: () => void }) {
  return (
    <button type="button" onClick={onTap} className="block size-full cursor-pointer text-left">
      {!camOn ? (
        <div className="flex size-full items-center justify-center">
          <VideoOff className="size-8 text-white/60" />
        </div>
      ) : stream ? (
        <VideoStreamView stream={stream} muted={muted ?? false} sinkId={sinkId} />
      ) : (
        <AvatarFill name={participant.name} image={participant.image} large />
      )}
    </button>
  );
}

// The floating corner thumbnail in Speaker view — a small "swap" button in
// its corner does the exact same thing tapping the tile itself does
// (bring this person to the front); it's just also reachable as a
// dedicated control, matching the reference screen.
function FloatingTappableTile({ participant, camOn, micOn, stream, muted, sinkId, onTap }: { participant: ClassroomParticipantView; camOn: boolean; micOn: boolean; stream?: MediaStream | null; muted?: boolean; sinkId?: string | null; onTap: () => void }) {
  return (
    <div className={cn("absolute bottom-3 right-3 aspect-video w-24 overflow-hidden rounded-lg border-2 border-white shadow-lg sm:w-36", !camOn && "bg-ensena-ink")}>
      <button type="button" onClick={onTap} className="block size-full cursor-pointer text-left">
        {!camOn ? (
          <div className="flex size-full items-center justify-center">
            <VideoOff className="size-4 text-white" />
          </div>
        ) : stream ? (
          <VideoStreamView stream={stream} muted={muted ?? false} sinkId={sinkId} />
        ) : (
          <AvatarFill name={participant.name} image={participant.image} />
        )}
      </button>
      <button type="button" onClick={onTap} aria-label="Swap to full screen" className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
        <Repeat2 className="size-3" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
        {micOn ? <Mic className="size-2.5 shrink-0 text-white" /> : <MicOff className="size-2.5 shrink-0 text-white" />}
        <span className="truncate text-[10px] font-medium text-white">
          {participant.name} <span className="text-white/60">({participant.role === "tutor" ? "Tutor" : "Student"})</span>
        </span>
      </div>
    </div>
  );
}

// One tile in the desktop Group Class video grid — real video once the
// mesh connection is up (see use-group-webrtc-mesh.ts), a "Connecting…"
// state while it's still negotiating (never a broken/blank video element),
// and the person's real profile photo the moment their camera is off
// (never a black rectangle). Camera-off and mic-muted are read from the
// same enriched participant object the Participants panel reads, not
// re-derived here.
// `onSelect`, when passed, makes the whole tile tappable (grid → spotlight
// that one participant) and shows an explicit "expand" affordance on top —
// omitted entirely inside the spotlight's own thumbnail strip and big tile,
// which use their own tap targets instead.
function GroupVideoTile({
  participant,
  muted,
  sinkId,
  onSelect,
}: {
  participant: ClassroomParticipantView;
  muted: boolean;
  sinkId?: string | null;
  onSelect?: () => void;
}) {
  const connecting = participant.connectionState === "connecting" && participant.camOn && !participant.stream;
  const content = (
    <>
      {participant.role === "tutor" && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-ensena-primary px-2 py-0.5 text-[10px] font-semibold text-white">Tutor</span>
      )}
      {participant.camOn && participant.stream ? (
        // object-contain (baked into VideoStreamView) — the grid decides
        // this tile's box; the video never crops to fill it, so a natural,
        // un-zoomed camera frame is preserved regardless of the cell's shape.
        <VideoStreamView stream={participant.stream} muted={muted} sinkId={sinkId} />
      ) : connecting ? (
        <div className="flex size-full flex-col items-center justify-center gap-2 text-white/70">
          <span className="size-2 animate-pulse rounded-full bg-white" />
          <span className="text-xs font-medium">Connecting…</span>
        </div>
      ) : (
        <AvatarFill name={participant.name} image={participant.image} large />
      )}
      {onSelect && (
        <span className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Expand className="size-3.5" />
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-2.5 py-1.5">
        {participant.micOn ? <Mic className="size-3 shrink-0 text-white" /> : <MicOff className="size-3 shrink-0 text-rose-400" />}
        <span className="truncate text-xs font-medium text-white">
          {participant.name}
          {participant.isSelf && " (You)"}
        </span>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Full-screen ${participant.name}`}
        className="group relative block size-full min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-2xl bg-ensena-ink text-left"
      >
        {content}
      </button>
    );
  }

  return <div className="relative size-full min-h-0 min-w-0 overflow-hidden rounded-2xl bg-ensena-ink">{content}</div>;
}

// Measures the grid's actual rendered box via a real ResizeObserver — the
// gallery layout below is computed from real pixels, not a Tailwind
// breakpoint table, so it reflows correctly whether the window is
// maximized, split-screen, or the Participants/Chat panel just opened next
// to it. Purely a measurement of an existing DOM node; it never touches
// media/participant state, so a resize can never restart a stream.
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

// A real Zoom/Meet-style gallery computation: try every plausible column
// count, and for each, work out how large a tile CAN be once the grid
// divides the real measured box evenly into that many columns/rows — then
// keep whichever choice gives the largest tile. This is what lets the same
// component handle 2 participants (one huge row) and 18 (a dense multi-row
// grid) without a hardcoded per-count breakpoint, and it's also what
// guarantees the whole gallery fits the container exactly: rows × (height /
// rows) always equals the real height, so nothing ever needs to scroll.
// A tile's own shape is deliberately NOT locked to 16:9 here — the grid
// decides the box, VideoStreamView's object-contain decides how the actual
// camera frame sits inside whatever box it gets; sizing and framing are two
// separate concerns.
function computeGalleryLayout(count: number, width: number, height: number): { cols: number; rows: number } {
  if (count <= 0 || width <= 0 || height <= 0) return { cols: 1, rows: 1 };
  let best = { cols: 1, rows: count, area: -1 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellWidth = width / cols;
    const cellHeight = height / rows;
    // Caps how far a cell's own aspect ratio can outrun ~16:9 before the
    // real camera frame would just letterbox inside it anyway — a proxy for
    // "how much of this cell will the actual video use."
    const effectiveWidth = Math.min(cellWidth, cellHeight * (16 / 9));
    const effectiveHeight = Math.min(cellHeight, cellWidth * (9 / 16));
    const area = effectiveWidth * effectiveHeight;
    if (area > best.area) best = { cols, rows, area };
  }
  return { cols: best.cols, rows: best.rows };
}

// The Group Class desktop video grid — every ENROLLED participant isn't
// shown, only ones who've actually connected (see the caller's own filter):
// a real multi-party classroom populates and reflows as people join and
// leave, rather than a fixed set of placeholder cells. The container is
// `overflow-hidden` on purpose: the grid always divides the real measured
// box evenly (see computeGalleryLayout), so there is nothing left over to
// scroll — 2 participants and 20 both fit the same fixed viewport area.
function GroupVideoGrid({
  participants,
  speakerOn,
  sinkId,
  onSelectParticipant,
}: {
  participants: ClassroomParticipantView[];
  speakerOn: boolean;
  sinkId?: string | null;
  /** Tapping a tile spotlights that participant full-screen — omitted for the "others" aggregate tile, which has nothing real to spotlight. */
  onSelectParticipant?: (id: string) => void;
}) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const { cols, rows } = computeGalleryLayout(participants.length, size.width, size.height);
  return (
    <div ref={containerRef} className="size-full min-h-0 overflow-hidden bg-ensena-ink p-3">
      <div
        className="grid size-full gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {participants.map((p) =>
          p.id === "others" ? (
            // A fellow student's own view keeps classmates outside the tutor
            // collapsed into one honest count rather than naming/streaming
            // them (existing privacy stance — see buildFromStudentGroupClass)
            // — a real aggregate indicator, never a fabricated video tile.
            <div key={p.id} className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl bg-white/5 text-white/70">
              <Users className="size-5" />
              <span className="text-xs font-medium">{p.name}</span>
            </div>
          ) : (
            <div key={p.id} className="min-h-0 min-w-0">
              <GroupVideoTile participant={p} muted={p.isSelf || !speakerOn} sinkId={sinkId} onSelect={onSelectParticipant ? () => onSelectParticipant(p.id) : undefined} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// Selecting a tile in the group grid lands here: one big spotlighted
// participant (same tap-to-swap convention as the 1:1 BigVideo/
// FloatingTappableTile pair below) plus a scrollable strip of everyone else,
// any of whom can be tapped to become the new spotlight. Exiting returns to
// the plain adaptive grid rather than tracking a separate "was I ever in
// spotlight" flag — spotlightId itself is the only state that matters.
function GroupVideoSpotlight({
  participants,
  spotlightId,
  speakerOn,
  sinkId,
  onSelect,
  onExit,
}: {
  participants: ClassroomParticipantView[];
  spotlightId: string;
  speakerOn: boolean;
  sinkId?: string | null;
  onSelect: (id: string) => void;
  onExit: () => void;
}) {
  const featured = participants.find((p) => p.id === spotlightId) ?? participants[0];
  const rest = participants.filter((p) => p.id !== featured.id);

  return (
    <div className="flex size-full min-h-0 flex-col gap-2 bg-ensena-ink p-3">
      <div className="relative min-h-0 flex-1">
        <GroupVideoTile participant={featured} muted={featured.isSelf || !speakerOn} sinkId={sinkId} />
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit full-screen"
          className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          <Minimize2 className="size-3.5" />
        </button>
      </div>
      {rest.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
          {rest.map((p) =>
            p.id === "others" ? (
              <div key={p.id} className="flex aspect-video w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-white/5 text-white/70 sm:w-32">
                <Users className="size-4" />
                <span className="text-[10px] font-medium">{p.name}</span>
              </div>
            ) : (
              <div key={p.id} className="aspect-video w-24 shrink-0 sm:w-32">
                <GroupVideoTile participant={p} muted={p.isSelf || !speakerOn} sinkId={sinkId} onSelect={() => onSelect(p.id)} />
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// "Video" mode — fills the whole main stage, and behaves like a real
// video call: tap either the big video or the floating thumbnail to swap
// which one is full-screen (matches tapping a person's tile in Zoom/
// FaceTime). A tutor teaching a group class gets a "Teaching View" (their
// own camera large) with a participant strip — tapping any strip tile
// focuses that student full-screen; tapping the big video again returns
// to Teaching View. Camera-off always falls back to the person's real
// profile photo, never a generic avatar.
export function ClassroomVideoSection({ session, state, compact = false }: { session: ClassroomSession; state: ClassroomLiveState; compact?: boolean }) {
  // state.participants (not session.participants) — the live-enriched
  // array classroom-shell.tsx merges hand-raise and, for a Group Class, real
  // per-participant stream/connectionState/mic/cam onto. This component
  // previously read the frozen static prop instead, which is exactly why a
  // Group Class's video tiles could never reflect who'd actually connected.
  const self = state.participants.find((p) => p.isSelf);
  const others = state.participants.filter((p) => !p.isSelf);
  const isGroupTeaching = session.kind === "group" && session.role === "tutor" && !!self;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [layout, setLayout] = useState<ViewLayout>("speaker");
  // Group Class only — which participant (if any) is currently spotlighted
  // full-screen out of the adaptive grid. Kept separate from `focusedId`
  // (the 1:1 private-call swap state) since the two modes never coexist.
  const [groupSpotlightId, setGroupSpotlightId] = useState<string | null>(null);

  if (state.screenSharing) {
    return (
      <div className="relative size-full overflow-hidden">
        <ScreenShareView role={session.role} screenSharing={state.screenSharing} />
        {self && <FloatingTappableTile participant={self} camOn={state.camOn} micOn={state.micOn} stream={state.localStream} muted onTap={() => {}} />}
      </div>
    );
  }

  if (isGroupTeaching && self) {
    const strip = others.filter((p) => p.id !== "others");

    // Mobile Group Class reference screen uses a uniform gallery grid
    // (tutor included as just another cell, distinguished only by a red
    // mic icon) rather than desktop's big-video-plus-roster layout — real
    // video where it exists (self's own camera); every other tile is the
    // same honest profile-photo fallback the rest of this app already uses
    // for group participants, since real multi-party video needs a mesh/
    // SFU architecture this pass doesn't build.
    if (compact) {
      const gallery = [self, ...strip];
      return (
        <div className="grid size-full grid-cols-2 gap-1 overflow-y-auto bg-ensena-ink p-1">
          {gallery.map((p) => {
            const isSelf = p.id === self.id;
            return (
              <div key={p.id} className="relative aspect-video overflow-hidden rounded-lg bg-ensena-ink">
                {isSelf && state.camOn && state.localStream ? (
                  <VideoStreamView stream={state.localStream} muted />
                ) : (
                  <AvatarFill name={p.name} image={p.image} />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                  {(isSelf ? state.micOn : p.micOn) ? (
                    <Mic className={cn("size-2.5 shrink-0", isSelf ? "text-rose-500" : "text-emerald-400")} />
                  ) : (
                    <MicOff className="size-2.5 shrink-0 text-white" />
                  )}
                  <span className="truncate text-[10px] font-medium text-white">
                    {p.name}
                    {isSelf && " (You)"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Desktop: a real multi-participant grid (tutor included as just
    // another equally-sized tile, badged) instead of the old big-tutor-
    // plus-strip layout — only participants who've actually joined the
    // real-time classroom get a tile; a merely-enrolled student who hasn't
    // connected yet doesn't produce an empty placeholder cell.
    const joined = [self, ...strip.filter((p) => p.connectionState !== "not-joined")];
    return groupSpotlightId && joined.some((p) => p.id === groupSpotlightId) ? (
      <GroupVideoSpotlight
        participants={joined}
        spotlightId={groupSpotlightId}
        speakerOn={state.speakerOn}
        sinkId={state.selectedSpeakerId}
        onSelect={setGroupSpotlightId}
        onExit={() => setGroupSpotlightId(null)}
      />
    ) : (
      <GroupVideoGrid participants={joined} speakerOn={state.speakerOn} sinkId={state.selectedSpeakerId} onSelectParticipant={setGroupSpotlightId} />
    );
  }

  // A student's own view of a Group Class gets the same real grid on
  // desktop — previously this fell through to the generic 1:1 "peer" path
  // below, which only ever shows the tutor via the 1:1 WebRTC hook
  // (deliberately disabled for group classes) and so never carried a real
  // stream. Mobile (compact) intentionally still falls through unchanged.
  if (session.kind === "group" && !compact && self) {
    // The tutor's own tile always shows (as "Connecting…" if they haven't
    // joined yet) — they're the reason the student is here at all. The
    // static "N other students" aggregate placeholder (id "others", a
    // stand-in from back when this view had no real per-classmate video) is
    // deliberately excluded now that the mesh gives every actually-connected
    // classmate their own real tile — keeping both would double-count them
    // (a live tile for the real peer AND a stale placeholder still claiming
    // "N more"), which is exactly the "connected != enrolled" bug this
    // grid exists to avoid.
    const joined = [self, ...others.filter((p) => p.id !== "others" && (p.role === "tutor" || p.connectionState !== "not-joined"))];
    return groupSpotlightId && joined.some((p) => p.id === groupSpotlightId) ? (
      <GroupVideoSpotlight
        participants={joined}
        spotlightId={groupSpotlightId}
        speakerOn={state.speakerOn}
        sinkId={state.selectedSpeakerId}
        onSelect={setGroupSpotlightId}
        onExit={() => setGroupSpotlightId(null)}
      />
    ) : (
      <GroupVideoGrid participants={joined} speakerOn={state.speakerOn} sinkId={state.selectedSpeakerId} onSelectParticipant={setGroupSpotlightId} />
    );
  }

  const peer = others.find((p) => p.id !== "others");
  const featured = focusedId === self?.id && self ? self : peer;
  const floating = featured?.id === peer?.id ? self : peer;
  // Only two people in this call, so tapping either tile always means the
  // same thing: bring whoever is currently floating to the front.
  const swap = floating ? () => setFocusedId(floating.id === self?.id ? self!.id : null) : undefined;
  const streamFor = (p: ClassroomParticipantView | undefined) => (p?.id === self?.id ? state.localStream : p?.id === peer?.id ? state.remoteStream : null);

  if (layout === "side-by-side" && self && peer) {
    return (
      <div className="relative grid size-full grid-cols-1 gap-0.5 overflow-hidden bg-ensena-ink sm:grid-cols-2">
        <ConnectionBadge peerConnectionState={state.peerConnectionState} />
        <ViewMenu layout={layout} onChange={setLayout} />
        <div className="relative overflow-hidden">
          <BigVideo participant={self} camOn={state.camOn} stream={state.localStream} muted />
          <NameBadge participant={self} micOn={state.micOn} />
        </div>
        <div className="relative overflow-hidden">
          <BigVideo participant={peer} camOn muted={!state.speakerOn} stream={state.remoteStream} sinkId={state.selectedSpeakerId} />
          <NameBadge participant={peer} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative size-full overflow-hidden bg-ensena-ink">
      {featured ? (
        <BigVideo
          participant={featured}
          camOn={featured.id === self?.id ? state.camOn : true}
          stream={streamFor(featured)}
          muted={featured.id === self?.id ? true : !state.speakerOn}
          sinkId={state.selectedSpeakerId}
          onTap={swap}
        />
      ) : (
        <div className="size-full bg-ensena-ink" />
      )}

      <ConnectionBadge peerConnectionState={state.peerConnectionState} />
      {compact ? <MobileVideoTopIcons session={session} state={state} /> : <ViewMenu layout={layout} onChange={setLayout} />}

      {featured && <NameBadge participant={featured} micOn={featured.id === self?.id ? state.micOn : undefined} />}

      {floating && swap && (
        <FloatingTappableTile
          participant={floating}
          camOn={floating.id === self?.id ? state.camOn : true}
          micOn={floating.id === self?.id ? state.micOn : true}
          stream={streamFor(floating)}
          muted={floating.id === self?.id ? true : !state.speakerOn}
          sinkId={state.selectedSpeakerId}
          onTap={swap}
        />
      )}
    </div>
  );
}
