"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Camera,
  CameraOff,
  Circle,
  ClipboardList,
  MessageSquare,
  Mic,
  MicOff,
  MonitorPlay,
  Send,
  Shield,
  Users,
  Wifi,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminMsgTutorModal } from "@/components/admin/admin-msg-tutor-modal";
import { useAdminSession } from "@/hooks/use-admin-session";
import {
  buildClassroomChatSeed,
  buildLiveClassroomState,
  studentConnectionStyles,
  type AdminClassroomChatMessage,
  type GroupClassRow,
  type LiveStudentStatus,
} from "@/lib/admin-group-classes-data";
import { cn } from "@/lib/utils";

// See the matching comment in classroom-stage.tsx — Excalidraw and the
// whiteboard's realtime/persistence hook chain must stay out of the server
// render entirely, including the one that runs for this page's own
// generateStaticParams during `next build`.
const Whiteboard = dynamic(() => import("@/components/tutor-dashboard/classroom/whiteboard").then((m) => m.Whiteboard), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center bg-white text-sm text-ensena-muted">Loading whiteboard…</div>,
});

type MainView = "gallery" | "whiteboard";
type SidePanel = "chat" | "participants" | "attendance" | null;

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function useElapsedTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Admin "Join" = becoming a real, visible participant in the live
// classroom — reuses the tutor classroom's dark video-call visual language
// (see tutor-dashboard/classroom/classroom-client.tsx) so it feels native
// to the app, but trimmed to what an admin actually needs: no teaching-mode
// picker, no teaching tools, no end-of-lesson AI recap checklist — those
// are tutor-only concerns. Deliberately routed outside admin/(dashboard) so
// it renders full-screen with no admin sidebar, the same way the tutor's
// own classroom escapes its dashboard chrome.
export function AdminClassroomJoinClient({ groupClass }: { groupClass: GroupClassRow }) {
  const router = useRouter();
  const timer = useElapsedTimer();
  const session = useAdminSession();

  const liveState = useMemo(() => buildLiveClassroomState(groupClass), [groupClass]);
  const [students, setStudents] = useState<LiveStudentStatus[]>(liveState.students);
  const [chat, setChat] = useState<AdminClassroomChatMessage[]>(() => buildClassroomChatSeed(groupClass));
  const [draft, setDraft] = useState("");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [mainView, setMainView] = useState<MainView>("gallery");
  const [sidePanel, setSidePanel] = useState<SidePanel>("participants");
  const [endSessionOpen, setEndSessionOpen] = useState(false);
  const [msgTutorOpen, setMsgTutorOpen] = useState(false);

  function sendChat() {
    if (!draft.trim()) return;
    setChat((prev) => [...prev, { id: `cc-admin-${Date.now()}`, sender: `${session.name} (${session.role})`, text: draft, time: "Now" }]);
    setDraft("");
  }

  function toggleMute(id: string) {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, micOn: !s.micOn, connection: s.micOn ? "Muted" : "Connected" } : s))
    );
  }

  function removeStudent(id: string) {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }

  function confirmEndSession() {
    setEndSessionOpen(false);
    router.push("/admin/group-classes?tab=Live Now");
  }

  const connectedCount = students.filter((s) => s.connection !== "Disconnected").length;

  return (
    <div className="flex h-screen flex-col bg-ensena-ink text-white">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-ensena-primary/20 px-2.5 py-1 text-xs font-semibold text-ensena-primary">
            <Shield className="size-3.5" /> Admin View
          </span>
          <span className="text-sm font-semibold">{groupClass.title}</span>
          <span className="text-xs text-white/50">Tutor: {groupClass.tutor}</span>
          {groupClass.classroom.recordingAvailable && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-600/20 px-2.5 py-1 text-xs font-semibold text-rose-400">
              <Circle className="size-2 fill-rose-500 text-rose-500" /> REC
            </span>
          )}
          <span className="text-xs text-white/50">{timer}</span>
          <span className="flex items-center gap-1 text-xs text-white/50">
            <Wifi className="size-3.5" /> {liveState.tutorConnection}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/group-classes?tab=Live Now")}
            className="rounded-full border border-white/15 px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            Leave
          </button>
          <button
            type="button"
            title="Ends the class for the tutor and all students: requires confirmation"
            onClick={() => setEndSessionOpen(true)}
            className="rounded-full bg-ensena-primary px-4 py-2 text-xs font-semibold text-white hover:bg-ensena-primary-hover"
          >
            End Session
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Main stage */}
        <div className="flex min-w-0 flex-1 flex-col">
          {mainView === "whiteboard" && groupClass.classroom.whiteboardActive ? (
            <div className="flex-1 bg-white text-ensena-ink">
              <Whiteboard classroomId={`group:${groupClass.id}`} role="tutor" selfName={groupClass.tutor} subject={groupClass.subject} title={groupClass.title} readOnly compact />
            </div>
          ) : (
            <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3">
              {/* Tutor tile */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl bg-white/5 py-6">
                <span className="flex size-16 items-center justify-center rounded-full bg-ensena-primary/30 text-xl font-semibold text-white">
                  {initials(groupClass.tutor)}
                </span>
                <p className="mt-2 text-sm font-medium">{groupClass.tutor}</p>
                <p className="text-[11px] text-white/50">Tutor</p>
              </div>

              {/* Admin's own tile */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl bg-white/5 py-6 ring-1 ring-ensena-primary/60">
                {camOn ? (
                  <span className="flex size-16 items-center justify-center rounded-full bg-ensena-primary/30 text-xl font-semibold text-white">
                    {initials(session.name)}
                  </span>
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white/40">
                    <CameraOff className="size-6" />
                  </span>
                )}
                <p className="mt-2 text-sm font-medium">You (Admin)</p>
                <div className="absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/40">
                  {micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-rose-400" />}
                </div>
              </div>

              {/* Student tiles */}
              {students.map((s) => (
                <div key={s.id} className="relative flex flex-col items-center justify-center rounded-2xl bg-white/5 py-6">
                  {s.camOn ? (
                    <span className="flex size-16 items-center justify-center rounded-full bg-white/15 text-xl font-semibold text-white">
                      {initials(s.name)}
                    </span>
                  ) : (
                    <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white/40">
                      <CameraOff className="size-6" />
                    </span>
                  )}
                  <p className="mt-2 text-sm font-medium">{s.name}</p>
                  {s.connection !== "Connected" && (
                    <span className={cn("mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", studentConnectionStyles[s.connection])}>
                      {s.connection}
                    </span>
                  )}
                  <div className="absolute bottom-2 left-2 flex size-6 items-center justify-center rounded-full bg-black/40">
                    {s.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-rose-400" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 p-3">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              aria-label="Toggle microphone"
              title="Toggle your microphone"
              className={cn("flex size-11 items-center justify-center rounded-full", micOn ? "bg-white/10" : "bg-rose-600")}
            >
              {micOn ? <Mic className="size-4.5" /> : <MicOff className="size-4.5" />}
            </button>
            <button
              type="button"
              onClick={() => setCamOn((v) => !v)}
              aria-label="Toggle camera"
              title="Toggle your camera"
              className={cn("flex size-11 items-center justify-center rounded-full", camOn ? "bg-white/10" : "bg-rose-600")}
            >
              {camOn ? <Camera className="size-4.5" /> : <CameraOff className="size-4.5" />}
            </button>
            {groupClass.classroom.whiteboardActive && (
              <button
                type="button"
                onClick={() => setMainView((v) => (v === "whiteboard" ? "gallery" : "whiteboard"))}
                aria-label="Toggle whiteboard view"
                title="View the live whiteboard"
                className={cn("flex size-11 items-center justify-center rounded-full", mainView === "whiteboard" ? "bg-ensena-primary" : "bg-white/10")}
              >
                <MonitorPlay className="size-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")}
              aria-label="Toggle chat"
              title="Class chat"
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "chat" ? "bg-ensena-primary" : "bg-white/10")}
            >
              <MessageSquare className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "participants" ? null : "participants")}
              aria-label="Toggle participants"
              title="Participants: mute or remove"
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "participants" ? "bg-ensena-primary" : "bg-white/10")}
            >
              <Users className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "attendance" ? null : "attendance")}
              aria-label="Toggle attendance"
              title="View attendance"
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "attendance" ? "bg-ensena-primary" : "bg-white/10")}
            >
              <ClipboardList className="size-4.5" />
            </button>
          </div>
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="flex w-80 shrink-0 flex-col border-l border-white/10 bg-white text-ensena-ink">
            {sidePanel === "chat" && (
              <>
                <div className="flex items-center justify-between border-b border-ensena-border p-3">
                  <p className="text-sm font-semibold">Class Chat</p>
                  <button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X className="size-4" /></button>
                </div>
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
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="Message everyone…"
                    className="h-9 flex-1 rounded-full border border-ensena-border px-3 text-sm"
                  />
                  <button type="button" onClick={sendChat} aria-label="Send" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
                    <Send className="size-4" />
                  </button>
                </div>
              </>
            )}

            {sidePanel === "participants" && (
              <>
                <div className="flex items-center justify-between border-b border-ensena-border p-3">
                  <p className="text-sm font-semibold">Participants ({students.length + 2})</p>
                  <button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X className="size-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ensena-muted">{connectedCount} of {students.length} students connected</p>
                  <ul className="flex flex-col gap-2">
                    <li className="flex items-center justify-between rounded-xl border border-ensena-border p-2.5 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(groupClass.tutor)}</span>
                        {groupClass.tutor}<span className="text-[10px] text-ensena-muted">(Tutor)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMsgTutorOpen(true)}
                        aria-label="Message tutor privately"
                        title="Message tutor privately: students won't see this"
                        className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
                      >
                        <MessageSquare className="size-3.5" />
                      </button>
                    </li>
                    {students.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-xl border border-ensena-border p-2.5 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-xs font-semibold text-ensena-ink">{initials(s.name)}</span>
                          <span className="min-w-0 truncate">{s.name}</span>
                          {s.connection !== "Connected" && (
                            <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold", studentConnectionStyles[s.connection])}>{s.connection}</span>
                          )}
                        </span>
                        {s.connection !== "Disconnected" && (
                          <div className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => toggleMute(s.id)} aria-label="Toggle mute" title="Mute participant" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                              {s.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                            </button>
                            <button type="button" onClick={() => removeStudent(s.id)} aria-label="Remove participant" title="Remove participant" className="flex size-7 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50">
                              <X className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {sidePanel === "attendance" && (
              <>
                <div className="flex items-center justify-between border-b border-ensena-border p-3">
                  <p className="text-sm font-semibold">Attendance</p>
                  <button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X className="size-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="mb-2 text-xs text-ensena-muted">{connectedCount} of {students.length} students currently connected</p>
                  <ul className="flex flex-col gap-2">
                    {students.map((s) => (
                      <li key={s.id} className="rounded-xl border border-ensena-border p-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-ensena-ink">{s.name}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", studentConnectionStyles[s.connection])}>{s.connection}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-ensena-muted">Joined {s.joinedAt}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <Modal open={endSessionOpen} onClose={() => setEndSessionOpen(false)} title="End Live Session">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This immediately ends the live session for {groupClass.tutor} and all {students.length} students. Use only for emergencies.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEndSessionOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmEndSession} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">End Session Now</Button>
          </div>
        </div>
      </Modal>

      <AdminMsgTutorModal open={msgTutorOpen} onClose={() => setMsgTutorOpen(false)} recipientName={groupClass.tutor} />
    </div>
  );
}
