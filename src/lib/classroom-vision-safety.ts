"use client";

// Real camera/screen-share contact-sharing detection for the live
// classroom — QR decoding (jsQR) and OCR (tesseract.js), both running
// entirely client-side (this app has no server to do it for us). Reuses
// the exact same analyzeCommunication() engine every other surface
// (messages, classroom chat, whiteboard text, file names) already goes
// through — this module's job is only "turn a video frame into text/QR
// payload", not a second, parallel detection ruleset.
//
// PERFORMANCE, stated plainly per the platform's own explicit requirement:
// this must never run on every frame. Sampling is throttled to a fixed
// interval (see use-classroom-vision-safety.ts's SAMPLE_INTERVAL_MS), QR
// decoding (cheap, <5ms on a small frame) runs on every sample, and OCR
// (expensive, tens to hundreds of ms) only runs when the frame changed
// meaningfully since the last OCR pass — the overwhelming common case
// (someone just talking, nothing new held up) never invokes it at all.
import jsQR from "jsqr";
import { createWorker, type Worker } from "tesseract.js";

// One shared OCR worker across every camera/screen source active in a
// classroom at once (a private lesson has at most 2; a group class more,
// but they'd still rather share the one engine than each pay tesseract's
// real startup cost — downloading its WASM engine + language data — on
// their own). Refcounted so it's only ever spun up once something needs it
// and torn down once nothing does.
let sharedWorkerPromise: Promise<Worker> | null = null;
let refCount = 0;

export function acquireOcrWorker(): Promise<Worker> {
  refCount += 1;
  if (!sharedWorkerPromise) {
    sharedWorkerPromise = createWorker("eng");
  }
  return sharedWorkerPromise;
}

export function releaseOcrWorker(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && sharedWorkerPromise) {
    const pending = sharedWorkerPromise;
    sharedWorkerPromise = null;
    void pending.then((worker) => worker.terminate()).catch(() => {});
  }
}

// Downscaled capture — OCR/QR accuracy doesn't need full camera
// resolution, and a smaller canvas is what keeps this affordable to run
// every few seconds without competing with the live call for CPU/battery.
const CAPTURE_MAX_WIDTH = 480;

export function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, CAPTURE_MAX_WIDTH / video.videoWidth);
  canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return ctx;
}

export function decodeQr(ctx: CanvasRenderingContext2D, width: number, height: number): string | null {
  const imageData = ctx.getImageData(0, 0, width, height);
  const result = jsQR(imageData.data, imageData.width, imageData.height);
  return result?.data ?? null;
}

// A cheap, sparse-grid pixel comparison — good enough to tell "this frame
// is meaningfully different from the last one we ran OCR against" without
// hashing every pixel. This, not a timer alone, is what skips OCR on a
// static frame (someone just sitting there talking).
const SAMPLE_STRIDE = 67; // an odd, non-round stride so it doesn't keep sampling the same aligned pixels as the video's own frame rate/motion pattern
const CHANGE_THRESHOLD = 0.06;

export function frameChangedSignificantly(previous: ImageData | null, next: ImageData): boolean {
  if (!previous || previous.width !== next.width || previous.height !== next.height) return true;
  let changed = 0;
  let samples = 0;
  for (let i = 0; i < next.data.length; i += SAMPLE_STRIDE * 4) {
    samples += 1;
    if (Math.abs(previous.data[i] - next.data[i]) > 24) changed += 1;
  }
  return samples === 0 || changed / samples > CHANGE_THRESHOLD;
}

export async function recognizeText(worker: Worker, canvas: HTMLCanvasElement): Promise<string> {
  const { data } = await worker.recognize(canvas);
  return data.text ?? "";
}
