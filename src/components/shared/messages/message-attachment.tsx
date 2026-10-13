"use client";

import { useEffect, useState } from "react";
import { Eye, FileText, Film, Music } from "lucide-react";

import { DocumentViewer, type ViewableDocument } from "@/components/shared/document-viewer";
import { getAttachmentBlob } from "@/lib/attachment-store";
import { formatFileSize } from "@/lib/attachment-store";
import type { MessageAttachment } from "@/lib/message-attachment-types";

// Renders one already-sent attachment inside a message bubble. Images show
// inline as a thumbnail; everything else is a filename/size card. Clicking
// either opens the shared DocumentViewer (pictures, PDFs, documents, video,
// audio — with download there) using the real blob read back from
// IndexedDB.
export function MessageAttachmentView({ attachment }: { attachment: MessageAttachment }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [viewing, setViewing] = useState<ViewableDocument | null>(null);
  const isImage = attachment.mimeType.startsWith("image/");
  const Icon = attachment.mimeType.startsWith("video/") ? Film : attachment.mimeType.startsWith("audio/") ? Music : FileText;

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    getAttachmentBlob(attachment.id).then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setObjectUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.id]);

  function open() {
    if (objectUrl) setViewing({ url: objectUrl, fileName: attachment.name, mimeType: attachment.mimeType });
  }

  const viewer = <DocumentViewer doc={viewing} onClose={() => setViewing(null)} />;

  if (isImage) {
    return (
      <>
        {objectUrl ? (
          <button type="button" onClick={open} aria-label={`Open ${attachment.name}`} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element -- a locally-generated blob: URL, not a static asset next/image can optimize */}
            <img src={objectUrl} alt={attachment.name} className="max-h-48 w-auto rounded-xl object-cover hover:opacity-90" />
          </button>
        ) : (
          <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-ensena-bg-soft text-xs text-ensena-muted">Loading…</div>
        )}
        {viewer}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={!objectUrl}
        className="flex items-center gap-2 rounded-xl border border-ensena-border bg-ensena-surface px-3 py-2 text-left text-xs hover:bg-ensena-bg-soft disabled:opacity-60"
      >
        <Icon className="size-4 shrink-0 text-ensena-primary" />
        <span className="min-w-0">
          <span className="block max-w-[10rem] truncate font-medium text-ensena-ink">{attachment.name}</span>
          <span className="text-[10px] text-ensena-muted">{formatFileSize(attachment.size)}</span>
        </span>
        <Eye className="size-3.5 shrink-0 text-ensena-muted" />
      </button>
      {viewer}
    </>
  );
}
