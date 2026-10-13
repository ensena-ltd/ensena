"use client";

import { useMemo, useRef, useState } from "react";
import { Eye, FileText, Film, Presentation, Trash2, Upload, Users } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { initialResourceFiles, resourceFolders, type ResourceFile } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const typeIcons: Record<ResourceFile["type"], typeof FileText> = {
  PDF: FileText,
  Video: Film,
  Slides: Presentation,
  Doc: FileText,
};

export function ResourcesClient() {
  const [files, setFiles] = useState<ResourceFile[]>(initialResourceFiles);
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [previewing, setPreviewing] = useState<ResourceFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => (activeFolder === "All" ? files : files.filter((f) => f.folder === activeFolder)),
    [files, activeFolder]
  );

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = file.size / 1024;
    const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
    const type: ResourceFile["type"] = file.name.endsWith(".pdf")
      ? "PDF"
      : file.name.match(/\.(mp4|mov)$/i)
        ? "Video"
        : file.name.match(/\.(ppt|pptx)$/i)
          ? "Slides"
          : "Doc";
    setFiles((prev) => [
      { id: `res-${Date.now()}`, name: file.name, folder: activeFolder === "All" ? resourceFolders[0] : activeFolder, type, size, sharedWithStudents: false },
      ...prev,
    ]);
    e.target.value = "";
  }

  function toggleShare(id: string) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, sharedWithStudents: !f.sharedWithStudents } : f)));
  }

  function remove(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Resources</h1>
          <p className="mt-1 text-sm text-ensena-muted">Upload and organize teaching materials for your students.</p>
        </div>
        <div>
          <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white"
          >
            <Upload className="size-4" /> Upload File
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {["All", ...resourceFolders].map((folder) => (
          <button
            key={folder}
            type="button"
            onClick={() => setActiveFolder(folder)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium",
              activeFolder === folder ? "bg-ensena-cta-from/10 text-ensena-cta-to" : "bg-ensena-surface text-ensena-muted hover:bg-ensena-bg-soft border border-ensena-border"
            )}
          >
            {folder}
            {folder !== "All" && (
              <span className="ml-1.5 text-xs text-ensena-muted">{files.filter((f) => f.folder === folder).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <ul className="flex flex-col gap-2.5">
          {filtered.map((f) => {
            const Icon = typeIcons[f.type];
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ensena-border p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ensena-bg-soft text-ensena-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ensena-ink">{f.name}</p>
                    <p className="text-xs text-ensena-muted">{f.folder} · {f.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleShare(f.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      f.sharedWithStudents ? "border-ensena-success text-ensena-success" : "border-ensena-border text-ensena-muted"
                    )}
                  >
                    <Users className="size-3.5" /> {f.sharedWithStudents ? "Shared" : "Private"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Preview ${f.name}`}
                    onClick={() => setPreviewing(f)}
                    className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                  >
                    <Eye className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${f.name}`}
                    onClick={() => remove(f.id)}
                    className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No files in this folder yet.</p>}
      </div>

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="File Preview">
        {previewing && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-ensena-bg-soft text-ensena-primary">
              <FileText className="size-6" />
            </span>
            <p className="font-medium text-ensena-ink">{previewing.name}</p>
            <p className="text-xs text-ensena-muted">{previewing.folder} · {previewing.size}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
