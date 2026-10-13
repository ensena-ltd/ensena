"use client";

import { useEffect } from "react";
import { PhoneOff } from "lucide-react";

import type { ClassroomLiveState } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { ClassroomToolsPanel } from "@/components/classroom/classroom-tools-panel";

// Mobile-only. Full-screen video/whiteboard/lab stays the default view;
// this is a dismissible overlay for picking a different mode or opening a
// class tool, rather than a panel permanently eating classroom space.
export function ClassroomBottomSheet({ role, session, state }: { role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState }) {
  useEffect(() => {
    if (!state.sheetOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") state.setSheetOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sheetOpen]);

  if (!state.sheetOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:hidden">
      <button type="button" aria-label="Close" onClick={() => state.setSheetOpen(false)} className="absolute inset-0 bg-black/60" />
      <div className="relative flex max-h-[75vh] w-full flex-col rounded-t-3xl bg-neutral-900">
        <button
          type="button"
          aria-label="Swipe down to close"
          onClick={() => state.setSheetOpen(false)}
          className="flex shrink-0 items-center justify-center py-3"
        >
          <span className="h-1 w-10 rounded-full bg-white/25" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          <ClassroomToolsPanel
            role={role}
            session={session}
            state={state}
            onNavigate={() => state.setSheetOpen(false)}
            onSelectTool={(tool) => {
              state.openToolFullscreen(tool);
              state.setSheetOpen(false);
            }}
          />
        </div>
        {/* Private Class's mobile Video reference screen has no dedicated
            hang-up button in its own docked control bar (see mobile-video-
            controls.tsx's PrivateVideoControls) — this "More" sheet is
            where Leave/End Class stays reachable for every mobile screen. */}
        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => {
              state.setSheetOpen(false);
              state.onLeave();
            }}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <PhoneOff className="size-4" /> {role === "tutor" ? "End Class" : "Leave Classroom"}
          </button>
        </div>
      </div>
    </div>
  );
}
