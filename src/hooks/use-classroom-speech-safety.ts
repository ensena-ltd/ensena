"use client";

import { useEffect, useRef } from "react";

import { analyzeCommunication } from "@/lib/communication-safety";
import { recordViolation, type ActorRole } from "@/lib/moderation-store";

// Minimal shape of the non-standard Web Speech API this hook needs — not
// in TypeScript's standard DOM lib, and Chrome-only (Firefox/Safari have no
// native equivalent). Declared locally rather than pulling in a full
// ambient-types package for a handful of fields.
interface MinimalSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface MinimalSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<MinimalSpeechRecognitionResult>;
}
interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

// How many of the speaker's own recent transcribed phrases get combined
// with a new one before re-analyzing — the audio equivalent of
// messages-store.ts's own CONTEXT_WINDOW_SIZE, so "zero eight zero" said
// as three separate short utterances is reconstructed the same way three
// separate chat messages would be.
const CONTEXT_WINDOW_SIZE = 8;

export interface UseClassroomSpeechSafetyParams {
  enabled: boolean;
  selfName: string;
  actorRole: ActorRole;
  /** See use-classroom-vision-safety.ts's UseClassroomVisionSafetyParams doc on `highConfidence` — same rule: true only for a same-utterance direct match, never for a cross-phrase reconstruction. */
  onViolation: (message: string, highConfidence: boolean) => void;
}

// Real speech-to-text moderation for the live classroom, using the
// browser's own native SpeechRecognition — no new dependency, and no audio
// ever leaves the device for this (the browser's own on-device/OS speech
// engine does the transcription; this hook only ever sees the resulting
// text). HONEST LIMITATION: only available in Chromium-based browsers today
// — where it isn't, this silently does nothing rather than pretending to
// listen, exactly like file-safety.ts's own stated approach to a capability
// this app genuinely can't provide everywhere.
export function useClassroomSpeechSafety({ enabled, selfName, actorRole, onViolation }: UseClassroomSpeechSafetyParams): void {
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  });

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognizer = new Ctor();
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = "en-US";

    let cancelled = false;
    let recentPhrases: string[] = [];

    function handleTranscript(text: string) {
      const standalone = analyzeCommunication(text);
      if (standalone.verdict === "block" && standalone.primary) {
        recordViolation(selfName, actorRole, standalone.primary.category, standalone.primary.confidence, "Audio", { evidence: text });
        onViolationRef.current(
          "This session flagged spoken contact information. This has been recorded and may affect your account.",
          standalone.primary.confidence === "high"
        );
        recentPhrases = [];
        return;
      }
      if (recentPhrases.length > 0) {
        const combined = analyzeCommunication([...recentPhrases, text].join(" "));
        if (combined.verdict === "block" && combined.primary) {
          recordViolation(selfName, actorRole, combined.primary.category, "medium", "Audio", {
            evidence: [...recentPhrases, text].join(" | "),
            fromContextWindow: true,
          });
          // Cross-phrase reconstruction is always treated as non-high-confidence for
          // termination purposes here — same rule as the classroom chat and Messages
          // context-window checks (see messages-store.ts) — even though it's still
          // blocked and strikes the account.
          onViolationRef.current("This session flagged spoken contact information. This has been recorded and may affect your account.", false);
          recentPhrases = [];
          return;
        }
      }
      recentPhrases = [...recentPhrases, text].slice(-CONTEXT_WINDOW_SIZE);
    }

    recognizer.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        const transcript = result[0]?.transcript?.trim();
        if (transcript) handleTranscript(transcript);
      }
    };
    // A silence timeout or transient recognition error must never crash or
    // silently disable the rest of the classroom — Chrome's own
    // SpeechRecognition stops itself after a pause, so restart it for the
    // remainder of the lesson rather than going permanently deaf.
    recognizer.onerror = () => {};
    recognizer.onend = () => {
      if (!cancelled) {
        try {
          recognizer.start();
        } catch {
          // Already running / no microphone — nothing to recover into.
        }
      }
    };

    try {
      recognizer.start();
    } catch {
      // No microphone permission, or already-started — this hook degrades
      // to a no-op rather than throwing into the classroom.
    }

    return () => {
      cancelled = true;
      recognizer.onresult = null;
      recognizer.onerror = null;
      recognizer.onend = null;
      try {
        recognizer.stop();
      } catch {
        // Nothing to stop.
      }
    };
  }, [enabled, selfName, actorRole]);
}
