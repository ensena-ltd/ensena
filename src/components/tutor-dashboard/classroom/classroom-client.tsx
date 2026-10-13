"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Calculator,
  Camera,
  CameraOff,
  Check,
  Circle,
  Download,
  Hand,
  Lock,
  Mic,
  MicOff,
  Monitor,
  MoreHorizontal,
  NotebookPen,
  PenLine,
  Presentation,
  Send,
  Smile,
  Users,
  Video,
  X,
} from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { generateAiRecommendation } from "@/lib/ai-performance-recommendations";
import {
  dashboardTutor,
  defaultClassroomChat,
  defaultClassroomParticipants,
  students,
  type ClassroomChatMessage,
  type ClassroomParticipant,
} from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";
import { WhiteboardModeClient } from "@/components/tutor-dashboard/classroom/whiteboard-mode-client";
import { TeachingToolsPanel } from "@/components/tutor-dashboard/classroom/teaching-tools-panel";

// See the matching comment in classroom-stage.tsx.
const Whiteboard = dynamic(() => import("@/components/tutor-dashboard/classroom/whiteboard").then((m) => m.Whiteboard), {
  ssr: false,
  loading: () => <div className="flex size-full items-center justify-center bg-ensena-bg-soft text-sm text-ensena-muted">Loading whiteboard…</div>,
});

type MainView = "gallery" | "speaker" | "whiteboard";
type SidePanel = "chat" | "participants" | "tools" | "attendance" | null;
type ClassroomMode = "select" | "standard" | "whiteboard";

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

export function ClassroomClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get("lesson") ?? searchParams.get("class") ?? "demo";
  const isDiscoverySession = searchParams.get("type") === "discovery";
  const discoverySessionId = searchParams.get("id");

  const timer = useElapsedTimer();
  const [classroomMode, setClassroomMode] = useState<ClassroomMode>("select");
  const [mainView, setMainView] = useState<MainView>("gallery");
  const [sidePanel, setSidePanel] = useState<SidePanel>("chat");

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [locked, setLocked] = useState(false);
  const [waitingRoomOpen, setWaitingRoomOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const [participants, setParticipants] = useState<ClassroomParticipant[]>(defaultClassroomParticipants);
  const [waitingRoom, setWaitingRoom] = useState<string[]>(["Grace A.", "Daniel N."]);
  const [chat, setChat] = useState<ClassroomChatMessage[]>(defaultClassroomChat);
  const [draft, setDraft] = useState("");

  const [endLessonOpen, setEndLessonOpen] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  function sendChat() {
    if (!draft.trim()) return;
    setChat((prev) => [...prev, { id: `cc-${Date.now()}`, sender: dashboardTutor.name, text: draft, time: "Now" }]);
    setDraft("");
  }

  function toggleMute(id: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, micOn: !p.micOn } : p)));
  }

  function toggleCam(id: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, camOn: !p.camOn } : p)));
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function markStep(key: string) {
    setCompletedSteps((prev) => ({ ...prev, [key]: true }));
  }

  function confirmEndLesson() {
    setEndLessonOpen(false);
    if (isDiscoverySession && discoverySessionId) {
      router.push(`/tutor-dashboard/discovery-sessions/${discoverySessionId}/recommend`);
    } else {
      router.push("/tutor-dashboard/private-lessons");
    }
  }

  const studentParticipants = participants.filter((p) => p.role === "student");
  const student = students[0];
  const recap = generateAiRecommendation(student, 1);

  const endLessonSteps = [
    { key: "summary", label: "Generate lesson summary" },
    { key: "whiteboard", label: "Save whiteboard" },
    { key: "recording", label: "Save recording" },
    { key: "chat", label: "Save chat" },
    { key: "homework", label: "Generate homework" },
    { key: "recap", label: "Generate lesson recap" },
    { key: "send", label: "Send recap to student" },
    { key: "escrow", label: "Release escrow payment" },
  ];

  if (classroomMode === "select") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft px-6 py-12">
        <div className="w-full max-w-2xl">
          <h1 className="text-center font-heading text-2xl font-semibold text-ensena-ink">Choose your teaching mode</h1>
          <p className="mt-1.5 text-center text-sm text-ensena-muted">
            Pick how you want to teach this {isDiscoverySession ? "Discovery Session" : "lesson"}. You can always switch modes next time.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setClassroomMode("whiteboard")}
              className="flex flex-col items-start gap-2 rounded-2xl border-2 border-ensena-primary bg-white p-5 text-left hover:bg-ensena-primary/5"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary"><PenLine className="size-5" /></span>
              <p className="font-semibold text-ensena-ink">Whiteboard Mode</p>
              <p className="text-xs text-ensena-muted">Mobile-friendly split screen: student video up top, an infinite whiteboard below. Best for tutoring and explanations, works great on a phone.</p>
            </button>

            <button
              type="button"
              onClick={() => setClassroomMode("standard")}
              className="flex flex-col items-start gap-2 rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-left hover:bg-ensena-bg-soft"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary"><Video className="size-5" /></span>
              <p className="font-semibold text-ensena-ink">Standard Video Call</p>
              <p className="text-xs text-ensena-muted">Full desktop layout with gallery/speaker view, calculator, graphing tools and more.</p>
            </button>

            <div className="flex flex-col items-start gap-2 rounded-2xl border border-ensena-border bg-ensena-surface/60 p-5 text-left opacity-60">
              <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-muted"><Camera className="size-5" /></span>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ensena-ink">Notebook Camera Mode</p>
                <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">Coming Soon</span>
              </div>
              <p className="text-xs text-ensena-muted">Point your phone camera at a notebook like a document camera. No laptop or digital pen needed.</p>
            </div>

            <div className="flex flex-col items-start gap-2 rounded-2xl border border-ensena-border bg-ensena-surface/60 p-5 text-left opacity-60">
              <span className="flex size-11 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-muted"><Presentation className="size-5" /></span>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ensena-ink">Slides Mode</p>
                <span className="rounded-full bg-ensena-bg-soft px-2 py-0.5 text-[10px] font-semibold text-ensena-muted">Coming Soon</span>
              </div>
              <p className="text-xs text-ensena-muted">Upload PowerPoint, PDF or images and draw directly on top while presenting.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (classroomMode === "whiteboard") {
    return (
      <>
        <WhiteboardModeClient
          title={isDiscoverySession ? "Discovery Session" : "Mathematics Lesson"}
          timer={timer}
          recording={recording}
          participants={participants}
          micOn={micOn}
          camOn={camOn}
          handRaised={handRaised}
          onToggleMic={() => setMicOn((v) => !v)}
          onToggleCam={() => setCamOn((v) => !v)}
          onToggleHand={() => setHandRaised((v) => !v)}
          onEndClass={() => setEndLessonOpen(true)}
          chat={chat}
          draft={draft}
          onDraftChange={setDraft}
          onSendChat={sendChat}
        />

        <Modal open={endLessonOpen} onClose={() => setEndLessonOpen(false)} title="End Lesson" widthClassName="max-w-lg">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ensena-muted">Wrap up this lesson before it ends.</p>
            {endLessonSteps.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => markStep(step.key)}
                className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm"
              >
                <span className="text-ensena-ink">{step.label}</span>
                {completedSteps[step.key] ? (
                  <Check className="size-4 text-ensena-success" />
                ) : (
                  <span className="text-xs text-ensena-muted">Tap to run</span>
                )}
              </button>
            ))}
            {completedSteps.recap && (
              <div className="rounded-xl bg-ensena-cta-from/5 p-3 text-xs text-ensena-ink">
                <p className="flex items-center gap-1.5 font-semibold"><NotebookPen className="size-3.5 text-ensena-cta-to" /> Lesson Recap</p>
                <p className="mt-1 text-ensena-muted">{recap.learningSummary} {recap.performanceTrend}</p>
              </div>
            )}
            <button
              type="button"
              onClick={confirmEndLesson}
              className="mt-2 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
            >
              Confirm End Lesson
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ensena-ink text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{isDiscoverySession ? "Discovery Session" : "Mathematics Lesson"}</span>
          <span className="text-xs text-white/50">#{lessonId}</span>
          {recording && (
            <span className="flex items-center gap-1.5 rounded-full bg-rose-600/20 px-2.5 py-1 text-xs font-semibold text-rose-400">
              <Circle className="size-2 fill-rose-500 text-rose-500" /> REC {timer}
            </span>
          )}
          {!recording && <span className="text-xs text-white/50">{timer}</span>}
          {locked && (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
              <Lock className="size-3" /> Locked
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full bg-white/10 p-1 text-xs">
            {(["gallery", "speaker", "whiteboard"] as MainView[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMainView(v)}
                className={cn("rounded-full px-3 py-1.5 font-medium capitalize", mainView === v ? "bg-white text-ensena-ink" : "text-white/70")}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEndLessonOpen(true)}
            className="rounded-full bg-ensena-primary px-4 py-2 text-xs font-semibold text-white hover:bg-ensena-primary-hover"
          >
            {isDiscoverySession ? "End Session" : "End Lesson"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Main stage */}
        <div className="flex min-w-0 flex-1 flex-col">
          {mainView === "whiteboard" ? (
            <div className="flex-1 bg-white text-ensena-ink">
              <Whiteboard />
            </div>
          ) : (
            <div
              className={cn(
                "grid flex-1 gap-3 p-4",
                mainView === "speaker" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
              )}
            >
              {(mainView === "speaker" ? participants.slice(0, 1) : participants).map((p) => (
                <div key={p.id} className="relative flex flex-col items-center justify-center rounded-2xl bg-white/5">
                  {(p.role === "tutor" ? camOn : p.camOn) ? (
                    <span className="flex size-20 items-center justify-center rounded-full bg-ensena-primary/30 text-2xl font-semibold text-white">
                      {initials(p.name)}
                    </span>
                  ) : (
                    <span className="flex size-20 items-center justify-center rounded-full bg-white/10 text-white/40">
                      <CameraOff className="size-7" />
                    </span>
                  )}
                  <p className="mt-2 text-sm font-medium">{p.name}</p>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <span className="flex size-6 items-center justify-center rounded-full bg-black/40">
                      {(p.role === "tutor" ? micOn : p.micOn) ? <Mic className="size-3.5" /> : <MicOff className="size-3.5 text-rose-400" />}
                    </span>
                    {p.handRaised && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/80">
                        <Hand className="size-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {screenSharing && (
                <div className="col-span-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 py-6 text-sm text-white/70">
                  <Monitor className="size-4" /> You are sharing your screen
                </div>
              )}
            </div>
          )}

          {/* Control bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 p-3">
            <button
              type="button"
              onClick={() => setMicOn((v) => !v)}
              className={cn("flex size-11 items-center justify-center rounded-full", micOn ? "bg-white/10" : "bg-rose-600")}
              aria-label="Toggle microphone"
            >
              {micOn ? <Mic className="size-4.5" /> : <MicOff className="size-4.5" />}
            </button>
            <button
              type="button"
              onClick={() => setCamOn((v) => !v)}
              className={cn("flex size-11 items-center justify-center rounded-full", camOn ? "bg-white/10" : "bg-rose-600")}
              aria-label="Toggle camera"
            >
              {camOn ? <Camera className="size-4.5" /> : <CameraOff className="size-4.5" />}
            </button>
            <button
              type="button"
              onClick={() => setScreenSharing((v) => !v)}
              className={cn("flex size-11 items-center justify-center rounded-full", screenSharing ? "bg-ensena-primary" : "bg-white/10")}
              aria-label="Toggle screen share"
            >
              <Monitor className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setHandRaised((v) => !v)}
              className={cn("flex size-11 items-center justify-center rounded-full", handRaised ? "bg-amber-500" : "bg-white/10")}
              aria-label="Raise hand"
            >
              <Hand className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setRecording((v) => !v)}
              className={cn("flex size-11 items-center justify-center rounded-full", recording ? "bg-rose-600" : "bg-white/10")}
              aria-label="Toggle recording"
            >
              <Circle className={cn("size-4.5", recording && "fill-white")} />
            </button>
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "chat" ? null : "chat")}
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "chat" ? "bg-ensena-primary" : "bg-white/10")}
              aria-label="Toggle chat"
            >
              <Send className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "participants" ? null : "participants")}
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "participants" ? "bg-ensena-primary" : "bg-white/10")}
              aria-label="Toggle participants"
            >
              <Users className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "tools" ? null : "tools")}
              className={cn("flex size-11 items-center justify-center rounded-full", sidePanel === "tools" ? "bg-ensena-primary" : "bg-white/10")}
              aria-label="Toggle teaching tools"
            >
              <Calculator className="size-4.5" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex size-11 items-center justify-center rounded-full bg-white/10"
                aria-label="More options"
              >
                <MoreHorizontal className="size-4.5" />
              </button>
              {moreOpen && (
                <div className="absolute bottom-14 right-0 z-20 w-56 rounded-xl border border-white/10 bg-ensena-ink p-1.5 text-sm shadow-xl">
                  <button type="button" onClick={() => setWaitingRoomOpen(true)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10">
                    Waiting Room <span className="text-xs text-white/50">2</span>
                  </button>
                  <button type="button" onClick={() => setLocked((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10">
                    Lock Classroom {locked && <Check className="size-3.5" />}
                  </button>
                  <button type="button" onClick={() => setNoiseSuppression((v) => !v)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10">
                    Noise Suppression {noiseSuppression && <Check className="size-3.5" />}
                  </button>
                  <button type="button" onClick={() => setSidePanel("attendance")} className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10">
                    Attendance
                  </button>
                </div>
              )}
            </div>
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
                  <button type="button" aria-label="Insert smiley" onClick={() => setDraft((prev) => `${prev}🙂`)} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ensena-border text-ensena-muted">
                    <Smile className="size-4" />
                  </button>
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
                  <p className="text-sm font-semibold">Participants ({participants.length})</p>
                  <button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X className="size-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <ul className="flex flex-col gap-2">
                    {participants.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-xl border border-ensena-border p-2.5 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">
                            {initials(p.name)}
                          </span>
                          <span>
                            {p.name}
                            {p.role === "tutor" && <span className="ml-1 text-[10px] text-ensena-muted">(You)</span>}
                          </span>
                          {p.handRaised && <Hand className="size-3.5 text-amber-500" />}
                        </span>
                        {p.role === "student" && (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => toggleMute(p.id)} aria-label="Toggle mute" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                              {p.micOn ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
                            </button>
                            <button type="button" onClick={() => toggleCam(p.id)} aria-label="Toggle camera" className="flex size-7 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                              {p.camOn ? <Camera className="size-3.5" /> : <CameraOff className="size-3.5" />}
                            </button>
                            <button type="button" onClick={() => removeParticipant(p.id)} aria-label="Remove participant" className="flex size-7 items-center justify-center rounded-full text-rose-500 hover:bg-rose-50">
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

            {sidePanel === "tools" && <TeachingToolsPanel onClose={() => setSidePanel(null)} />}

            {sidePanel === "attendance" && (
              <>
                <div className="flex items-center justify-between border-b border-ensena-border p-3">
                  <p className="text-sm font-semibold">Attendance</p>
                  <button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X className="size-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <ul className="flex flex-col gap-2">
                    {studentParticipants.map((p) => (
                      <li key={p.id} className="rounded-xl border border-ensena-border p-2.5 text-sm">
                        <p className="font-medium text-ensena-ink">{p.name}</p>
                        <p className="text-xs text-ensena-muted">Joined {p.joinedAt} · {timer} min in session</p>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      const rows = [["Student", "Joined"], ...studentParticipants.map((p) => [p.name, p.joinedAt])];
                      const csv = rows.map((r) => r.join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "classroom-attendance.csv";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-ensena-border py-2 text-xs font-medium text-ensena-ink"
                  >
                    <Download className="size-3.5" /> Download Attendance Sheet
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Waiting room modal */}
      <Modal open={waitingRoomOpen} onClose={() => setWaitingRoomOpen(false)} title="Waiting Room">
        <div className="flex flex-col gap-2">
          {waitingRoom.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{initials(name)}</span>
                {name}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setParticipants((prev) => [...prev, { id: `p-${Date.now()}`, name, role: "student", micOn: false, camOn: true, handRaised: false, joinedAt: "Now" }]);
                    setWaitingRoom((prev) => prev.filter((n) => n !== name));
                  }}
                  className="rounded-full bg-ensena-primary px-3 py-1 text-xs font-semibold text-white"
                >
                  Admit
                </button>
                <button
                  type="button"
                  onClick={() => setWaitingRoom((prev) => prev.filter((n) => n !== name))}
                  className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
          {waitingRoom.length === 0 && <p className="py-4 text-center text-sm text-ensena-muted">No one is waiting.</p>}
        </div>
      </Modal>

      {/* End Lesson modal */}
      <Modal open={endLessonOpen} onClose={() => setEndLessonOpen(false)} title="End Lesson" widthClassName="max-w-lg">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ensena-muted">Wrap up this lesson before it ends.</p>
          {endLessonSteps.map((step) => (
            <button
              key={step.key}
              type="button"
              onClick={() => markStep(step.key)}
              className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm"
            >
              <span className="text-ensena-ink">{step.label}</span>
              {completedSteps[step.key] ? (
                <Check className="size-4 text-ensena-success" />
              ) : (
                <span className="text-xs text-ensena-muted">Tap to run</span>
              )}
            </button>
          ))}
          {completedSteps.recap && (
            <div className="rounded-xl bg-ensena-cta-from/5 p-3 text-xs text-ensena-ink">
              <p className="flex items-center gap-1.5 font-semibold"><NotebookPen className="size-3.5 text-ensena-cta-to" /> Lesson Recap</p>
              <p className="mt-1 text-ensena-muted">{recap.learningSummary} {recap.performanceTrend}</p>
            </div>
          )}
          <button
            type="button"
            onClick={confirmEndLesson}
            className="mt-2 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            Confirm End Lesson
          </button>
        </div>
      </Modal>
    </div>
  );
}
