"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MonitorX, ScreenShare } from "lucide-react";

import { getClassroomSession, type ClassroomChatMessage, type ClassroomParticipantView, type ClassroomRole, type ClassroomSession } from "@/lib/classroom-data";
import { PaymentRequiredScreen } from "@/components/classroom/payment-required-screen";
import { useLessonCountdown } from "@/components/classroom/classroom-utils";
import { subscribePaymentPlans } from "@/lib/payment-plans-store";
import { useLocalMedia, type MediaDeviceOption, type MediaPermissionError } from "@/hooks/use-local-media";
import { useWebRTCPeer, type PeerConnectionState } from "@/hooks/use-webrtc-peer";
import { useScreenShareRequests } from "@/hooks/use-screen-share-requests";
import { useHandRaise } from "@/hooks/use-hand-raise";
import { useClassroomChat } from "@/hooks/use-classroom-chat";
import { useGroupWebRTCMesh } from "@/hooks/use-group-webrtc-mesh";
import { ClassroomRecordingNotice } from "@/components/classroom/classroom-recording-notice";
import { ClassroomTopBar } from "@/components/classroom/classroom-top-bar";
import { MobileClassroomTopBar } from "@/components/classroom/mobile-classroom-top-bar";
import { ClassroomLayout } from "@/components/classroom/classroom-layout";
import { ClassroomLeaveModal } from "@/components/classroom/classroom-leave-modal";
import { ClassroomEndedScreen } from "@/components/classroom/classroom-ended-screen";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { startLessonConfirmation, startGroupSessionConfirmations, openDispute } from "@/lib/escrow-store";
import { createClassroomSyncTransport, type ClassroomSyncTransport } from "@/lib/classroom-sync";
import { getClassroomTermination, setClassroomTermination } from "@/lib/classroom-termination-store";
import { tutorProblemReasons } from "@/lib/escrow-release";
import { buildGroupClassCohorts, buildGroupClassSessions, buildSessionAttendance, initialMyGroupClasses, toISO } from "@/lib/tutor-dashboard-data";
import { slugifyName, sessionAttendanceVariance } from "@/components/classroom/classroom-utils";
import { getSessionLabelOverride, setSessionLabelOverride } from "@/lib/classroom-session-label-store";
import { recordJoin, recordLeave } from "@/lib/class-attendance-store";
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import { updateDiscoverySession } from "@/lib/discovery-sessions-store";
import { endLiveClass } from "@/lib/actions/classroom-live";
import { buildRestrictionMessage, isRestricted, recordViolation } from "@/lib/moderation-store";
import { appendReviewPrompt } from "@/lib/review-prompt";
import { useClassroomVisionSafety } from "@/hooks/use-classroom-vision-safety";
import { useClassroomSpeechSafety } from "@/hooks/use-classroom-speech-safety";

// The main teaching area is ONE full-screen region that switches between
// these modes (Zoom-style) rather than stacking video/whiteboard/lab as
// separate always-visible sections. A small floating self-camera window
// persists over Whiteboard/Lab/Tools; "video" mode is the camera itself.
// "whiteboard-video" is the combined mode — the whiteboard is the main
// workspace, with real tutor/student video as floating tiles over it,
// rather than a 5th unrelated screen.
export type MainMode = "video" | "whiteboard" | "whiteboard-video" | "lab" | "tools";
export type ToolKey = "chat" | "participants" | "resources" | "notes" | "timer" | "settings" | "activities";

export interface ClassroomLiveState {
  timerLabel: string;
  mainMode: MainMode;
  setMainMode: (mode: MainMode) => void;
  /** Mobile only — drives the bottom sheet's "Choose a mode / Class Tools" picker and the full-screen "tools" stage mode. Desktop's side panel uses `sidebarTab` instead (see below), so this is never touched by any desktop-only code path. */
  activeTool: ToolKey | null;
  setActiveTool: (tool: ToolKey | null) => void;
  openToolFullscreen: (tool: ToolKey) => void;
  /** Desktop only — which tab the persistent Participants/Class Chat side panel shows; `null` collapses it entirely (main stage expands). Defaults to "participants", matching the reference screens' side panel being open from the start. */
  sidebarTab: ToolKey | null;
  setSidebarTab: (tool: ToolKey | null) => void;
  /** Desktop-only: the on-demand tools drawer's "Choose a mode / Class Tools" grid is open (distinct from `activeTool`, which is a specific drilled-into tool within that same drawer). */
  toolsMenuOpen: boolean;
  setToolsMenuOpen: Dispatch<SetStateAction<boolean>>;
  /** The editable line shown under the subject in the classroom header — defaults to a real, non-fabricated value and persists a tutor's override. */
  sessionLabel: string;
  setSessionLabel: (label: string) => void;
  micOn: boolean;
  setMicOn: Dispatch<SetStateAction<boolean>>;
  camOn: boolean;
  setCamOn: Dispatch<SetStateAction<boolean>>;
  /** Real local camera/mic MediaStream — null until getUserMedia resolves. */
  localStream: MediaStream | null;
  /** Real remote participant's MediaStream once the WebRTC connection is up. */
  remoteStream: MediaStream | null;
  peerConnectionState: PeerConnectionState;
  mediaError: MediaPermissionError;
  retryMedia: () => void;
  cameras: MediaDeviceOption[];
  microphones: MediaDeviceOption[];
  speakers: MediaDeviceOption[];
  selectedCameraId: string | null;
  selectedMicId: string | null;
  selectedSpeakerId: string | null;
  setCameraId: (deviceId: string) => void;
  setMicId: (deviceId: string) => void;
  setSpeakerId: (deviceId: string) => void;
  canSelectSpeaker: boolean;
  micLevel: number;
  /** Real "deafen" control — mutes the peer's actual <video>/<audio> element wherever it plays, not a decorative icon-only toggle. */
  speakerOn: boolean;
  setSpeakerOn: Dispatch<SetStateAction<boolean>>;
  /** Real, synced presence — see use-hand-raise.ts. */
  handRaised: boolean;
  toggleMyHand: () => void;
  /** Tutor-side acknowledgement — lowers a specific participant's (by real display name) hand for everyone. */
  lowerHand: (participantName: string) => void;
  screenSharing: boolean;
  setScreenSharing: Dispatch<SetStateAction<boolean>>;
  participants: ClassroomParticipantView[];
  toggleParticipantMic: (id: string) => void;
  chat: ClassroomChatMessage[];
  sendChat: (text: string) => void;
  resources: string[];
  addResource: () => void;
  openResource: (name: string) => void;
  notes: string;
  setNotes: Dispatch<SetStateAction<string>>;
  onLeave: () => void;
  sheetOpen: boolean;
  setSheetOpen: Dispatch<SetStateAction<boolean>>;
  notice: string | null;
  showNotice: (message: string) => void;
  /** Called by the whiteboard (the one moderation surface that lives in a sibling component, not inside classroom-shell.tsx itself) once its own scan confirms a high-confidence finding — ends the session for both participants and holds payment for review, exactly like terminateForViolation does for camera/screen/audio/chat. */
  reportHighConfidenceViolation: () => void;
}

interface ClassroomShellProps {
  role: ClassroomRole;
  session: ClassroomSession;
  leaveHref: string;
}

// The real, server-side-equivalent gate: a student's payment entitlement is
// re-verified here, client-side (where real localStorage is actually
// visible — session/page.tsx runs as a Server Component and can never see
// it, so its own `session.hasPaymentAccess` is not trustworthy on its own).
// Built on useSyncExternalStore (not useState+useEffect) specifically for
// its two-snapshot contract: getServerSnapshot returns `true` unconditionally
// — matching what the server itself rendered (it has no real payment data to
// check against) — so hydration never mismatches, while the real client
// snapshot re-resolves the boolean reactively via the same PAYMENT_EVENT
// every payment/subscription change already dispatches. Returns a plain
// boolean rather than a rebuilt ClassroomSession specifically because
// getClassroomSession() constructs a brand-new object on every call — used
// directly as a snapshot, that trips useSyncExternalStore's "getSnapshot
// must return a stable, comparable value" contract (an infinite render
// loop, confirmed live) — a primitive boolean has no such problem.
function useHasPaymentAccess(role: ClassroomRole, session: ClassroomSession): boolean {
  return useSyncExternalStore(
    subscribePaymentPlans,
    // A live (database-backed) session already carries the booking's real
    // payment status from the server; demo sessions re-check the local ledger.
    () => (role !== "student" ? true : session.live ? (session.hasPaymentAccess ?? true) : (getClassroomSession(role, session.kind, session.id)?.hasPaymentAccess ?? true)),
    () => true
  );
}

export function ClassroomShell({ role, session, leaveHref }: ClassroomShellProps) {
  const hasPaymentAccess = useHasPaymentAccess(role, session);

  if (role === "student" && !hasPaymentAccess) {
    return <PaymentRequiredScreen role={role} leaveHref={leaveHref} />;
  }

  return <ClassroomShellInner role={role} session={session} leaveHref={leaveHref} />;
}

function ClassroomShellInner({ role, session, leaveHref }: ClassroomShellProps) {
  const router = useRouter();
  const { label: timerLabel, ended } = useLessonCountdown(session.durationMinutesNumeric, session.scheduledEndAtISO);

  // Reviews only apply to Private and Group classes — a Discovery Session
  // (or a Counselling session, whose leaveHref points at admin/counsellor
  // pages with no review UI at all) never gets this param, so those
  // destinations are never asked to show a review popup.
  const reviewEligible = session.kind === "private" || session.kind === "group";
  const leaveHrefWithReviewPrompt = reviewEligible ? appendReviewPrompt(leaveHref) : leaveHref;

  // A Discovery Session's 25-minute maximum is a real HARD stop, not a UI-only
  // countdown that quietly lets teaching continue once it hits zero — the
  // backend record itself must reflect that the session ended, from
  // whichever side's browser happens to notice `ended` flip first (there is
  // no server tick in this local-only app, so each participant's own tab is
  // what marks it; the write is idempotent via the `endedBy` guard below, so
  // both tutor and student tabs converging on the same result is harmless).
  const markedDiscoveryEndRef = useRef(false);
  useEffect(() => {
    if (session.kind !== "discovery" || !ended || markedDiscoveryEndRef.current) return;
    markedDiscoveryEndRef.current = true;
    if (session.live) {
      void endLiveClass({ kind: "discovery", id: session.id, reason: "schedule" });
      return;
    }
    updateDiscoverySession(session.id, {
      status: "Completed",
      funnelStage: "CompletedAwaitingFeedback",
      actualEndAtISO: new Date().toISOString(),
      endedBy: "schedule",
    });
  }, [session.kind, session.id, session.live, ended]);

  // A confirmed high-confidence contact-sharing finding ends the session for
  // BOTH participants, not just the violator's own tab — see terminateForViolation
  // below. This transport rides the same ref-counted classroom-sync connection
  // every other real-time feature here (whiteboard, hand-raise, screen-share
  // requests) already shares for this classroomId, so it adds no new connection.
  // A session already terminated (by this device or the other participant's)
  // stays terminated across a refresh/reconnect — read into the INITIAL
  // state itself (same lazy-initializer idiom sessionLabel above already
  // uses for its own classroomId-keyed localStorage read) so a rejoin
  // attempt never renders even one frame of the live classroom. See
  // classroom-termination-store.ts.
  const [terminated, setTerminated] = useState<{ message: string } | null>(() => {
    const persisted = getClassroomTermination(session.classroomId);
    return persisted ? { message: persisted.message } : null;
  });
  const terminatedRef = useRef(terminated !== null);
  const terminationTransportRef = useRef<ClassroomSyncTransport | null>(null);
  useEffect(() => {
    if (terminatedRef.current) {
      window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1800);
    }

    const transport = createClassroomSyncTransport(session.classroomId);
    terminationTransportRef.current = transport;
    const unsub = transport.onTerminationEvent((event) => {
      setClassroomTermination(session.classroomId, event.message);
      if (terminatedRef.current) return;
      terminatedRef.current = true;
      setTerminated({ message: event.message });
      window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1800);
    });
    return () => {
      unsub();
      transport.disconnect();
      terminationTransportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router/leaveHrefWithReviewPrompt are stable for the lifetime of one classroom visit, same rationale as the other transport-owning hooks in this file
  }, [session.classroomId]);

  const [mainMode, setMainModeState] = useState<MainMode>("video");
  // Mobile-only state — untouched by this desktop redesign. Defaults to
  // null (no drill-in), matching the bottom sheet's original behavior.
  const [activeTool, setActiveToolState] = useState<ToolKey | null>(null);
  // Desktop-only — the Participants/Class Chat/etc. side panel is an
  // on-demand drawer, closed by default (matching the Video mode reference
  // screens, which show no side panel at all) — Group Class's own
  // Whiteboard reference screen is the one exception, auto-opening this to
  // "participants" on entry (see classroom-toolbar.tsx's
  // enterWhiteboardMode). Its own X sets this back to null, collapsing the
  // panel and expanding the main classroom surface (see classroom-layout.tsx).
  const [sidebarTab, setSidebarTabState] = useState<ToolKey | null>(null);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  // Lazy initializer reads localStorage exactly once at mount, same idiom
  // as the whiteboard's own board-order seeding — falls back to a real,
  // already-on-record value (never a fabricated "Lesson 12" style label)
  // until the tutor actually renames it.
  const [sessionLabel, setSessionLabelState] = useState(() => getSessionLabelOverride(session.classroomId) ?? `${session.typeLabel} · ${session.date}`);
  function setSessionLabel(label: string) {
    const trimmed = label.trim();
    if (!trimmed) return;
    setSessionLabelState(trimmed);
    setSessionLabelOverride(session.classroomId, trimmed);
  }
  const {
    stream: localStream,
    micOn,
    setMicOn: setMicOnReal,
    camOn,
    setCamOn: setCamOnReal,
    error: mediaError,
    retry: retryMedia,
    cameras,
    microphones,
    speakers,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    setCameraId,
    setMicId,
    setSpeakerId,
    canSelectSpeaker,
    micLevel,
  } = useLocalMedia();
  // useLocalMedia's setters take a plain boolean; ClassroomLiveState (and
  // existing callers like classroom-toolbar.tsx's `setMicOn((v) => !v)`)
  // expect the full useState-style updater-or-value form — resolved here
  // rather than changing every call site.
  function setMicOn(next: SetStateAction<boolean>) {
    setMicOnReal(typeof next === "function" ? next(micOn) : next);
  }
  function setCamOn(next: SetStateAction<boolean>) {
    setCamOnReal(typeof next === "function" ? next(camOn) : next);
  }
  const { remoteStream, connectionState: peerConnectionState, replaceVideoTrack } = useWebRTCPeer({
    classroomId: session.classroomId,
    localStream,
    isInitiator: role === "tutor",
    enabled: session.kind !== "group",
  });
  const [speakerOn, setSpeakerOn] = useState(true);
  const selfDisplayName = role === "tutor" ? session.tutorName : (session.studentName ?? "You");
  // Real multi-party video for a Group Class — one RTCPeerConnection per
  // other participant actually in the room (see use-group-webrtc-mesh.ts),
  // not the 1:1 hook above (which is deliberately disabled for group kind).
  const { peersById: groupPeersById, presentById: groupPresentById } = useGroupWebRTCMesh({
    classroomId: session.classroomId,
    localStream,
    selfName: selfDisplayName,
    selfRole: role,
    micOn,
    camOn,
    enabled: session.kind === "group",
  });
  const { raisedHandNames, myHandRaised: handRaised, toggleMyHand, lowerHand } = useHandRaise({ classroomId: session.classroomId, selfName: selfDisplayName });

  // Real attendance — recorded once, here, in the ONE shared classroom shell
  // every kind and both roles already render, rather than reimplemented per
  // class type. "Join" is genuinely this participant's own browser tab
  // rendering the classroom; "leave" covers the normal case (this component
  // unmounts, e.g. Next.js navigation after End Class) and the abrupt case
  // (the tab itself closes, which never unmounts React) via beforeunload —
  // the same two-path approach classroom-sync.ts's own presence-leave
  // already uses.
  useEffect(() => {
    recordJoin(session.classroomId, role, selfDisplayName);
    function handleBeforeUnload() {
      recordLeave(session.classroomId, role, selfDisplayName);
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      recordLeave(session.classroomId, role, selfDisplayName);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classroomId/role/selfDisplayName are fixed for one classroom visit, same rationale as the WebRTC hooks above
  }, []);
  // A private lesson has no persistent "raised hands" badge the way the
  // group toolbar row does (there's only ever one student to watch) — a
  // real-time toast is what actually satisfies "the tutor sees a raised
  // hand" there. Tracks the previous set so only a genuinely NEW raise
  // fires a toast, not every render.
  const previousRaisedHandsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (role !== "tutor") return;
    for (const name of raisedHandNames) {
      if (!previousRaisedHandsRef.current.has(name)) showNotice(`${name} raised their hand`);
    }
    previousRaisedHandsRef.current = raisedHandNames;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- showNotice is a stable function declared in this same component; only re-run when the raised-hands set itself changes
  }, [raisedHandNames, role]);
  const [screenSharing, setScreenSharingState] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // Reactive mirror of screenStreamRef — the ref alone is enough for the
  // existing synchronous read sites below, but the vision-safety hook (see
  // useClassroomVisionSafety) needs to actually re-run its effect when the
  // real stream object changes, which a ref update alone never triggers.
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participantsBase, setParticipants] = useState<ClassroomParticipantView[]>(session.participants);
  // Every render, real-time raised-hand state is merged onto the base
  // roster rather than stored redundantly — useHandRaise (keyed by real
  // display name, the one stable identity shared across both sides' own
  // independently-numbered participant ids) is the single source of truth.
  // For a Group Class, the same merge also layers in the mesh's real
  // stream/connectionState by matching each roster entry's name against who
  // the presence system says is actually in the room right now — the ONE
  // shared participant array (session.participants enriched here) is what
  // both the video grid and the Participants panel read, rather than two
  // separate participant systems disagreeing with each other.
  const groupPresenceByName = new Map(Array.from(groupPresentById.entries()).map(([id, info]) => [info.name, id]));
  const matchedLiveIds = new Set<string>();
  const enrichedRoster = participantsBase.map((p) => {
    const base = { ...p, handRaised: raisedHandNames.has(p.name) };
    if (session.kind !== "group") return base;
    if (p.isSelf) return { ...base, micOn, camOn, stream: localStream, connectionState: "connected" as const };
    const liveId = groupPresenceByName.get(p.name);
    if (!liveId) return { ...base, camOn: false, stream: null, connectionState: "not-joined" as const };
    matchedLiveIds.add(liveId);
    const presenceInfo = groupPresentById.get(liveId);
    const live = groupPeersById.get(liveId);
    return {
      ...base,
      micOn: presenceInfo?.micOn ?? base.micOn,
      camOn: presenceInfo?.camOn ?? base.camOn,
      stream: live?.stream ?? null,
      connectionState: live?.stream ? ("connected" as const) : ("connecting" as const),
    };
  });
  // A real live connection whose announced name doesn't match any known
  // roster row still gets a tile — the grid must reflect who's actually in
  // the room (per the mesh's own real presence), not silently drop someone
  // the static roster happens not to list. In real usage every genuine
  // student has their own distinct name, so this path is mostly a safety
  // net; it's also what a same-named test double (e.g. two tabs opened as
  // the same seed tutor identity) hits, which is a testing artifact rather
  // than a real-world case this app's roster data can produce.
  const unmatchedLivePeers: ClassroomParticipantView[] =
    session.kind === "group"
      ? Array.from(groupPresentById.entries())
          .filter(([id]) => !matchedLiveIds.has(id))
          .map(([id, info]) => {
            const live = groupPeersById.get(id);
            return {
              id: `live-${id}`,
              name: info.name,
              role: info.role,
              isSelf: false,
              micOn: info.micOn,
              camOn: info.camOn,
              handRaised: raisedHandNames.has(info.name),
              stream: live?.stream ?? null,
              connectionState: live?.stream ? "connected" : "connecting",
            };
          })
      : [];
  const participants = [...enrichedRoster, ...unmatchedLivePeers];
  // Real, live headcount for the header — distinct from session.participantCount
  // (the static enrolled-seats number computed once from the roster, not who's
  // actually in the room right now). Every roster entry starts "not-joined"
  // until its name is matched against real presence, and self always counts
  // (see enrichedRoster above), so this is exactly "how many tiles are
  // actually showing right now," not "how many people are enrolled."
  const connectedCount = session.kind === "group" ? participants.filter((p) => p.connectionState !== "not-joined").length : undefined;
  const { chat, sendChatMessage } = useClassroomChat({ classroomId: session.classroomId, seed: session.chatSeed });
  const [resources, setResources] = useState<string[]>(session.materials);
  const [notes, setNotes] = useState("");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const [problemReason, setProblemReason] = useState(tutorProblemReasons[0]);

  // "tools" is a mobile-only stage mode (there's no permanent side panel to
  // show it in there) — switching to Video/Whiteboard/Lab always exits it.
  // Desktop's side panel is driven by `sidebarTab` instead (see below),
  // which a plain mode switch never touches — it stays open across Video
  // ↔ Whiteboard, matching the reference screens.
  function setMainMode(mode: MainMode) {
    setMainModeState(mode);
    if (mode !== "tools") setActiveToolState(null);
  }

  function setActiveTool(tool: ToolKey | null) {
    setActiveToolState(tool);
  }

  function setSidebarTab(tool: ToolKey | null) {
    setSidebarTabState(tool);
  }

  // Mobile-only: picking a class tool from the bottom sheet needs the
  // full-screen stage to actually switch into "tools" mode to show it.
  function openToolFullscreen(tool: ToolKey) {
    setActiveToolState(tool);
    setMainModeState("tools");
  }

  function toggleParticipantMic(id: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, micOn: !p.micOn } : p)));
  }

  const {
    pendingRequest: screenShareRequest,
    myRequestStatus: screenShareRequestStatus,
    requestScreenShare,
    approveRequest: approveScreenShareRequest,
    declineRequest: declineScreenShareRequest,
    resetMyRequest: resetScreenShareRequest,
  } = useScreenShareRequests({ classroomId: session.classroomId, role, selfName: role === "tutor" ? session.tutorName : (session.studentName ?? "You") });

  // Real screen sharing — swaps the outgoing WebRTC video track between the
  // camera and a genuine getDisplayMedia() capture, rather than a UI-only
  // toggle. The browser's own native "Stop sharing" control (which every
  // browser adds automatically to a shared tab/window) fires the track's
  // `onended`, which is what ends up calling this same function to revert —
  // so stopping from either side (Ensena's button or the browser's own bar)
  // is handled identically.
  async function startRealScreenShare() {
    if (!navigator.mediaDevices.getDisplayMedia) {
      showNotice("Screen sharing isn't supported in this browser.");
      return;
    }
    try {
      const captured = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = captured;
      setScreenStream(captured);
      const screenTrack = captured.getVideoTracks()[0];
      replaceVideoTrack(screenTrack ?? null);
      setScreenSharingState(true);
      screenTrack?.addEventListener("ended", () => {
        screenStreamRef.current = null;
        setScreenStream(null);
        setScreenSharingState(false);
        if (localStream) replaceVideoTrack(localStream.getVideoTracks()[0] ?? null);
        if (role === "student") resetScreenShareRequest();
      });
    } catch {
      // User cancelled the "choose what to share" browser prompt — not an error to surface.
      if (role === "student") resetScreenShareRequest();
    }
  }

  // A student's click never starts sharing directly — see the Ensena
  // Classroom host/participant model: only the tutor decides. The real
  // getDisplayMedia() capture only ever runs once the tutor's real,
  // synced approval comes back (see the effect below watching
  // screenShareRequestStatus). The tutor's own click is unchanged —
  // hosts don't need to approve themselves.
  async function setScreenSharing(next: SetStateAction<boolean>) {
    const shouldShare = typeof next === "function" ? next(screenSharing) : next;
    if (shouldShare === screenSharing) return;

    if (!shouldShare) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setScreenSharingState(false);
      if (localStream) replaceVideoTrack(localStream.getVideoTracks()[0] ?? null);
      if (role === "student") resetScreenShareRequest();
      return;
    }

    if (role === "student") {
      requestScreenShare();
      showNotice("Requesting permission from your tutor…");
      return;
    }

    await startRealScreenShare();
  }

  // Fires once the tutor's approval/decline for THIS student's own request
  // arrives over the real-time channel — this is the one place the actual
  // device capture begins for a student, never on the click itself.
  useEffect(() => {
    if (role !== "student") return;
    if (screenShareRequestStatus === "approved") {
      // Acquiring a real getDisplayMedia() capture in response to a genuine
      // external event (the tutor's real-time approval) — the same
      // legitimate "synchronize with an external system" case as
      // use-local-media.ts's own device acquisition, not a derivable
      // render value.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void startRealScreenShare();
    } else if (screenShareRequestStatus === "declined") {
      showNotice("Your tutor declined screen sharing.");
      resetScreenShareRequest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the approval status itself changes
  }, [screenShareRequestStatus]);

  // The one real identity every moderation surface in this classroom
  // (chat, whiteboard text, camera/screen OCR+QR, speech) attributes a
  // finding to — always the CURRENT viewer, never the remote peer, per the
  // "only the sender is penalized" rule this shares with Messages.
  const selfIdentityName = role === "tutor" ? session.tutorName : (session.studentName ?? "You");
  const selfActorRole = role === "tutor" ? "Tutor" : "Student";

  // Real camera/screen contact-sharing detection — watches this
  // participant's own OUTGOING video (never the remote peer's), using QR
  // decoding + OCR on sampled frames. See use-classroom-vision-safety.ts
  // for the sampling/multi-frame-trust design.
  useClassroomVisionSafety({
    stream: localStream,
    enabled: camOn,
    selfName: selfIdentityName,
    actorRole: selfActorRole,
    source: "Camera",
    onViolation: (message, highConfidence) => (highConfidence ? terminateForViolation("camera") : showNotice(message)),
  });
  useClassroomVisionSafety({
    stream: screenStream,
    enabled: screenSharing,
    selfName: selfIdentityName,
    actorRole: selfActorRole,
    source: "Screen",
    onViolation: (message, highConfidence) => (highConfidence ? terminateForViolation("screen share") : showNotice(message)),
  });
  // Real speech-to-text moderation via the browser's own native
  // SpeechRecognition — see use-classroom-speech-safety.ts for the
  // Chromium-only honest limitation.
  useClassroomSpeechSafety({
    enabled: micOn,
    selfName: selfIdentityName,
    actorRole: selfActorRole,
    onViolation: (message, highConfidence) => (highConfidence ? terminateForViolation("audio") : showNotice(message)),
  });

  // The classroom's own in-call chat is a real, separate text channel from
  // the main Messages inbox — it must go through the exact same
  // Communication Safety / Violation engine, not a second, unmoderated one.
  // A live session is already booked and paid for, so a violation here is
  // treated with the same seriousness as one in Messages (same strike
  // ladder, same admin case) rather than a lighter, classroom-only rule.
  function sendChat(text: string) {
    if (!text.trim()) return;
    const senderName = selfIdentityName;
    const actorRole = selfActorRole;
    if (isRestricted(senderName, actorRole, "messaging")) {
      showNotice(buildRestrictionMessage(senderName, actorRole));
      return;
    }
    const analysis = analyzeCommunication(text);
    if (analysis.verdict === "block" && analysis.primary) {
      recordViolation(senderName, actorRole, analysis.primary.category, analysis.primary.confidence, "Message", { evidence: text });
      if (analysis.primary.confidence === "high") {
        terminateForViolation("chat");
        return;
      }
      showNotice(BLOCKED_MESSAGE_COPY);
      return;
    }
    // Same conversation-level reconstruction as the Messages inbox — a
    // phone number spelled out one word per chat line shouldn't slip
    // through just because each line looks harmless alone. Reconstruction
    // is always treated as non-high-confidence for termination purposes
    // (still blocked and strikes the account, just doesn't end the live
    // session on its own — same rule as the speech-safety hook).
    const recentOwn = chat.filter((m) => m.senderRole === role).slice(-10).map((m) => m.text);
    if (recentOwn.length > 0) {
      const combined = analyzeCommunication([...recentOwn, text].join(" "));
      if (combined.verdict === "block" && combined.primary) {
        recordViolation(senderName, actorRole, combined.primary.category, "medium", "Message", {
          evidence: [...recentOwn, text].join(" | "),
          fromContextWindow: true,
        });
        showNotice(BLOCKED_MESSAGE_COPY);
        return;
      }
    }
    sendChatMessage({ id: `c-${Date.now()}`, sender: senderName, senderRole: role, text, time: "Now" });
  }

  function addResource() {
    const name = window.prompt("Resource file name (e.g. Worksheet.pdf)");
    if (name && name.trim()) setResources((prev) => [...prev, name.trim()]);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 2500);
  }

  function openResource(name: string) {
    showNotice(`Opening ${name}… (demo: no real file to preview)`);
  }

  // Only the tutor ending the class starts the escrow confirmation clock — a
  // student merely leaving the room isn't "the lesson is complete" (only the
  // tutor's End Class click is). Money is never released here — Private
  // flips to "Awaiting Student Confirmation"; Group creates one independent
  // per-student allocation each, all "Awaiting 24h report window." Either
  // way the student (or 24h) still has to act before the tutor sees it as
  // Available.
  function confirmLeave() {
    setLeaveOpen(false);
    if (session.live && role === "tutor" && (session.kind === "private" || session.kind === "group" || session.kind === "discovery")) {
      void endLiveClass({ kind: session.kind, id: session.id, liveSessionId: session.liveSessionId, reason: "ended" }).then((result) => {
        if (!result.ok) showNotice(result.message ?? "We couldn't record the end of this class.");
        else if (session.kind === "private") showNotice("Lesson marked complete. Your student has 24 hours to confirm before payment is released.");
        else if (session.kind === "group") showNotice("Class marked complete. Students have 24 hours to report a problem before earnings are released.");
        window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1400);
      });
      return;
    }
    if (role === "tutor" && session.kind === "discovery" && !markedDiscoveryEndRef.current) {
      markedDiscoveryEndRef.current = true;
      updateDiscoverySession(session.id, {
        status: "Completed",
        funnelStage: "CompletedAwaitingFeedback",
        actualEndAtISO: new Date().toISOString(),
        endedBy: "tutor",
      });
    }
    if (role === "tutor" && session.kind === "private" && session.amountGross > 0 && session.studentName) {
      startLessonConfirmation({
        id: `lc-cls-${session.kind}-${session.id}`,
        student: session.studentName,
        tutor: session.tutorName,
        subject: session.subject,
        amountGross: session.amountGross,
        scheduledLabel: `${session.date} · ${session.time}`,
      });
      showNotice("Lesson marked complete. Your student has 24 hours to confirm before payment is released.");
      window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1400);
      return;
    }
    if (role === "tutor" && session.kind === "group" && session.amountGross > 0) {
      endGroupSession();
      return;
    }
    router.push(leaveHrefWithReviewPrompt);
  }

  // Shared by the normal "End Class" confirm, "Report a Problem", and a
  // policy-violation termination — the only difference between the first two
  // is whether a tutor-reported issue holds every enrolled student's
  // allocation for review instead of starting the normal 24h per-student
  // report window. `silent` is for the violation path only: terminateForViolation
  // owns the single unified notice/navigation for whichever session kind was
  // ended, so it skips this function's own copy of both.
  function endGroupSession(tutorReportedIssue?: string, options?: { silent?: boolean }) {
    if (session.live) {
      void endLiveClass({ kind: "group", id: session.id, liveSessionId: session.liveSessionId, reason: options?.silent ? "violation" : "ended", issue: tutorReportedIssue }).then((result) => {
        if (options?.silent) return;
        showNotice(
          !result.ok
            ? (result.message ?? "We couldn't record the end of this class.")
            : tutorReportedIssue
              ? "Session flagged for review. Every student's payment for this session is held pending Admin review."
              : "Class marked complete. Students have 24 hours to report a problem before earnings are released."
        );
        window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1400);
      });
      return;
    }
    const groupClass = initialMyGroupClasses.find((g) => g.id === session.id);
    const todayISO = toISO(new Date());
    // currentCohort lives only on the computed cohort map (see
    // buildGroupClassCohorts's own doc comment) — never on the base
    // initialMyGroupClasses record itself.
    const cohort = groupClass ? buildGroupClassCohorts(todayISO)[groupClass.id]?.currentCohort : undefined;
    if (groupClass && cohort && groupClass.students.length > 0) {
      const scheduledSessions = buildGroupClassSessions(groupClass, cohort, todayISO);
      const liveIndex = scheduledSessions.findIndex((s) => s.status === "Live");
      let fallbackIndex = -1;
      for (let i = scheduledSessions.length - 1; i >= 0; i--) {
        if (scheduledSessions[i].status !== "Upcoming") {
          fallbackIndex = i;
          break;
        }
      }
      const resolvedIndex = liveIndex !== -1 ? liveIndex : fallbackIndex !== -1 ? fallbackIndex : 0;
      const liveSession = scheduledSessions[resolvedIndex];
      if (liveSession) {
        const attendanceMap = buildSessionAttendance(liveSession, resolvedIndex, groupClass.students);
        const students = groupClass.students.map((s) => ({
          id: slugifyName(s.name),
          name: s.name,
          attendedMinutes: attendanceMap[s.name]
            ? session.durationMinutesNumeric - sessionAttendanceVariance(`${liveSession.id}-${s.name}`, Math.max(1, Math.round(session.durationMinutesNumeric * 0.15)))
            : 0,
        }));
        startGroupSessionConfirmations({
          groupClassId: groupClass.id,
          sessionId: liveSession.id,
          subject: session.title,
          tutor: session.tutorName,
          scheduledLabel: `${session.date} · ${session.time}`,
          scheduledDurationMinutes: session.durationMinutesNumeric,
          recordedDurationMinutes: session.durationMinutesNumeric,
          tutorAbsent: false,
          tutorReportedIssue,
          amountGrossPerStudent: session.amountGross,
          students,
        });
        if (!options?.silent) {
          showNotice(
            tutorReportedIssue
              ? "Session flagged for review. Every student's payment for this session is held pending Admin review."
              : "Class marked complete. Students have 24 hours to report a problem before earnings are released."
          );
        }
      }
    }
    if (!options?.silent) window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 1400);
  }

  function submitProblemReport() {
    setReportProblemOpen(false);
    setLeaveOpen(false);
    endGroupSession(problemReason);
  }

  // A confirmed HIGH-confidence contact-sharing finding (never a mere
  // cross-message/cross-frame reconstruction — see each detection surface's
  // own onViolation wiring above) ends the session immediately for BOTH
  // participants and holds payment for review, using the exact same escrow
  // mechanisms a normal class-end already uses — never a parallel payment
  // path. `source` is just which surface caught it (for the dispute detail
  // text); the violator is always the current viewer, since every detection
  // surface here only ever scans the current viewer's own outgoing content.
  function terminateForViolation(source: "chat" | "camera" | "screen share" | "audio" | "whiteboard") {
    if (terminatedRef.current) return;
    terminatedRef.current = true;

    const violatorName = selfIdentityName;
    const disputeDetail = `Automated detection ended this live session after flagging ${violatorName} (${selfActorRole}) for an attempt to share prohibited contact information via ${source}.`;

    if (session.live && (session.kind === "private" || session.kind === "discovery")) {
      void endLiveClass({ kind: session.kind, id: session.id, reason: "violation", issue: disputeDetail });
    } else if (session.live && session.kind === "group") {
      if (role === "tutor") endGroupSession(disputeDetail, { silent: true });
    } else if (session.kind === "private" && session.amountGross > 0 && session.studentName) {
      const id = `lc-cls-${session.kind}-${session.id}`;
      startLessonConfirmation({
        id,
        student: session.studentName,
        tutor: session.tutorName,
        subject: session.subject,
        amountGross: session.amountGross,
        scheduledLabel: `${session.date} · ${session.time}`,
      });
      openDispute(id, "System", "Policy violation", disputeDetail);
    } else if (session.kind === "group" && session.amountGross > 0) {
      endGroupSession(disputeDetail, { silent: true });
    } else if (session.kind === "discovery" && !markedDiscoveryEndRef.current) {
      markedDiscoveryEndRef.current = true;
      updateDiscoverySession(session.id, {
        status: "Completed",
        funnelStage: "CompletedAwaitingFeedback",
        actualEndAtISO: new Date().toISOString(),
        endedBy: "violation",
      });
    }

    const message =
      "This session has ended because it broke Enseña's rules on keeping communication and payments on the platform. Any payment for this session is paused, not forfeited, until Admin reviews the case.";
    setClassroomTermination(session.classroomId, message);
    setTerminated({ message });
    terminationTransportRef.current?.sendTerminationEvent({ message });
    window.setTimeout(() => router.push(leaveHrefWithReviewPrompt), 2200);
  }

  const state: ClassroomLiveState = {
    timerLabel,
    mainMode,
    setMainMode,
    activeTool,
    setActiveTool,
    openToolFullscreen,
    sidebarTab,
    setSidebarTab,
    toolsMenuOpen,
    setToolsMenuOpen,
    sessionLabel,
    setSessionLabel,
    micOn,
    setMicOn,
    camOn,
    setCamOn,
    localStream,
    remoteStream,
    peerConnectionState,
    mediaError,
    retryMedia,
    cameras,
    microphones,
    speakers,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    setCameraId,
    setMicId,
    setSpeakerId,
    canSelectSpeaker,
    micLevel,
    speakerOn,
    setSpeakerOn,
    handRaised,
    toggleMyHand,
    lowerHand,
    screenSharing,
    setScreenSharing,
    participants,
    toggleParticipantMic,
    chat,
    sendChat,
    resources,
    addResource,
    openResource,
    notes,
    setNotes,
    onLeave: () => setLeaveOpen(true),
    sheetOpen,
    setSheetOpen,
    notice,
    showNotice,
    reportHighConfidenceViolation: () => terminateForViolation("whiteboard"),
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <ClassroomRecordingNotice classroomId={session.classroomId} />
      <ClassroomTopBar
        role={role}
        session={session}
        timerLabel={timerLabel}
        peerConnectionState={peerConnectionState}
        connectedCount={connectedCount}
        sessionLabel={sessionLabel}
        onEditLabel={setSessionLabel}
        onLeave={() => setLeaveOpen(true)}
        onMore={() => setSheetOpen(true)}
        onOpenSettings={() => setSidebarTab("settings")}
        onOpenParticipants={() => {
          // Serves both the desktop "N Students" pill (opens the desktop
          // side panel) and the mobile people-count button (opens the
          // bottom sheet) — each only ever renders on its own breakpoint,
          // so setting both pieces of state here is harmless.
          setSidebarTab("participants");
          setActiveTool("participants");
          setSheetOpen(true);
        }}
      />
      <div className="lg:hidden">
        <MobileClassroomTopBar
          session={session}
          transparent={mainMode === "video" && session.kind === "group"}
          isPrivateVideo={mainMode === "video" && session.kind !== "group"}
          sessionLabel={sessionLabel}
          timerLabel={timerLabel}
          hasUnreadChat={chat.length > 0}
          onOpenChat={() => {
            setActiveTool("chat");
            setSheetOpen(true);
          }}
        />
      </div>

      {terminated ? (
        <ClassroomEndedScreen role={role} leaveHref={leaveHrefWithReviewPrompt} reason="violation" message={terminated.message} />
      ) : ended ? (
        <ClassroomEndedScreen role={role} leaveHref={leaveHrefWithReviewPrompt} />
      ) : (
        <ClassroomLayout role={role} session={session} state={state} />
      )}

      <ClassroomLeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        onConfirm={confirmLeave}
        confirmLabel={role === "tutor" && (session.kind === "group" || session.kind === "discovery") ? "End Class" : undefined}
        onReportProblem={role === "tutor" && session.kind === "group" ? () => { setLeaveOpen(false); setReportProblemOpen(true); } : undefined}
        title={role === "tutor" && session.kind === "discovery" ? "End Discovery Class?" : undefined}
        body={
          role === "tutor" && session.kind === "discovery"
            ? "The session has not reached its scheduled end time. Ending now will complete the Discovery Class early."
            : undefined
        }
      />

      <Modal open={reportProblemOpen} onClose={() => setReportProblemOpen(false)} title="Report a Problem">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This holds every enrolled student&apos;s payment for this session until Admin reviews it.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">What happened?</span>
            <select value={problemReason} onChange={(e) => setProblemReason(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {tutorProblemReasons.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <Button onClick={submitProblemReport} className="h-10 w-full rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
            Submit Report &amp; End Class
          </Button>
        </div>
      </Modal>

      {notice && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-xs font-medium text-ensena-ink shadow-lg lg:bottom-6">
          {notice}
        </div>
      )}

      {/* Real, synced screen-share approval — only ever shown to the tutor
          (the host), never fabricated local UI. See use-screen-share-
          requests.ts and the Ensena Classroom host/participant model. */}
      {role === "tutor" && screenShareRequest && (
        <div className="fixed inset-x-4 top-20 z-[60] mx-auto max-w-sm rounded-2xl border border-ensena-border bg-ensena-surface p-4 shadow-xl sm:inset-x-auto sm:right-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
              <ScreenShare className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ensena-ink">Screen Share Request</p>
              <p className="mt-0.5 text-xs text-ensena-muted">{screenShareRequest.requesterName} wants to share their screen.</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => declineScreenShareRequest(screenShareRequest.id)}
              className="h-9 flex-1 rounded-full border border-ensena-border text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => approveScreenShareRequest(screenShareRequest.id)}
              className="h-9 flex-1 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              Allow
            </button>
          </div>
        </div>
      )}

      {/* Student-facing: an honest "waiting" state — never silently starts sharing before the tutor responds. */}
      {role === "student" && screenShareRequestStatus === "pending" && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-ensena-ink shadow-lg lg:bottom-6">
          <MonitorX className="size-3.5 animate-pulse text-ensena-muted" /> Requesting permission from your tutor…
        </div>
      )}
    </div>
  );
}
