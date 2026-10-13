"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Maximize2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

export interface ViewableDocument {
  url: string;
  fileName: string;
  /** e.g. "Government ID" — shown above the file name. */
  title?: string;
  /** Helps pick the right viewer when the file name has no extension. */
  mimeType?: string;
}

type Kind = "image" | "pdf" | "video" | "audio" | "office" | "text" | "other";

const EXT: Record<Exclude<Kind, "other">, string[]> = {
  image: ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "avif", "ico", "jfif", "pjpeg", "pjp"],
  pdf: ["pdf"],
  video: ["mp4", "webm", "ogv", "mov", "m4v", "mkv", "3gp"],
  audio: ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "weba"],
  office: ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf"],
  text: ["txt", "csv", "tsv", "json", "md", "log", "xml", "yml", "yaml", "html", "htm", "css", "js", "ts"],
};

function kindOf(doc: ViewableDocument): Kind {
  const ext = doc.fileName.split(".").pop()?.toLowerCase() ?? "";
  for (const [kind, list] of Object.entries(EXT) as [Exclude<Kind, "other">, string[]][]) {
    if (list.includes(ext)) return kind;
  }
  const mime = doc.mimeType ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/") || mime === "application/json") return "text";
  if (/officedocument|msword|ms-excel|ms-powerpoint|opendocument/.test(mime)) return "office";
  return "other";
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

function TextPreview({ url, csv }: { url: string; csv: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => !cancelled && setText(t.length > 500_000 ? `${t.slice(0, 500_000)}\n\n… (file truncated for preview)` : t))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) return <p className="p-6 text-sm text-white/80">This file couldn&apos;t be loaded for preview.</p>;
  if (text === null) return <p className="p-6 text-sm text-white/60">Loading…</p>;

  if (csv) {
    const rows = text.trim().split(/\r?\n/).slice(0, 500).map((line) => line.split(line.includes("\t") ? "\t" : ","));
    return (
      <div className="size-full overflow-auto bg-white p-4">
        <table className="min-w-full border-collapse text-xs text-ensena-ink">
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} className={i === 0 ? "bg-ensena-bg-soft font-semibold" : ""}>
                {cells.map((c, j) => (
                  <td key={j} className="border border-ensena-border px-2 py-1 whitespace-nowrap">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return <pre className="size-full overflow-auto bg-white p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ensena-ink">{text}</pre>;
}

// One viewer for every file the app opens: a dark full-screen overlay (like
// the browser's PDF viewer) with the file's title, open-in-new-tab,
// download and close. Pictures get zoom/rotate; PDFs use the browser's own
// PDF viewer; videos/audio get player controls; Word/Excel/PowerPoint use
// Microsoft's online viewer (needs a public/signed https URL — a local
// blob: file falls back to download); text/CSV files render as text/table.
// Esc or clicking the backdrop closes it.
export function DocumentViewer({ doc, onClose }: { doc: ViewableDocument | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [shownUrl, setShownUrl] = useState<string | null>(null);

  // Reset view controls whenever a different file is opened.
  if ((doc?.url ?? null) !== shownUrl) {
    setShownUrl(doc?.url ?? null);
    setZoom(1);
    setRotation(0);
    setLoadFailed(false);
  }

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [doc, onClose]);

  const kind = useMemo(() => (doc ? kindOf(doc) : "other"), [doc]);
  if (!doc) return null;

  const isRemote = /^https?:\/\//i.test(doc.url);
  const ext = doc.fileName.split(".").pop()?.toLowerCase() ?? "";

  const fallback = (message: string) => (
    <div className="flex size-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/80">
      <FileText className="size-10 text-white/50" />
      <p>{message}</p>
      <a href={doc.url} download={doc.fileName} className="rounded-full bg-white px-4 py-2 font-semibold text-ensena-ink">Download file</a>
    </div>
  );

  let body: React.ReactNode;
  if (loadFailed) {
    body = fallback("This file couldn't be previewed in your browser.");
  } else if (kind === "image") {
    body = (
      <div className="flex size-full items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- signed/blob URLs; next/image would need every source host whitelisted */}
        <img
          src={doc.url}
          alt={doc.fileName}
          onError={() => setLoadFailed(true)}
          style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
          className="max-h-full max-w-full rounded-lg object-contain shadow-lg transition-transform duration-150"
        />
      </div>
    );
  } else if (kind === "pdf") {
    body = <iframe src={doc.url} title={doc.fileName} className="size-full border-0" />;
  } else if (kind === "video") {
    body = (
      <div className="flex size-full items-center justify-center bg-black p-2">
        <video src={doc.url} controls autoPlay playsInline onError={() => setLoadFailed(true)} className="max-h-full max-w-full" />
      </div>
    );
  } else if (kind === "audio") {
    body = (
      <div className="flex size-full flex-col items-center justify-center gap-4 p-6 text-white/80">
        <FileText className="size-12 text-white/50" />
        <audio src={doc.url} controls autoPlay onError={() => setLoadFailed(true)} className="w-full max-w-lg" />
      </div>
    );
  } else if (kind === "office") {
    body = isRemote ? (
      <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`} title={doc.fileName} className="size-full border-0 bg-white" />
    ) : (
      fallback("Word, Excel and PowerPoint files can be previewed once they're uploaded. Download it to open it now.")
    );
  } else if (kind === "text") {
    body = <TextPreview url={doc.url} csv={ext === "csv" || ext === "tsv"} />;
  } else {
    body = fallback("This file type can't be previewed here.");
  }

  return (
    <div className="fixed inset-0 z-90 flex flex-col bg-black/70 sm:p-4" role="dialog" aria-modal="true" aria-label={doc.title ?? doc.fileName} onClick={onClose}>
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden bg-[#202124] shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-white">
          <FileText className="size-4 shrink-0 text-white/70" />
          <div className="min-w-0 flex-1">
            {doc.title && <p className="truncate text-xs text-white/60">{doc.title}</p>}
            <p className="truncate text-sm font-semibold">{doc.fileName}</p>
          </div>
          {kind === "image" && !loadFailed && (
            <div className="hidden items-center gap-0.5 border-r border-white/10 pr-2 sm:flex">
              <ToolbarButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))}><ZoomOut className="size-4" /></ToolbarButton>
              <span className="w-12 text-center text-xs tabular-nums text-white/80">{Math.round(zoom * 100)}%</span>
              <ToolbarButton label="Zoom in" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}><ZoomIn className="size-4" /></ToolbarButton>
              <ToolbarButton label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}><RotateCw className="size-4" /></ToolbarButton>
              <ToolbarButton label="Fit to screen" onClick={() => { setZoom(1); setRotation(0); }}><Maximize2 className="size-4" /></ToolbarButton>
            </div>
          )}
          {isRemote && (
            <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab" title="Open in new tab" className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
              <ExternalLink className="size-4" />
            </a>
          )}
          <a href={doc.url} download={doc.fileName} aria-label="Download" title="Download" className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
            <Download className="size-4" />
          </a>
          <ToolbarButton label="Close" onClick={onClose}><X className="size-5" /></ToolbarButton>
        </div>
        <div className="relative min-h-0 flex-1 bg-[#323639]">{body}</div>
      </div>
    </div>
  );
}
