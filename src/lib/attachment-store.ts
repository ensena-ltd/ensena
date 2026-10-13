// Real file persistence for message attachments — IndexedDB, not
// localStorage. Every other store in this app is localStorage-backed, but
// localStorage shares one ~5-10MB per-origin budget across every store this
// entire app uses; embedding raw file bytes there risks blowing that quota
// and corrupting *all* app state, not just messages. IndexedDB has a much
// larger, separate quota and is the honest, safe choice for real file
// bytes in a backend-less browser app. A message record only ever carries
// the lightweight `MessageAttachment` metadata (id/name/mimeType/size)
// referencing a blob stored here.
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import { recordViolation, type ActorRole } from "@/lib/moderation-store";

const DB_NAME = "ensena_attachments";
const STORE_NAME = "files";
const DB_VERSION = 1;

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB per file (room for short videos)

export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Opened in the shared DocumentViewer (video/audio players).
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/ogg",
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open attachment storage."));
  });
}

export class AttachmentValidationError extends Error {}

function validateFile(file: File): void {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentValidationError(`"${file.name}" is too large (max ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB).`);
  }
  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new AttachmentValidationError(`"${file.name}" isn't a supported file type.`);
  }
}

// Catches "ContactMe_08012345678.pdf" / "MyWhatsApp.png" — the same
// filename-content check file-safety.ts already runs for escrow-dispute
// evidence uploads, reused here (rather than a second, disconnected
// implementation) so a message attachment can't smuggle contact
// information past the exact same detector every message's own text goes
// through. There is no real OCR/deep-scan of the file's actual bytes in
// this app (no server, no such infrastructure — see file-safety.ts's own
// module comment); this is the honest, real subset of that check.
function checkFileNameContent(fileName: string, actorName: string, actorRole: ActorRole): void {
  const nameAsText = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[._-]+/g, " ");
  const analysis = analyzeCommunication(nameAsText);
  if (analysis.verdict === "block" && analysis.primary) {
    recordViolation(actorName, actorRole, analysis.primary.category, analysis.primary.confidence, "File", { evidence: fileName });
    throw new AttachmentValidationError(BLOCKED_MESSAGE_COPY);
  }
}

// Real, durable persistence — the returned metadata is what a message
// carries; the actual bytes are only ever read back via getAttachmentBlob.
export async function saveAttachment(file: File, actorName: string, actorRole: ActorRole): Promise<MessageAttachment> {
  validateFile(file);
  checkFileNameContent(file.name, actorName, actorRole);
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ id, blob: file, name: file.name, mimeType: file.type, size: file.size });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save attachment."));
  });
  db.close();
  return { id, name: file.name, mimeType: file.type, size: file.size };
}

export async function getAttachmentBlob(id: string): Promise<Blob | null> {
  const db = await openDb();
  const record = await new Promise<{ blob: Blob } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Failed to read attachment."));
  });
  db.close();
  return record?.blob ?? null;
}

export async function deleteAttachment(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete attachment."));
  });
  db.close();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
