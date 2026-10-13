import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import { ClassroomStage } from "@/components/classroom/classroom-stage";
import { ClassroomToolsPanel } from "@/components/classroom/classroom-tools-panel";
import { ClassroomToolbar } from "@/components/classroom/classroom-toolbar";
import { ClassroomBottomSheet } from "@/components/classroom/classroom-bottom-sheet";
import { PrivateVideoControls } from "@/components/classroom/mobile-video-controls";

// ONE classroom layout — desktop and mobile share the exact same
// components and behavior (mode-switching stage, tools panel, toolbar);
// only the arrangement differs. Desktop's Participants/Chat/Files/Notes/
// Settings panel is an on-demand drawer, closed by default (matching the
// Video mode reference screens, which show no side panel at all) — Group
// Class's own Whiteboard reference screen auto-opens it to "participants"
// instead (see classroom-toolbar.tsx's toggleWhiteboardMode). Mobile keeps
// the stage full-screen and surfaces the same tools panel as a dismissible
// bottom sheet, exactly as before this redesign.
export function ClassroomLayout({ role, session, state }: { role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState }) {
  const sidebarOpen = state.sidebarTab !== null;

  return (
    <>
      {/* Desktop / tablet-wide */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="flex min-h-0 flex-1 gap-4 p-4">
          <ClassroomStage role={role} session={session} state={state} />
          {sidebarOpen && (
            <div className="relative w-80 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 xl:w-96">
              <ClassroomToolsPanel role={role} session={session} state={state} variant="desktop" />
            </div>
          )}
        </div>
        <ClassroomToolbar
          role={role}
          session={session}
          state={state}
          onOpenChat={() => state.setSidebarTab("chat")}
          onOpenFiles={() => state.setSidebarTab("resources")}
          onOpenNotes={() => state.setSidebarTab("notes")}
          onOpenParticipants={() => state.setSidebarTab("participants")}
        />
      </div>

      {/* Mobile / narrow tablet — full-screen stage, sheet for everything else.
          Group Class Video mode floats its own control card over the stage
          instead (see MobileVideoControls); Private Class Video mode gets a
          real docked bar below (see PrivateVideoControls further down). */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <ClassroomStage role={role} session={session} state={state} compact />
        {state.mainMode !== "video" && (
          <ClassroomToolbar
            role={role}
            session={session}
            state={state}
            compact
            onOpenMore={() => state.setSheetOpen(true)}
            onOpenParticipants={() => state.setActiveTool("participants")}
            onOpenChat={() => state.setActiveTool("chat")}
            onOpenFiles={() => state.setActiveTool("resources")}
          />
        )}
        {/* Private Class's mobile Video reference screen: a real docked
            control bar (Mic/Camera/Whiteboard/Tools/Chat/More) rather than
            Group Class's floating card over the call — see mobile-video-
            controls.tsx's PrivateVideoControls doc comment. */}
        {state.mainMode === "video" && session.kind !== "group" && (
          <PrivateVideoControls
            state={state}
            onOpenChat={() => {
              state.setActiveTool("chat");
              state.setSheetOpen(true);
            }}
            onOpenTools={() => state.setSheetOpen(true)}
            onOpenMore={() => state.setSheetOpen(true)}
          />
        )}
        <ClassroomBottomSheet role={role} session={session} state={state} />
      </div>
    </>
  );
}
