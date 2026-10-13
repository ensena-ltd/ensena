"use client";

import { useState } from "react";

import { AttachmentValidationError, saveAttachment } from "@/lib/attachment-store";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import type { ActorRole } from "@/lib/moderation-store";

export interface PendingAttachment {
  localId: string;
  file: File;
  status: "uploading" | "uploaded" | "failed";
  attachment?: MessageAttachment;
  error?: string;
}

// Manages the composer's "files picked but not sent yet" state — each file
// is saved to the real attachment-store (IndexedDB) as soon as it's picked
// (not deferred until Send), so the preview's Uploading/Uploaded/Failed
// states reflect a real async operation, and a failed one can be retried
// without re-picking the file.
export function useAttachmentPicker(actorName: string, actorRole: ActorRole) {
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const entries: PendingAttachment[] = list.map((file) => ({
      localId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "uploading",
    }));
    setPending((prev) => [...prev, ...entries]);
    entries.forEach((entry) => upload(entry));
  }

  async function upload(entry: PendingAttachment) {
    try {
      const attachment = await saveAttachment(entry.file, actorName, actorRole);
      setPending((prev) => prev.map((p) => (p.localId === entry.localId ? { ...p, status: "uploaded", attachment } : p)));
    } catch (error) {
      const message = error instanceof AttachmentValidationError ? error.message : "Upload failed. Please try again.";
      setPending((prev) => prev.map((p) => (p.localId === entry.localId ? { ...p, status: "failed", error: message } : p)));
    }
  }

  function retry(localId: string) {
    const entry = pending.find((p) => p.localId === localId);
    if (!entry) return;
    setPending((prev) => prev.map((p) => (p.localId === localId ? { ...p, status: "uploading", error: undefined } : p)));
    upload(entry);
  }

  function removeFile(localId: string) {
    setPending((prev) => prev.filter((p) => p.localId !== localId));
  }

  function clear() {
    setPending([]);
  }

  const isUploading = pending.some((p) => p.status === "uploading");
  const hasFailed = pending.some((p) => p.status === "failed");
  const readyAttachments: MessageAttachment[] = pending.filter((p) => p.status === "uploaded" && p.attachment).map((p) => p.attachment!);

  return { pending, addFiles, retry, removeFile, clear, isUploading, hasFailed, readyAttachments };
}
