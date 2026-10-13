"use client";

import { Clock, TriangleAlert } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { ClassroomVideoSection } from "@/components/classroom/classroom-video-section";
import { ClassroomLabSection } from "@/components/classroom/classroom-lab-section";
import { ClassroomToolsPanel } from "@/components/classroom/classroom-tools-panel";
import { DockedVideoColumn, FloatingSelfTile, FloatingVideoTiles, StripTile } from "@/components/classroom/classroom-video-bits";
import { MobileVideoControls } from "@/components/classroom/mobile-video-controls";

const MEDIA_ERROR_COPY: Record<string, string> = {
  denied: "Camera/microphone access denied. Allow it in your browser's site settings to be seen and heard.",
  "not-found": "No camera or microphone found on this device.",
  "in-use": "Your camera or microphone is being used by another app.",
  other: "Couldn't access your camera or microphone.",
};

// Loaded client-only, and at THIS outermost point rather than inside
// whiteboard.tsx itself — Excalidraw (and the whiteboard's own realtime/
// persistence hook chain) has no meaningful SSR output, and several of
// this app's classroom routes use generateStaticParams, which runs a real
// server-side render pass even for a "use client" page during `next build`.
// A dynamic import nested one level deeper (inside whiteboard.tsx) still
// left that whole module reachable from that server pass; dynamically
// importing the entire component here is what actually keeps it out of it.
const Whiteboard = dynamic(() => import("@/components/tutor-dashboard/classroom/whiteboard").then((m) => m.Whiteboard), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center bg-ensena-bg-soft text-sm text-ensena-muted">Loading whiteboard…</div>,
});

// The one full-screen teaching area — switches between Video / Whiteboard
// / Virtual Lab / Tools (Zoom-style) rather than stacking them. A small
// floating self-camera window persists over every mode except Video
// itself, where it already IS the video.
export function ClassroomStage({ role, session, state, compact = false }: { role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState; compact?: boolean }) {
  const self = session.participants.find((p) => p.isSelf);

  const showMediaError = state.mediaError && (state.mainMode === "video" || state.mainMode === "whiteboard-video");
  const stageRef = useRef<HTMLDivElement>(null);
  // Desktop-only choice between a real estate-taking docked video column
  // and the floating draggable tiles mobile always uses (no room for a
  // docked column there) — see DockedVideoColumn's own doc comment.
  const [videoLayout, setVideoLayout] = useState<"docked" | "floating">("docked");
  const peer = session.participants.find((p) => !p.isSelf && p.id !== "others");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-black lg:rounded-2xl">
      {showMediaError && (
        <div className="z-20 flex items-center gap-2 bg-amber-500/90 px-3 py-2 text-xs font-medium text-black">
          <TriangleAlert className="size-3.5 shrink-0" />
          {MEDIA_ERROR_COPY[state.mediaError!]}
          <button type="button" onClick={state.retryMedia} className="ml-auto shrink-0 rounded-full bg-black/10 px-2.5 py-1 font-semibold hover:bg-black/20">
            Try again
          </button>
        </div>
      )}
      <div ref={stageRef} className="relative min-h-0 flex-1">
        {state.mainMode === "video" && (
          <>
            <ClassroomVideoSection session={session} state={state} compact={compact} />
            {/* Group-teaching view already anchors a student strip along this same edge — skip the banner there rather than overlap it. */}
            {!(session.kind === "group" && role === "tutor") && (
              <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden max-w-[220px] items-start gap-2.5 rounded-xl bg-black/70 px-3 py-2.5 backdrop-blur lg:flex">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Class will end in {state.timerLabel}</p>
                  <p className="text-[11px] text-white/50">
                    Started at {session.time} · {session.durationLabel} session
                  </p>
                </div>
              </div>
            )}
            {/* Group Class's mobile Video reference screen floats one control
                card over the call instead of docking a bar underneath it —
                Private Class's own reference screen uses a real docked bar
                instead (rendered as a sibling below the stage, see
                classroom-layout.tsx's PrivateVideoControls); desktop keeps
                its own toolbar below the stage either way. */}
            {compact && session.kind === "group" && (
              <MobileVideoControls
                role={role}
                session={session}
                state={state}
                timerLabel={state.timerLabel}
                onOpenMore={() => state.setSheetOpen(true)}
                onOpenTools={() => state.setSheetOpen(true)}
              />
            )}
          </>
        )}

        {(state.mainMode === "whiteboard" || state.mainMode === "whiteboard-video") && (
          <div className="flex size-full flex-col overflow-hidden bg-ensena-bg-soft">
            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1">
                <Whiteboard
                  classroomId={session.classroomId}
                  role={role}
                  selfName={role === "tutor" ? session.tutorName : (session.studentName ?? "You")}
                  subject={session.subject}
                  title={session.title}
                  compact={compact}
                  isGroup={session.kind === "group"}
                  studentNames={session.participants.filter((p) => p.role === "student").map((p) => p.name)}
                  onNotice={state.showNotice}
                  onHighConfidenceViolation={state.reportHighConfidenceViolation}
                  onOpenChat={() => (compact ? state.setActiveTool("chat") : state.setSidebarTab("chat"))}
                  onOpenFiles={() => (compact ? state.setActiveTool("resources") : state.setSidebarTab("resources"))}
                  onOpenNotes={() => (compact ? state.setActiveTool("notes") : state.setSidebarTab("notes"))}
                />
              </div>
              {/* Group Class's own Whiteboard reference screen shows
                  everyone's video inside the Participants side panel instead
                  (see classroom-participants-rail.tsx) — there's no single
                  "the other participant" to dock for a room with many
                  students, so this docked column stays a 1:1 concept. */}
              {state.mainMode === "whiteboard-video" && self && peer && videoLayout === "docked" && session.kind !== "group" && (
                <DockedVideoColumn self={self} peer={peer} state={state} onSwitchToFloating={() => setVideoLayout("floating")} />
              )}
            </div>
            {/* Mobile Group Class reference screen: a compact, always-visible
                horizontal strip — the full Participants panel stays one tap
                away via the bottom nav instead of auto-opening a disruptive
                full-height sheet (see classroom-toolbar.tsx). */}
            {compact && session.kind === "group" && state.mainMode === "whiteboard-video" && (
              <div className="flex shrink-0 gap-1.5 overflow-x-auto border-t border-ensena-border bg-ensena-surface p-2">
                {session.participants.map((p) => (
                  <StripTile key={p.id} participant={p} />
                ))}
              </div>
            )}
          </div>
        )}

        {state.mainMode === "lab" && session.labApplies && <ClassroomLabSection role={role} session={session} state={state} />}

        {state.mainMode === "tools" && (
          <div className="size-full bg-neutral-900">
            <ClassroomToolsPanel role={role} session={session} state={state} showTip />
          </div>
        )}

        {state.mainMode === "whiteboard-video" && self && peer && session.kind !== "group" ? (
          <>
            {/* Mobile has no docked column to fall back to — always floating there. */}
            <div className="lg:hidden">
              <FloatingVideoTiles self={self} peer={peer} state={state} boundsRef={stageRef} />
            </div>
            {videoLayout === "floating" && (
              <div className="hidden lg:block">
                <FloatingVideoTiles self={self} peer={peer} state={state} boundsRef={stageRef} />
              </div>
            )}
          </>
        ) : (
          state.mainMode !== "video" &&
          !(state.mainMode === "whiteboard-video" && session.kind === "group") &&
          self && <FloatingSelfTile self={self} state={state} />
        )}
      </div>
    </div>
  );
}
