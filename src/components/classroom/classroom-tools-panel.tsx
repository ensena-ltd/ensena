import { useState } from "react";
import {
  ChevronLeft,
  ChevronsRight,
  Clock,
  ClipboardList,
  FlaskConical,
  Lightbulb,
  MessageSquare,
  PenSquare,
  Presentation,
  Search,
  Settings,
  StickyNote,
  Users,
  Video,
  Layers,
  X,
} from "lucide-react";

import type { ClassroomLiveState, MainMode, ToolKey } from "@/components/classroom/classroom-shell";
import type { ClassroomRole, ClassroomSession } from "@/lib/classroom-data";
import { ClassroomChatPanel } from "@/components/classroom/panels/classroom-chat-panel";
import { ClassroomMaterialsPanel } from "@/components/classroom/panels/classroom-materials-panel";
import { ClassroomParticipantsRail } from "@/components/classroom/classroom-participants-rail";
import { VideoStreamView } from "@/components/classroom/classroom-video-bits";
import { cn } from "@/lib/utils";

const MODE_CARDS: { key: MainMode; label: string; description: string; icon: typeof Video }[] = [
  { key: "video", label: "Video", description: "Talk and engage face-to-face", icon: Video },
  { key: "whiteboard", label: "Whiteboard", description: "Draw, write and solve together", icon: PenSquare },
  { key: "whiteboard-video", label: "Whiteboard + Video", description: "Teach on the board, stay face-to-face", icon: Layers },
  { key: "lab", label: "Virtual Laboratory", description: "Run experiments and explore", icon: FlaskConical },
];

const TOOL_ROWS: { key: ToolKey; label: string; icon: typeof MessageSquare }[] = [
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "participants", label: "Participants", icon: Users },
  { key: "activities", label: "Activities", icon: ClipboardList },
  { key: "resources", label: "Files", icon: Presentation },
  { key: "notes", label: "Lesson Notes", icon: StickyNote },
  { key: "timer", label: "Timer", icon: Clock },
  { key: "settings", label: "Settings", icon: Settings },
];

// The tabs that are always the desktop side panel's "home" — Participants
// and Class Chat, for every session kind (matches the reference screens
// exactly). Mobile's bottom sheet still uses the full mode-picker + tool
// grid below (unchanged) — this constant only governs the DESKTOP variant.
const HOME_TABS: ToolKey[] = ["participants", "chat"];
// Group classes additionally surface Activities in that same tab strip —
// unchanged from before.
const GROUP_TABS: ToolKey[] = ["participants", "chat", "activities"];

function ActivitiesPanel() {
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <ClipboardList className="size-8 text-white/40" />
      <p className="text-sm font-medium text-white">No activity running</p>
      <p className="text-xs text-white/50">When your tutor starts a question or quiz, it will appear here for everyone.</p>
    </div>
  );
}

function NotesPanel({ role, state }: { role: ClassroomRole; state: ClassroomLiveState }) {
  return (
    <div className="p-4">
      {role === "tutor" ? (
        <textarea
          value={state.notes}
          onChange={(e) => state.setNotes(e.target.value)}
          placeholder="e.g. Covered quadratic equations and factorisation."
          rows={8}
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-ensena-primary"
        />
      ) : state.notes.trim() ? (
        <p className="whitespace-pre-wrap rounded-xl border border-white/15 bg-white/5 p-3 text-sm text-white">{state.notes}</p>
      ) : (
        <p className="text-sm text-white/50">Your tutor hasn&apos;t added notes for this lesson yet.</p>
      )}
    </div>
  );
}

function TimerPanel({ timerLabel, session }: { timerLabel: string; session: ClassroomSession }) {
  return (
    <div className="flex flex-col items-center gap-2 p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-ensena-primary/15 text-ensena-primary">
        <Clock className="size-7" />
      </span>
      <p className="font-mono text-3xl font-semibold text-white">{timerLabel}</p>
      <p className="text-xs text-white/50">remaining · {session.durationLabel} session</p>
    </div>
  );
}

function DeviceSelect({ label, value, options, onChange, disabled }: { label: string; value: string | null; options: { deviceId: string; label: string }[]; onChange: (deviceId: string) => void; disabled?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-white/60">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 text-sm text-white outline-none focus:border-ensena-primary disabled:opacity-50"
      >
        {options.length === 0 && <option value="">No devices found</option>}
        {options.map((opt) => (
          <option key={opt.deviceId} value={opt.deviceId} className="text-ensena-ink">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SettingsPanel({
  mediaError,
  retryMedia,
  state,
}: {
  mediaError: ClassroomLiveState["mediaError"];
  retryMedia: () => void;
  state: ClassroomLiveState;
}) {
  const errorCopy: Record<NonNullable<ClassroomLiveState["mediaError"]>, string> = {
    denied: "Camera/microphone access was denied. Allow access in your browser's site settings, then try again.",
    "not-found": "No camera or microphone was found on this device.",
    "in-use": "Your camera or microphone is being used by another app. Close it and try again.",
    other: "Couldn't access your camera or microphone.",
  };

  if (mediaError) {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center">
        <Settings className="size-8 text-white/40" />
        <p className="text-sm text-rose-300">{errorCopy[mediaError]}</p>
        <button type="button" onClick={retryMedia} className="text-xs font-semibold text-ensena-primary">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-neutral-800">
        {state.camOn && state.localStream ? (
          <VideoStreamView stream={state.localStream} muted className="scale-x-[-1]" />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-white/40">Camera is off</div>
        )}
      </div>

      <DeviceSelect label="Camera" value={state.selectedCameraId} options={state.cameras} onChange={state.setCameraId} />
      <DeviceSelect label="Microphone" value={state.selectedMicId} options={state.microphones} onChange={state.setMicId} />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-white/60">Microphone level</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-100" style={{ width: `${Math.round(state.micLevel * 100)}%` }} />
        </div>
        <span className="text-[11px] text-white/40">{state.micOn ? "Speak to test your microphone." : "Unmute to test your microphone."}</span>
      </div>

      {state.canSelectSpeaker ? (
        <DeviceSelect label="Speaker" value={state.selectedSpeakerId} options={state.speakers} onChange={state.setSpeakerId} />
      ) : (
        <p className="text-[11px] text-white/40">This browser doesn&apos;t support choosing a specific speaker. Audio plays on your system default.</p>
      )}
    </div>
  );
}

function ToolContent({ tool, role, session, state }: { tool: ToolKey; role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState }) {
  if (tool === "chat") return <ClassroomChatPanel role={role} chat={state.chat} onSend={state.sendChat} />;
  if (tool === "resources") return <ClassroomMaterialsPanel role={role} materials={state.resources} onOpen={state.openResource} onAdd={state.addResource} />;
  if (tool === "notes") return <NotesPanel role={role} state={state} />;
  if (tool === "timer") return <TimerPanel timerLabel={state.timerLabel} session={session} />;
  if (tool === "settings") return <SettingsPanel mediaError={state.mediaError} retryMedia={state.retryMedia} state={state} />;
  if (tool === "activities") return <ActivitiesPanel />;
  return null;
}

// The reusable "Choose a mode" + "Class Tools" launcher — this is MOBILE
// ONLY now (the bottom sheet, and the full-screen mobile "tools" stage
// mode); the desktop side panel below has its own always-open Participants/
// Class Chat home instead. Picking a class tool drills in (with a back
// arrow) rather than opening a separate surface.
function MobileToolsPanel({
  role,
  session,
  state,
  onNavigate,
  onSelectTool,
  showTip,
}: {
  role: ClassroomRole;
  session: ClassroomSession;
  state: ClassroomLiveState;
  onNavigate?: () => void;
  onSelectTool: (tool: ToolKey) => void;
  showTip: boolean;
}) {
  const isCounselling = session.kind === "counselling";
  const isGroup = session.kind === "group";
  const modeCards = isCounselling ? MODE_CARDS.filter((c) => c.key === "video") : MODE_CARDS;
  const toolRows = TOOL_ROWS.filter((t) => (t.key === "resources" ? !isCounselling : t.key === "activities" ? isGroup : true));

  if (state.activeTool) {
    const tool = TOOL_ROWS.find((t) => t.key === state.activeTool)!;
    const isGroupTab = isGroup && GROUP_TABS.includes(state.activeTool);
    return (
      <div className="flex size-full flex-col">
        {isGroupTab ? (
          <div className="flex shrink-0 items-center border-b border-white/10 px-2">
            {GROUP_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => state.setActiveTool(tab)}
                className={cn(
                  "border-b-2 px-3 py-3 text-xs font-semibold capitalize",
                  state.activeTool === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-white/60 hover:text-white"
                )}
              >
                {TOOL_ROWS.find((t) => t.key === tab)?.label}
                {tab === "participants" && ` (${session.participantCount})`}
              </button>
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => state.setActiveTool(null)} className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
            <ChevronLeft className="size-4" /> {tool.label}
          </button>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.activeTool === "participants" ? (
            <div className="p-4">
              <ClassroomParticipantsRail role={role} participants={state.participants} onToggleMute={state.toggleParticipantMic} onLowerHand={state.lowerHand} groupMode={isGroup} />
            </div>
          ) : (
            <ToolContent tool={state.activeTool} role={role} session={session} state={state} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col gap-5 overflow-y-auto p-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Choose a mode</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          {modeCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                state.setMainMode(card.key);
                onNavigate?.();
              }}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                state.mainMode === card.key ? "border-ensena-primary bg-ensena-primary/10" : "border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              <card.icon className={cn("size-5", state.mainMode === card.key ? "text-ensena-primary" : "text-white")} />
              <span>
                <span className="block text-sm font-semibold text-white">{card.label}</span>
                <span className="block text-xs text-white/50">{card.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Class Tools</p>
        <div className="grid grid-cols-2 gap-2">
          {toolRows.map((tool) => (
            <button
              key={tool.key}
              type="button"
              onClick={() => {
                onSelectTool(tool.key);
                onNavigate?.();
              }}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/10"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white">
                <tool.icon className="size-4 text-white/70" />
                {tool.label}
                {tool.key === "chat" && state.chat.length > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-bold text-white">{state.chat.length}</span>
                )}
                {tool.key === "participants" && <span className="text-[10px] text-white/40">({session.participantCount})</span>}
              </span>
              <ChevronsRight className="size-3.5 text-white/30" />
            </button>
          ))}
        </div>
      </div>

      {showTip && (
        <div className="mt-auto flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
          <Lightbulb className="size-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200/90">You can switch between modes anytime during the class.</p>
        </div>
      )}
    </div>
  );
}

// Desktop side panel — Participants/Class Chat are the permanent "home"
// tabs (matching the reference screens exactly, for both private and group
// classes), with a real search filter and an explicit close (X) that
// collapses the panel and expands the main classroom surface. Every other
// class tool (Files/Activities/Timer/Settings) is a one-off drill-in with
// its own back-chevron header, reached from the bottom toolbar.
function DesktopSidePanel({ role, session, state }: { role: ClassroomRole; session: ClassroomSession; state: ClassroomLiveState }) {
  const isGroup = session.kind === "group";
  const [query, setQuery] = useState("");

  if (!state.sidebarTab) return null;

  const homeTabs = isGroup ? GROUP_TABS : HOME_TABS;
  const isHomeTab = homeTabs.includes(state.sidebarTab);
  const tool = TOOL_ROWS.find((t) => t.key === state.sidebarTab);

  const filteredParticipants = query.trim()
    ? state.participants.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
    : state.participants;

  return (
    <div className="flex size-full flex-col">
      {isHomeTab ? (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-2">
          <div className="flex items-center overflow-x-auto">
            {homeTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => state.setSidebarTab(tab)}
                className={cn(
                  "border-b-2 px-3 py-3 text-xs font-semibold whitespace-nowrap",
                  state.sidebarTab === tab ? "border-ensena-primary text-ensena-primary" : "border-transparent text-white/60 hover:text-white"
                )}
              >
                {tab === "participants" ? `Participants (${session.participantCount})` : tab === "chat" ? "Class Chat" : "Activities"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => state.setSidebarTab(null)} aria-label="Close panel" className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-2">
          <button type="button" onClick={() => state.setSidebarTab("participants")} className="flex items-center gap-2 px-2 py-3 text-sm font-semibold text-white">
            <ChevronLeft className="size-4" /> {tool?.label}
          </button>
          <button type="button" onClick={() => state.setSidebarTab(null)} aria-label="Close panel" className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {state.sidebarTab === "participants" ? (
          <div className="flex flex-col gap-3 p-3">
            {/* Group Class's own reference screen has no search box here —
                just the banner + Tutor row + Students grid (see
                classroom-participants-rail.tsx). Private Class's flat list
                gets a real search filter instead. */}
            {!isGroup && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search participants"
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 pl-8 pr-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-ensena-primary"
                />
              </div>
            )}
            <ClassroomParticipantsRail role={role} participants={isGroup ? state.participants : filteredParticipants} onToggleMute={state.toggleParticipantMic} onLowerHand={state.lowerHand} groupMode={isGroup} />
          </div>
        ) : (
          <ToolContent tool={state.sidebarTab} role={role} session={session} state={state} />
        )}
      </div>
    </div>
  );
}

export function ClassroomToolsPanel({
  role,
  session,
  state,
  onNavigate,
  onSelectTool,
  showTip = false,
  variant = "mobile",
}: {
  role: ClassroomRole;
  session: ClassroomSession;
  state: ClassroomLiveState;
  /** Mobile only. */
  onNavigate?: () => void;
  /** Mobile only: must also switch the stage into "tools" mode via `state.openToolFullscreen`, since there's no permanent panel to show it in otherwise. */
  onSelectTool?: (tool: ToolKey) => void;
  showTip?: boolean;
  /** "desktop" renders the persistent Participants/Class Chat side panel (driven by `state.sidebarTab`); "mobile" (default) renders the original bottom-sheet/full-screen mode-picker (driven by `state.activeTool`) — kept byte-for-byte the same as before this redesign. */
  variant?: "desktop" | "mobile";
}) {
  if (variant === "desktop") return <DesktopSidePanel role={role} session={session} state={state} />;
  return <MobileToolsPanel role={role} session={session} state={state} onNavigate={onNavigate} onSelectTool={onSelectTool ?? state.setActiveTool} showTip={showTip} />;
}
