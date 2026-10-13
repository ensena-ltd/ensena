"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { initialLessonConfirmations, releaseSimNowAnchor, type AuditLogEntry, type LessonConfirmation } from "@/lib/escrow-release";
import * as escrowStore from "@/lib/escrow-store";

const EMPTY_AUDIT: AuditLogEntry[] = [];

// useSyncExternalStore's 3rd argument must return a value PINNED to what the
// server actually rendered (the pristine seed), not re-check localStorage —
// escrow-store.getLessonConfirmations() would return the real client value
// immediately (window is defined by the time this runs), which is exactly
// what caused a hydration mismatch when a demo action had already written
// something to localStorage before a later hard navigation/reload.
function getLessonsServerSnapshot(): LessonConfirmation[] {
  return initialLessonConfirmations;
}

// Every consumer across the app (student pages, tutor panels, admin
// disputes, the admin lesson-confirmation detail page) keeps this exact
// same hook shape it always had — only the storage underneath changed, from
// a private useState copy to the shared, localStorage-backed escrow-store,
// so tutor/student/admin views of the same lesson now actually agree.
export function useLessonConfirmations() {
  const lessons = useSyncExternalStore(escrowStore.subscribe, escrowStore.getLessonConfirmations, getLessonsServerSnapshot);
  const auditLog = useSyncExternalStore(escrowStore.subscribe, escrowStore.getAuditLog, () => EMPTY_AUDIT);

  // Initialized to the fixed anchor (not getSimulatedNow(), which depends on
  // real Date.now()) so server render and first client render produce
  // identical countdown text; the interval below advances it using real
  // elapsed time only once mounted on the client.
  const [nowMs, setNowMs] = useState(() => releaseSimNowAnchor);

  // The countdown/auto-release check is time-based, not just event-based —
  // nothing in storage "changes" on its own while a lesson merely ticks
  // toward its deadline. A 1s interval both advances the live countdown and
  // runs the background auto-release check, which writes to the shared store
  // (and so notifies every other mounted consumer) exactly once, whichever
  // tab/page happens to notice first.
  useEffect(() => {
    const interval = setInterval(() => {
      escrowStore.runAutoReleaseCheck();
      setNowMs(escrowStore.getSimulatedNow());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // These are plain module-level functions (not component closures), so
  // their identity is already stable across renders without useCallback.
  return {
    lessons,
    auditLog,
    nowMs,
    confirmLesson: escrowStore.confirmLesson,
    openDispute: escrowStore.openDispute,
    adminRelease: escrowStore.adminRelease,
    adminFreeze: escrowStore.adminFreeze,
    adminRefund: escrowStore.adminRefund,
    adminPartialRefund: escrowStore.adminPartialRefund,
    warnTutor: escrowStore.warnTutor,
    simulateElapsed: escrowStore.simulateElapsed,
    fileComplaint: escrowStore.fileComplaint,
    startLessonConfirmation: escrowStore.startLessonConfirmation,
    startGroupSessionConfirmations: escrowStore.startGroupSessionConfirmations,
    markSessionTutorAbsent: escrowStore.markSessionTutorAbsent,
    requestTutorResponse: escrowStore.requestTutorResponse,
    submitTutorResponse: escrowStore.submitTutorResponse,
    resolveDispute: escrowStore.resolveDispute,
  };
}
