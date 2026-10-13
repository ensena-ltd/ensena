// Real recording METADATA infrastructure — localStorage-backed, same idiom
// as every other store in this app. This intentionally does NOT capture any
// video/audio itself: there is no MediaRecorder wiring in the classroom
// today (confirmed by inspection — classroom-client.tsx's "recording"
// toggle is a decorative boolean with no getUserMedia/MediaRecorder behind
// it, and no storage provider is configured for media blobs). Building a
// real capture pipeline means touching the live classroom's WebRTC/media
// code, which is out of scope for this pass and risky to bolt on lightly.
//
// What this store DOES give: the real, queryable schema a future capture
// pipeline would write into (recording-status/segments/retention), so the
// admin evidence UI can ask "is there a recording for this session?" through
// one real function — getRecordingForClassroom() — that honestly returns
// null for every lesson today, rather than a hardcoded `recordingAvailable`
// boolean on static seed data pretending a video exists. When real capture
// ships, it only needs to call recordingStarted/recordingSegmentReady/
// recordingFailed below; nothing in the admin UI needs to change.
export type RecordingStatus = "pending" | "recording" | "processing" | "ready" | "failed" | "deleted";

export interface RecordingSegment {
  id: string;
  startedAtISO: string;
  endedAtISO?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  // Opaque reference into wherever the file actually lives (never a public
  // URL — see the module doc comment: access must be brokered, not linked
  // directly, once a real storage provider exists).
  storageKey?: string;
}

export interface LessonRecording {
  classroomId: string;
  status: RecordingStatus;
  segments: RecordingSegment[];
  retentionDays: number;
  // Set true the moment a dispute opens on this lesson (see escrow-store.ts)
  // — a recording flagged this way must never be auto-deleted by retention
  // cleanup regardless of age, per "preserve evidence until the dispute is
  // resolved."
  preserveForDispute: boolean;
  failureReason?: string;
}

const RECORDINGS_KEY = "ensena_lesson_recordings";
export const RECORDING_EVENT = "ensena:recording-changed";

// No admin config UI exists yet for this — a sensible platform default,
// changeable in one place once that config surface is built.
export const DEFAULT_RETENTION_DAYS = 90;

function makeCachedReader<T>(key: string, seed: T) {
  let cachedRaw: string | null = null;
  let cachedParsed: T = seed;
  return (): T => {
    if (typeof window === "undefined") return seed;
    const raw = window.localStorage.getItem(key);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedParsed = raw ? (JSON.parse(raw) as T) : seed;
    }
    return cachedParsed;
  };
}

const EMPTY: LessonRecording[] = [];
const readRaw = makeCachedReader<LessonRecording[]>(RECORDINGS_KEY, EMPTY);

function writeJson(value: LessonRecording[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECORDINGS_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(RECORDING_EVENT));
}

export function getRecordingForClassroom(classroomId: string): LessonRecording | null {
  return readRaw().find((r) => r.classroomId === classroomId) ?? null;
}

export function markPreservedForDispute(classroomId: string): void {
  const all = readRaw();
  const existing = all.find((r) => r.classroomId === classroomId);
  if (!existing) return; // nothing to preserve if no recording was ever started
  writeJson(all.map((r) => (r.classroomId === classroomId ? { ...r, preserveForDispute: true } : r)));
}

export function subscribeRecordings(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(RECORDING_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(RECORDING_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
