// Enseña's File Safety pipeline — the file-upload counterpart to
// communication-safety.ts. Models the real pipeline shape (allowlist ->
// filename content check -> deep scan -> approve/block) so the UI and data
// flow are genuine, not a mockup.
//
// HONEST LIMITATION, stated plainly rather than faked: this app has no
// server, no file storage service, and no malware-scanning or OCR
// infrastructure (see communication-safety.ts's architectural note — same
// constraint applies here). `simulateDeepScan()` below is exactly what its
// name says: a fixed-delay placeholder standing in for the real malware
// scan / OCR-on-images / QR-decode / embedded-link-extraction steps a
// production build would run server-side. The two checks that DO run for
// real are the file-type allowlist and the filename content scan (reusing
// the same communication-safety engine messages use) — a renamed file
// still can't smuggle "ContactMe_08012345678.pdf" past this.
import { type ActorRole, type ModerationChannel, recordViolation } from "@/lib/moderation-store";
import { analyzeCommunication } from "@/lib/communication-safety";

export type FileScanStatus = "uploading" | "scanning" | "approved" | "blocked";

export interface FileCheckResult {
  ok: boolean;
  reason?: string;
}

// A deliberately narrow allowlist per "limit uploads to business-required
// types" — archives (.zip/.rar) and executables are never accepted here.
export const ALLOWED_FILE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "doc", "docx"];

export function checkFileTypeAllowed(fileName: string): FileCheckResult {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `That file type isn't allowed. Accepted types: ${ALLOWED_FILE_EXTENSIONS.map((e) => `.${e}`).join(", ")}.` };
  }
  return { ok: true };
}

// Catches "ContactMe_08012345678.pdf" / "MyWhatsApp.png" style filenames —
// punctuation is normalized to spaces first so the same detectors that
// scan message text also work on filenames.
function checkFileNameContent(fileName: string, actorName: string, actorRole: ActorRole): FileCheckResult {
  const nameAsText = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[._-]+/g, " ");
  const analysis = analyzeCommunication(nameAsText);
  if (analysis.verdict === "block" && analysis.primary) {
    recordViolation(actorName, actorRole, analysis.primary.category, analysis.primary.confidence, "File" satisfies ModerationChannel, { evidence: fileName });
    return { ok: false, reason: "This file's name contains information that can't be shared through Enseña." };
  }
  return { ok: true };
}

// SIMULATED — see module comment. Always resolves "approved" after a short
// delay once the two real checks above have already passed; the delay
// exists purely so the UI's "Scanning…" state is genuinely observable
// rather than an instant no-op.
export function simulateDeepScan(): Promise<FileCheckResult> {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 900));
}

export interface FileUploadOutcome {
  status: FileScanStatus;
  reason?: string;
}

export async function analyzeFileUpload(fileName: string, actorName: string, actorRole: ActorRole): Promise<FileUploadOutcome> {
  const typeCheck = checkFileTypeAllowed(fileName);
  if (!typeCheck.ok) return { status: "blocked", reason: typeCheck.reason };

  const nameCheck = checkFileNameContent(fileName, actorName, actorRole);
  if (!nameCheck.ok) return { status: "blocked", reason: nameCheck.reason };

  const deepScan = await simulateDeepScan();
  if (!deepScan.ok) return { status: "blocked", reason: deepScan.reason };

  return { status: "approved" };
}
