"use client";

import { useEffect, useRef, useState } from "react";

import { createClassroomSyncTransport, type ClassroomSyncTransport, type HandRaiseEvent } from "@/lib/classroom-sync";

export interface UseHandRaiseResult {
  /** Real display names of every participant currently raising a hand, from either side's perspective — a tutor sees every student who's raised theirs; a student sees their own (and, if a classmate's event reaches them, that classmate's too). */
  raisedHandNames: Set<string>;
  myHandRaised: boolean;
  toggleMyHand: () => void;
  /** Tutor-side acknowledgement — lowers a specific participant's hand for everyone, not just locally. */
  lowerHand: (participantName: string) => void;
}

// A raised hand is real, synced presence — not a local-only icon toggle —
// see the Ensena Classroom host/participant model. Rides the exact same
// shared transport the whiteboard/tools/screen-share signaling already use
// for this classroomId (ref-counted — this adds no extra connection).
// Keyed by real display name rather than a per-viewer participant id,
// since (like Quiz/Matching/etc.) each side's own participants array
// assigns different local ids to the same real person — name is the one
// stable, real, already-established identity this app keys shared state by.
export function useHandRaise({ classroomId, selfName }: { classroomId: string; selfName: string }): UseHandRaiseResult {
  const [raisedHandNames, setRaisedHandNames] = useState<Set<string>>(new Set());
  const [myHandRaised, setMyHandRaised] = useState(false);
  const transportRef = useRef<ClassroomSyncTransport | null>(null);

  useEffect(() => {
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    const unsub = transport.onHandRaiseEvent((event: HandRaiseEvent) => {
      setRaisedHandNames((prev) => {
        const next = new Set(prev);
        if (event.kind === "raised") next.add(event.participantName);
        else next.delete(event.participantId);
        return next;
      });
      if (event.kind === "lowered" && event.participantId === selfName) setMyHandRaised(false);
    });

    return () => {
      unsub();
      transport.disconnect();
      transportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selfName is fixed for the lifetime of one classroom visit
  }, [classroomId]);

  function toggleMyHand() {
    const next = !myHandRaised;
    setMyHandRaised(next);
    setRaisedHandNames((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(selfName);
      else updated.delete(selfName);
      return updated;
    });
    transportRef.current?.sendHandRaiseEvent(next ? { kind: "raised", participantId: selfName, participantName: selfName } : { kind: "lowered", participantId: selfName });
  }

  function lowerHand(participantName: string) {
    setRaisedHandNames((prev) => {
      const next = new Set(prev);
      next.delete(participantName);
      return next;
    });
    if (participantName === selfName) setMyHandRaised(false);
    transportRef.current?.sendHandRaiseEvent({ kind: "lowered", participantId: participantName });
  }

  return { raisedHandNames, myHandRaised, toggleMyHand, lowerHand };
}
