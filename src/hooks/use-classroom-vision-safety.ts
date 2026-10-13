"use client";

import { useEffect, useRef } from "react";

import {
  acquireOcrWorker,
  captureFrame,
  decodeQr,
  frameChangedSignificantly,
  recognizeText,
  releaseOcrWorker,
} from "@/lib/classroom-vision-safety";
import { analyzeCommunication } from "@/lib/communication-safety";
import { recordViolation, type ActorRole } from "@/lib/moderation-store";

// Real, never-every-frame sampling — a live video call refreshes dozens of
// times a second; running OCR at anywhere near that rate would make the
// classroom unusable. Every 4 seconds is frequent enough to still catch
// someone holding up a phone number for a few seconds, cheap enough to
// never compete with the call itself.
const SAMPLE_INTERVAL_MS = 4000;
// Once a violation is recorded for a given category, don't record another
// for the same category for this long — someone holding the same piece of
// paper up for 30 seconds is one event, not one every 4 seconds.
const VIOLATION_COOLDOWN_MS = 30_000;

export interface UseClassroomVisionSafetyParams {
  /** The REAL MediaStream to watch — pass the local camera/screen-share stream (own outgoing video), never the remote peer's — see the "only the sender is penalized" rule this shares with every other part of the moderation system. */
  stream: MediaStream | null;
  enabled: boolean;
  selfName: string;
  actorRole: ActorRole;
  source: "Camera" | "Screen";
  /** `highConfidence` mirrors the underlying analysis's own "high" vs "medium" confidence — see communication-safety.ts's SafetyConfidence — never the multi-frame trust check alone, since a trusted-but-ambiguous OCR read (e.g. a partial address) still shouldn't be grounds for ending a live session. */
  onViolation: (message: string, highConfidence: boolean) => void;
}

// Watches a real local MediaStream for contact-sharing attempts — a phone
// number or QR code held up to the camera, or displayed via screen share.
// QR decoding is exact (the payload is either there or it isn't), so it
// acts on the first hit; OCR is inherently noisier (misreads, partial
// words), so it requires the SAME finding to persist across two
// consecutive samples (~8s) before it's trusted as real rather than a
// single garbled frame — the "multi-frame analysis" requirement this
// system is built around, not a single weak OCR result deciding anything
// on its own.
export function useClassroomVisionSafety({ stream, enabled, selfName, actorRole, source, onViolation }: UseClassroomVisionSafetyParams): void {
  const onViolationRef = useRef(onViolation);
  useEffect(() => {
    onViolationRef.current = onViolation;
  });

  useEffect(() => {
    if (!enabled || !stream || typeof window === "undefined") return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    void video.play().catch(() => {});

    const canvas = document.createElement("canvas");
    let lastOcrImageData: ImageData | null = null;
    let consecutiveHits = 0;
    let lastCategory: string | null = null;
    let cooldownUntil = 0;
    let cancelled = false;

    const workerPromise = acquireOcrWorker();

    function handleFinding(text: string, sourceIsExact: boolean) {
      const now = Date.now();
      const analysis = analyzeCommunication(text);
      if (analysis.verdict !== "block" || !analysis.primary) {
        consecutiveHits = 0;
        return;
      }
      if (now < cooldownUntil && lastCategory === analysis.primary.category) return;

      consecutiveHits = lastCategory === analysis.primary.category ? consecutiveHits + 1 : 1;
      lastCategory = analysis.primary.category;
      const trusted = sourceIsExact || consecutiveHits >= 2;
      if (!trusted) return;

      recordViolation(selfName, actorRole, analysis.primary.category, analysis.primary.confidence, source, {
        evidence: text.slice(0, 200),
      });
      onViolationRef.current(
        "This session flagged an attempt to share contact information through video. This has been recorded and may affect your account.",
        analysis.primary.confidence === "high"
      );
      cooldownUntil = now + VIOLATION_COOLDOWN_MS;
      consecutiveHits = 0;
    }

    const timer = window.setInterval(() => {
      if (cancelled) return;
      const ctx = captureFrame(video, canvas);
      if (!ctx) return;

      // QR: cheap, exact — check every sample.
      const qrPayload = decodeQr(ctx, canvas.width, canvas.height);
      if (qrPayload) handleFinding(qrPayload, true);

      // OCR: only when the frame actually changed since the last pass.
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const changed = frameChangedSignificantly(lastOcrImageData, imageData);
      lastOcrImageData = imageData;
      if (!changed) return;

      void (async () => {
        try {
          const worker = await workerPromise;
          if (cancelled) return;
          const text = (await recognizeText(worker, canvas)).trim();
          if (text) handleFinding(text, false);
        } catch {
          // A stalled OCR pass (worker still initializing, decode hiccup)
          // must never crash or freeze the live classroom over it.
        }
      })();
    }, SAMPLE_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      video.pause();
      video.srcObject = null;
      releaseOcrWorker();
    };
  }, [enabled, stream, selfName, actorRole, source]);
}
