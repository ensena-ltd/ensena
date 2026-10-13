"use client";

import { useEffect, useRef, useState } from "react";

import { createClassroomSyncTransport, type ClassroomSyncTransport, type ScreenShareEvent, type ScreenShareRequest } from "@/lib/classroom-sync";

export type MyRequestStatus = "idle" | "pending" | "approved" | "declined";

export interface UseScreenShareRequestsResult {
  /** Tutor-facing: the currently-pending request, if any (only ever set for role === "tutor"). */
  pendingRequest: ScreenShareRequest | null;
  /** Student-facing: the status of THIS viewer's own most recent request. */
  myRequestStatus: MyRequestStatus;
  requestScreenShare: () => void;
  approveRequest: (id: string) => void;
  declineRequest: (id: string) => void;
  notifyStopped: (id: string) => void;
  resetMyRequest: () => void;
}

// A student's screen share is never local-only UI state — see the Ensena
// Classroom host/participant model (classroom-sync.ts's ScreenShareEvent).
// Rides the exact same shared transport the whiteboard/tools/video
// signaling already use for this classroomId (ref-counted — this adds no
// extra connection).
export function useScreenShareRequests({
  classroomId,
  role,
  selfName,
}: {
  classroomId: string;
  role: "tutor" | "student";
  selfName: string;
}): UseScreenShareRequestsResult {
  const [pendingRequest, setPendingRequest] = useState<ScreenShareRequest | null>(null);
  const [myRequestStatus, setMyRequestStatus] = useState<MyRequestStatus>("idle");
  const transportRef = useRef<ClassroomSyncTransport | null>(null);
  const myRequestIdRef = useRef<string | null>(null);
  // Stable per-tab identity for "is this event about MY request" — doesn't
  // need to be a real backend user id since it only ever has to be unique
  // within this one classroom session.
  const [selfId] = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2)));

  useEffect(() => {
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    const unsub = transport.onScreenShareEvent((event: ScreenShareEvent) => {
      if (event.kind === "requested") {
        if (role === "tutor") setPendingRequest(event.request);
      } else if (event.kind === "approved") {
        if (event.id === myRequestIdRef.current) setMyRequestStatus("approved");
        if (role === "tutor") setPendingRequest((cur) => (cur?.id === event.id ? null : cur));
      } else if (event.kind === "declined") {
        if (event.id === myRequestIdRef.current) setMyRequestStatus("declined");
        if (role === "tutor") setPendingRequest((cur) => (cur?.id === event.id ? null : cur));
      } else if (event.kind === "stopped") {
        if (event.id === myRequestIdRef.current) setMyRequestStatus("idle");
      }
    });

    return () => {
      unsub();
      transport.disconnect();
      transportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- role/selfName are fixed for the lifetime of one classroom visit
  }, [classroomId]);

  function requestScreenShare() {
    const id = `ssr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    myRequestIdRef.current = id;
    setMyRequestStatus("pending");
    transportRef.current?.sendScreenShareEvent({
      kind: "requested",
      request: { id, requesterId: selfId, requesterName: selfName, createdAtISO: new Date().toISOString() },
    });
  }

  function approveRequest(id: string) {
    transportRef.current?.sendScreenShareEvent({ kind: "approved", id });
    setPendingRequest((cur) => (cur?.id === id ? null : cur));
  }

  function declineRequest(id: string) {
    transportRef.current?.sendScreenShareEvent({ kind: "declined", id });
    setPendingRequest((cur) => (cur?.id === id ? null : cur));
  }

  function notifyStopped(id: string) {
    transportRef.current?.sendScreenShareEvent({ kind: "stopped", id });
  }

  function resetMyRequest() {
    myRequestIdRef.current = null;
    setMyRequestStatus("idle");
  }

  return { pendingRequest, myRequestStatus, requestScreenShare, approveRequest, declineRequest, notifyStopped, resetMyRequest };
}
