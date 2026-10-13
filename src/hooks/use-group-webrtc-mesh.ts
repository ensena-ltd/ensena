"use client";

import { useEffect, useRef, useState } from "react";

import { createClassroomSyncTransport, type ClassroomParticipantRole, type ClassroomSyncTransport, type WebRTCSignal } from "@/lib/classroom-sync";
import type { PeerConnectionState } from "@/hooks/use-webrtc-peer";

// Free, no-account-needed STUN — same servers/limitation as the 1:1 hook
// (use-webrtc-peer.ts); see its own comment for the no-TURN disclosure.
const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export interface GroupMeshPeer {
  stream: MediaStream | null;
  connectionState: PeerConnectionState;
}

export interface GroupMeshPresenceEntry {
  name: string;
  role: ClassroomParticipantRole;
  /** Real, live mic/camera state — see the doc comment on ClassroomPresenceUser for why this rides presence instead of being read off the track itself. Defaults to on/on for a peer that hasn't reported otherwise yet. */
  micOn: boolean;
  camOn: boolean;
}

export interface UseGroupWebRTCMeshResult {
  /** Real per-peer connections, keyed by the transport's own id for that tab — one RTCPeerConnection per OTHER participant currently in the room. */
  peersById: Map<string, GroupMeshPeer>;
  /** Who's really present right now (this tab included), keyed by the same id — the bridge between a live connection and a named roster entry, since names alone can collide and ids alone carry no display info. */
  presentById: Map<string, GroupMeshPresenceEntry>;
  selfId: string | null;
}

// Real multi-party video for a Group Class — a full mesh (one
// RTCPeerConnection per OTHER participant), signaled over the same
// classroom-sync transport the 1:1 private-lesson hook and the whiteboard
// already use. WebRTCSignal.targetId exists specifically for this (see its
// own doc comment in classroom-sync.ts) — this is the first caller to
// actually address a signal at one specific peer in a room of more than two.
//
// There is no SFU/media-relay server in this app, so mesh is the only
// topology that doesn't require standing one up — it scales fine to the
// small class sizes this product actually has (a handful of students), not
// hundreds, which a real SFU would be needed for.
//
// Who initiates the offer within any given pair is decided by a
// deterministic comparison of the two transport ids (the lexicographically
// smaller one always offers) rather than "whoever joined second" — both
// sides reach the same conclusion independently, with no coordination and
// no risk of both emitting an offer at once (the classic WebRTC "glare").
//
// Presence is tracked here directly (not borrowed from the whiteboard hook)
// because the whiteboard component only mounts in Whiteboard/Whiteboard+Video
// mode — a participant who never leaves plain Video mode would otherwise
// never register as present, and this mesh would never connect to them.
// Every caller shares the transport's SELF_ID module-wide, so this and the
// whiteboard's own trackPresence() call coexist harmlessly even when both
// are active at once (same id, idempotent re-broadcast of the same identity).
export function useGroupWebRTCMesh({
  classroomId,
  localStream,
  selfName,
  selfRole,
  micOn,
  camOn,
  enabled,
}: {
  classroomId: string;
  localStream: MediaStream | null;
  selfName: string;
  selfRole: ClassroomParticipantRole;
  /** Real, current toggle state — re-broadcast to the room on every change (see the second effect below), not just once at connect time. */
  micOn: boolean;
  camOn: boolean;
  enabled: boolean;
}): UseGroupWebRTCMeshResult {
  const [peersById, setPeersById] = useState<Map<string, GroupMeshPeer>>(new Map());
  const [presentById, setPresentById] = useState<Map<string, GroupMeshPresenceEntry>>(new Map());
  const [selfId, setSelfId] = useState<string | null>(null);
  const transportRef = useRef<ClassroomSyncTransport | null>(null);

  useEffect(() => {
    if (!localStream || !enabled) return;
    // Captured once, non-null, so the closures below (some defined well
    // after this point) don't need TypeScript to re-derive narrowing across
    // function boundaries — it doesn't, the same way it can't for `session`
    // in a callback defined inside a component that already null-checked it.
    const stream = localStream;
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the transport's own real, external per-tab identity, not derivable from props
    setSelfId(transport.selfId);
    const pcs = new Map<string, RTCPeerConnection>();
    // A genuinely abrupt departure (tab killed, browser crash, network
    // drop) never fires presence-leave — there's no JS left running to send
    // it, and even the "beforeunload" fallback in classroom-sync.ts doesn't
    // fire for every way a page can disappear. This is the second, WebRTC-
    // level line of defense: onconnectionstatechange itself notices the
    // connection is gone. A short grace period tolerates a real momentary
    // network blip (which briefly reports "disconnected" then recovers on
    // its own) without yanking the tile the instant that happens; "failed"
    // means ICE has already given up, so that one removes immediately.
    const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
    // Long enough to ride out a real momentary ICE hiccup (including one
    // caused by many simultaneous connections competing for CPU in a large
    // class) without either (a) declaring someone gone while they were
    // about to recover on their own, or (b) leaving a truly-gone peer's
    // tile up for an unreasonable stretch.
    const DISCONNECT_GRACE_MS = 8000;

    function clearDisconnectTimer(id: string) {
      const timer = disconnectTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(id);
      }
    }

    function updatePeer(id: string, patch: Partial<GroupMeshPeer>) {
      setPeersById((prev) => {
        const next = new Map(prev);
        const current = next.get(id) ?? { stream: null, connectionState: "connecting" as PeerConnectionState };
        next.set(id, { ...current, ...patch });
        return next;
      });
    }

    function removePeer(id: string) {
      clearDisconnectTimer(id);
      pcs.get(id)?.close();
      pcs.delete(id);
      setPeersById((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }

    function createPeerConnection(peerId: string): RTCPeerConnection {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      updatePeer(peerId, { connectionState: "connecting" });
      pc.ontrack = (event) => updatePeer(peerId, { stream: event.streams[0] ?? null });
      pc.onicecandidate = (event) => {
        if (event.candidate) transport.sendSignal({ kind: "ice-candidate", data: event.candidate.toJSON(), targetId: peerId });
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "connected") {
          clearDisconnectTimer(peerId);
          updatePeer(peerId, { connectionState: "connected" });
        } else if (state === "disconnected") {
          updatePeer(peerId, { connectionState: "reconnecting" });
          clearDisconnectTimer(peerId);
          disconnectTimers.set(
            peerId,
            setTimeout(() => {
              if (pc.connectionState !== "connected") removePeer(peerId);
            }, DISCONNECT_GRACE_MS)
          );
        } else if (state === "failed") {
          removePeer(peerId);
        } else if (state === "closed") {
          updatePeer(peerId, { connectionState: "closed" });
        }
      };
      pcs.set(peerId, pc);
      return pc;
    }

    const unsubSignal = transport.onSignal(async (signal: WebRTCSignal, senderId: string) => {
      try {
        if (signal.kind === "offer") {
          const pc = pcs.get(senderId) ?? createPeerConnection(senderId);
          await pc.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          transport.sendSignal({ kind: "answer", data: answer, targetId: senderId });
        } else if (signal.kind === "answer") {
          const pc = pcs.get(senderId);
          if (pc && pc.signalingState !== "stable") await pc.setRemoteDescription(signal.data as RTCSessionDescriptionInit);
        } else if (signal.kind === "ice-candidate") {
          const pc = pcs.get(senderId);
          if (pc) await pc.addIceCandidate(signal.data as RTCIceCandidateInit);
        }
      } catch {
        // A stray/late signal from a peer mid-renegotiation, or one who's
        // already left, is expected occasionally — not fatal.
      }
    });

    const unsubPresence = transport.onPresenceChange((users) => {
      const nextPresent = new Map<string, GroupMeshPresenceEntry>();
      for (const u of users) nextPresent.set(u.id, { name: u.name, role: u.role, micOn: u.micOn ?? true, camOn: u.camOn ?? true });
      setPresentById(nextPresent);

      const presentIds = new Set(Array.from(nextPresent.keys()).filter((id) => id !== transport.selfId));

      // A participant who disconnected (browser closed, tab navigated away,
      // network drop) needs their connection torn down — leaving a stale
      // RTCPeerConnection around would keep showing a frozen last frame
      // rather than removing the tile.
      for (const id of Array.from(pcs.keys())) {
        if (!presentIds.has(id)) removePeer(id);
      }

      for (const id of presentIds) {
        if (pcs.has(id)) continue;
        const amInitiator = transport.selfId < id;
        if (!amInitiator) continue; // the other side's presence handler will offer to us instead
        const pc = createPeerConnection(id);
        void (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          transport.sendSignal({ kind: "offer", data: offer, targetId: id });
        })();
      }
    });

    transport.trackPresence({ role: selfRole, name: selfName, micOn, camOn });

    return () => {
      unsubSignal();
      unsubPresence();
      transportRef.current = null;
      transport.disconnect();
      for (const timer of disconnectTimers.values()) clearTimeout(timer);
      disconnectTimers.clear();
      for (const pc of pcs.values()) pc.close();
      pcs.clear();
      setPeersById(new Map());
      setPresentById(new Map());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- classroomId/selfName/selfRole/initial micOn/camOn are fixed for one classroom visit; re-running only when the local stream itself becomes available (or enabled changes) is intentional, same rationale as use-webrtc-peer.ts. Live mic/cam CHANGES are re-broadcast by the separate effect below instead of tearing down and rebuilding every peer connection on every toggle.
  }, [classroomId, localStream, enabled]);

  // Re-announces real mic/camera state on every toggle — trackPresence()
  // just re-broadcasts a fresh presence-join under the same id, so this is
  // cheap and doesn't touch any RTCPeerConnection.
  useEffect(() => {
    transportRef.current?.trackPresence({ role: selfRole, name: selfName, micOn, camOn });
  }, [micOn, camOn, selfRole, selfName]);

  return { peersById, presentById, selfId };
}
