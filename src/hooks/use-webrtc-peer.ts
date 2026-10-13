"use client";

import { useEffect, useRef, useState } from "react";

import { createClassroomSyncTransport, type ClassroomSyncTransport, type WebRTCSignal } from "@/lib/classroom-sync";

export type PeerConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "failed" | "closed";

export interface UseWebRTCPeerResult {
  /** The remote participant's real MediaStream once the connection is up — null until then. */
  remoteStream: MediaStream | null;
  connectionState: PeerConnectionState;
  /** Swaps the outgoing video track (e.g. for screen sharing) without renegotiating audio. */
  replaceVideoTrack: (track: MediaStreamTrack | null) => void;
}

// Free, no-account-needed STUN (NAT traversal only — no media relay). This
// is enough for two peers on an open network or the same NAT; there is no
// TURN server here, so a call between two peers behind restrictive/
// symmetric NATs (common on some corporate or mobile carrier networks) can
// fail to establish a direct path. A TURN relay is the standard fix for
// that, but every option is a paid/hosted service — out of scope for this
// pass; disclosed here rather than silently left as a mystery failure.
const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

// One real WebRTC peer connection per classroom, signaled over the same
// classroom-sync transport the whiteboard uses (SDP offer/answer + ICE
// candidates relayed as opaque messages — see classroom-sync.ts). Works
// today between two tabs of the same browser (BroadcastChannel signaling);
// becomes genuine cross-device video the moment a real Supabase project is
// connected, with zero changes here (createClassroomSyncTransport already
// picks the right transport).
export function useWebRTCPeer({
  classroomId,
  localStream,
  isInitiator,
  enabled = true,
}: {
  classroomId: string;
  localStream: MediaStream | null;
  isInitiator: boolean;
  /** False for a group class — this hook only supports one 1:1 peer connection, and broadcasting an offer with no targetId into a room with more than one other participant would connect to whichever one answers first, at random. Group video stays the existing simulated view until real multi-party (mesh/SFU) support exists. */
  enabled?: boolean;
}): UseWebRTCPeerResult {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<PeerConnectionState>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transportRef = useRef<ClassroomSyncTransport | null>(null);
  const remotePeerIdRef = useRef<string | null>(null);
  const senderRefs = useRef<{ video: RTCRtpSender | null; audio: RTCRtpSender | null }>({ video: null, audio: null });

  // (Re)creates the peer connection whenever the local stream itself
  // changes (e.g. it just finished loading) — a peer connection with no
  // local tracks yet would negotiate an offer with nothing to send.
  useEffect(() => {
    if (!localStream || !enabled) return;
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors a genuinely external system's state (the RTCPeerConnection), not derivable from props
    setConnectionState("connecting");

    localStream.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, localStream);
      if (track.kind === "video") senderRefs.current.video = sender;
      if (track.kind === "audio") senderRefs.current.audio = sender;
    });

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] ?? null);
    };

    // ICE gathering can start (and produce candidates) before the remote
    // peer's id is known — e.g. the initiator's own candidates can fire
    // before the answer carrying that id arrives. Buffered and flushed
    // once the id is known, rather than silently dropped, since losing
    // early candidates can be the difference between a connection
    // establishing quickly and not establishing at all.
    const pendingCandidates: RTCIceCandidate[] = [];
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      if (remotePeerIdRef.current) {
        transport.sendSignal({ kind: "ice-candidate", data: event.candidate.toJSON(), targetId: remotePeerIdRef.current });
      } else {
        pendingCandidates.push(event.candidate);
      }
    };

    function flushPendingCandidates() {
      if (!remotePeerIdRef.current) return;
      while (pendingCandidates.length > 0) {
        const candidate = pendingCandidates.shift()!;
        transport.sendSignal({ kind: "ice-candidate", data: candidate.toJSON(), targetId: remotePeerIdRef.current });
      }
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") setConnectionState("connected");
      else if (state === "disconnected") setConnectionState("reconnecting");
      else if (state === "failed") setConnectionState("failed");
      else if (state === "closed") setConnectionState("closed");
    };

    const unsubSignal = transport.onSignal(async (signal: WebRTCSignal, senderId: string) => {
      try {
        if (signal.kind === "offer") {
          remotePeerIdRef.current = senderId;
          flushPendingCandidates();
          await pc.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          transport.sendSignal({ kind: "answer", data: answer, targetId: senderId });
        } else if (signal.kind === "answer") {
          remotePeerIdRef.current = senderId;
          flushPendingCandidates();
          if (pc.signalingState !== "stable") await pc.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
        } else if (signal.kind === "ice-candidate") {
          await pc.addIceCandidate(signal.data as RTCIceCandidateInit);
        }
      } catch {
        // A stray/late signal from a peer that already renegotiated is
        // expected occasionally (e.g. a quick refresh) — not fatal, the
        // next real offer/answer re-establishes the connection.
      }
    });

    // Only the tutor initiates (avoids "glare" — both sides creating
    // offers simultaneously — in this always-two-participant scenario).
    // The student's peer connection just waits for the tutor's offer.
    if (isInitiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        transport.sendSignal({ kind: "offer", data: offer });
      })();
    }

    return () => {
      unsubSignal();
      transport.disconnect();
      pc.close();
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classroomId/isInitiator are fixed for one classroom visit; re-running only when the stream itself becomes available (or enabled changes) is intentional
  }, [classroomId, localStream, enabled]);

  function replaceVideoTrack(track: MediaStreamTrack | null) {
    const sender = senderRefs.current.video;
    if (sender && track) void sender.replaceTrack(track);
  }

  return { remoteStream, connectionState, replaceVideoTrack };
}
