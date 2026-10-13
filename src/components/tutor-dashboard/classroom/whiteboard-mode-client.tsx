"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Calculator,
  Camera,
  CameraOff,
  Circle,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  Send,
  X,
} from "lucide-react";

import { TeachingToolsPanel } from "@/components/tutor-dashboard/classroom/teaching-tools-panel";
import type { ClassroomChatMessage, ClassroomParticipant } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

// See the matching comment in classroom-stage.tsx.
const Whiteboard = dynamic(() => import("@/components/tutor-dashboard/classroom/whiteboard").then((m) => m.Whiteboard), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center bg-ensena-bg-soft text-sm text-ensena-muted">Loading whiteboard…</div>,
});

type Sheet = "chat" | "tools" | null;

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

interface WhiteboardModeClientProps {
  title: string;
  timer: string;
  recording: boolean;
  participants: ClassroomParticipant[];
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleHand: () => void;
  onEndClass: () => void;
  chat: ClassroomChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSendChat: () => void;
}

export function WhiteboardModeClient({
  title,
  timer,
  recording,
  participants,
  micOn,
  camOn,
  handRaised,
  onToggleMic,
  onToggleCam,
  onToggleHand,
  onEndClass,
  chat,
  draft,
  onDraftChange,
  onSendChat,
}: WhiteboardModeClientProps) {
  const [activeSheet, setActiveSheet] = useState<Sheet>(null);
  const students = participants.filter((p) => p.role === "student");

  return (
    <div className="flex h-screen flex-col bg-ensena-ink">
      {/* Top: title/timer + End Class (always fully visible) */}
      <div className="flex shrink-0 items-center justify-between gap-2 bg-ensena-ink px-2.5 pt-2.5">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">{title}</span>
          <span className="flex items-center gap-1 text-[11px] text-white/60">
            {recording && <Circle className="size-2 fill-rose-500 text-rose-500" />}
            {timer}
          </span>
        </div>
        <button type="button" onClick={onEndClass} className="shrink-0 rounded-full bg-ensena-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-ensena-primary-hover">
          End Class
        </button>
      </div>

      {/* Compact video strip */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 bg-ensena-ink p-2.5">
        <div className="relative flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ensena-primary/30 text-white">
          {camOn ? <span className="text-sm font-semibold">You</span> : <CameraOff className="size-5 text-white/60" />}
          <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-black/50">
            {micOn ? <Mic className="size-3 text-white" /> : <MicOff className="size-3 text-rose-400" />}
          </span>
        </div>

        {students.map((p) => (
          <div key={p.id} className="relative flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10 text-white">
            {p.camOn ? <span className="text-xs font-semibold">{initials(p.name)}</span> : <CameraOff className="size-5 text-white/40" />}
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-black/50">
              {p.micOn ? <Mic className="size-3 text-white" /> : <MicOff className="size-3 text-rose-400" />}
            </span>
            {p.handRaised && <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-amber-500"><Hand className="size-3 text-white" /></span>}
          </div>
        ))}
      </div>

      {/* Bottom: infinite whiteboard */}
      <div className="min-h-0 flex-1 bg-white">
        <Whiteboard compact width={900} height={1300} />
      </div>

      {/* Floating controls — hidden while a bottom sheet is open, since the sheet covers this area */}
      {!activeSheet && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2">
          <button
            type="button"
            onClick={onToggleMic}
            aria-label="Toggle microphone"
            className={cn("pointer-events-auto flex size-12 items-center justify-center rounded-full shadow-lg", micOn ? "bg-white text-ensena-ink" : "bg-rose-600 text-white")}
          >
            {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button
            type="button"
            onClick={onToggleCam}
            aria-label="Toggle camera"
            className={cn("pointer-events-auto flex size-12 items-center justify-center rounded-full shadow-lg", camOn ? "bg-white text-ensena-ink" : "bg-rose-600 text-white")}
          >
            {camOn ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
          </button>
          <button
            type="button"
            onClick={onToggleHand}
            aria-label="Raise hand"
            className={cn("pointer-events-auto flex size-12 items-center justify-center rounded-full shadow-lg", handRaised ? "bg-amber-500 text-white" : "bg-white text-ensena-ink")}
          >
            <Hand className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSheet("tools")}
            aria-label="Open teaching tools"
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white text-ensena-ink shadow-lg"
          >
            <Calculator className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => setActiveSheet("chat")}
            aria-label="Open chat"
            className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white text-ensena-ink shadow-lg"
          >
            <MessageCircle className="size-5" />
          </button>
        </div>
      )}

      {/* Bottom sheet: chat or teaching tools, with a header switcher between the two */}
      {activeSheet && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-ensena-border bg-ensena-surface shadow-2xl">
          <div className="flex items-center justify-between gap-2 border-b border-ensena-border p-2">
            <div className="flex gap-1 rounded-full bg-ensena-bg-soft p-1">
              <button
                type="button"
                onClick={() => setActiveSheet("tools")}
                aria-label="Switch to teaching tools"
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", activeSheet === "tools" ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted")}
              >
                <Calculator className="size-3.5" /> Tools
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet("chat")}
                aria-label="Switch to chat"
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", activeSheet === "chat" ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted")}
              >
                <MessageCircle className="size-3.5" /> Chat
              </button>
            </div>
            <button type="button" onClick={() => setActiveSheet(null)} aria-label="Close panel" className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-ensena-bg-soft">
              <X className="size-4" />
            </button>
          </div>

          {activeSheet === "chat" && (
            <>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-2.5">
                  {chat.map((m) => (
                    <div key={m.id} className="rounded-xl bg-ensena-bg-soft px-3 py-2 text-sm">
                      <p className="text-xs font-semibold text-ensena-ink">{m.sender} <span className="ml-1 font-normal text-ensena-muted">{m.time}</span></p>
                      <p className="text-ensena-ink">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 border-t border-ensena-border p-3">
                <input
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSendChat()}
                  placeholder="Message everyone…"
                  className="h-10 flex-1 rounded-full border border-ensena-border px-3.5 text-sm"
                />
                <button type="button" onClick={onSendChat} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
                  <Send className="size-4" />
                </button>
              </div>
            </>
          )}

          {activeSheet === "tools" && <TeachingToolsPanel onClose={() => setActiveSheet(null)} hideHeader />}
        </div>
      )}
    </div>
  );
}
