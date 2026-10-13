"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

interface CodeFiles {
  html: string;
  css: string;
  js: string;
}

interface CodeSnapshot extends CodeFiles {
  updatedAtISO: string;
}

interface CodingWorkspaceState {
  title: string;
  instructions: string;
  starter: CodeFiles;
  launched: boolean;
  /** Each student's own editable copy, keyed by their real display name. */
  responses: Record<string, CodeSnapshot>;
}

function isCodingWorkspaceState(s: Record<string, unknown>): s is CodingWorkspaceState & Record<string, unknown> {
  return typeof s.starter === "object" && s.starter !== null && typeof s.responses === "object";
}

function defaultState(): CodingWorkspaceState {
  return {
    title: "Coding Workspace",
    instructions: "",
    starter: {
      html: "<h1>Hello, world!</h1>\n<button id=\"btn\">Click me</button>",
      css: "h1 {\n  color: #f80248;\n  font-family: sans-serif;\n}",
      js: "document.getElementById('btn').addEventListener('click', () => {\n  alert('Hi!');\n});",
    },
    launched: false,
    responses: {},
  };
}

function buildPreviewDoc(files: CodeFiles): string {
  return `<!doctype html><html><head><meta charset="utf-8" /><style>${files.css}</style></head><body>${files.html}<script>${files.js}<\/script></body></html>`;
}

type Tab = "html" | "css" | "js";
const TABS: { id: Tab; label: string }[] = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JS" },
];

// A live sandboxed HTML/CSS/JS editor — the one language trio that can
// genuinely execute client-side with no backend. The preview iframe uses
// `sandbox="allow-scripts"` with NO `allow-same-origin`, so student code
// runs fully isolated: it cannot reach the parent document, this app's
// localStorage, or anything outside its own throwaway document. Each
// student edits their own copy (seeded from the tutor's starter code once
// the activity is launched); the tutor can browse any student's live copy
// read-only.
function CodeEditor({ files, readOnly, onChange }: { files: CodeFiles; readOnly: boolean; onChange: (files: CodeFiles) => void }) {
  const [tab, setTab] = useState<Tab>("html");
  const [previewDoc, setPreviewDoc] = useState(() => buildPreviewDoc(files));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPreviewDoc(buildPreviewDoc(files)), 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [files]);

  function runNow() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewDoc(buildPreviewDoc(files));
  }

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex min-h-0 flex-1 gap-1.5">
        <div className="flex min-h-0 w-1/2 flex-col gap-1">
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", tab === t.id ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted")}
              >
                {t.label}
              </button>
            ))}
            <button type="button" onClick={runNow} className="ml-auto flex items-center gap-1 rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
              <Play className="size-3" /> Run
            </button>
          </div>
          <textarea
            value={files[tab]}
            readOnly={readOnly}
            onChange={(e) => onChange({ ...files, [tab]: e.target.value })}
            spellCheck={false}
            className="min-h-0 flex-1 resize-none rounded-lg border border-ensena-border bg-[#1e1e1e] p-2 font-mono text-[11px] text-[#d4d4d4] outline-none focus:border-ensena-primary"
          />
        </div>
        <div className="min-h-0 w-1/2 overflow-hidden rounded-lg border border-ensena-border bg-ensena-surface">
          <iframe title="Live preview" sandbox="allow-scripts" srcDoc={previewDoc} className="size-full border-0" />
        </div>
      </div>
    </div>
  );
}

export function CodingWorkspaceToolBody({
  state: rawState,
  isHost,
  canEdit,
  selfName,
  onChange,
}: {
  state: Record<string, unknown>;
  isHost: boolean;
  canEdit: boolean;
  selfName: string;
  onChange: (state: Record<string, unknown>) => void;
}) {
  const state: CodingWorkspaceState = isCodingWorkspaceState(rawState) ? (rawState as unknown as CodingWorkspaceState) : defaultState();
  const [viewingStudent, setViewingStudent] = useState<string | null>(null);
  const studentNames = useMemo(() => Object.keys(state.responses), [state.responses]);
  const myFiles = state.responses[selfName]?.html !== undefined ? state.responses[selfName] : null;

  useEffect(() => {
    if (isHost || !state.launched || myFiles) return;
    onChange({ ...state, responses: { ...state.responses, [selfName]: { ...state.starter, updatedAtISO: new Date().toISOString() } } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, state.launched, myFiles, selfName]);

  if (isHost) {
    const viewed = viewingStudent ? state.responses[viewingStudent] : null;
    return (
      <div className="flex h-full flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <input
            value={state.title}
            onChange={(e) => onChange({ ...state, title: e.target.value })}
            className="h-7 min-w-0 flex-1 rounded-lg border border-ensena-border px-2 text-xs font-semibold outline-none focus:border-ensena-primary"
          />
          <button
            type="button"
            onClick={() => onChange({ ...state, launched: !state.launched })}
            className={cn("h-7 shrink-0 rounded-full px-3 text-[11px] font-semibold", state.launched ? "bg-emerald-100 text-emerald-700" : "bg-ensena-primary text-white")}
          >
            {state.launched ? "Launched" : "Launch"}
          </button>
        </div>
        <textarea
          value={state.instructions}
          onChange={(e) => onChange({ ...state, instructions: e.target.value })}
          placeholder="Instructions for students…"
          className="h-12 resize-none rounded-lg border border-ensena-border p-1.5 text-[11px] outline-none focus:border-ensena-primary"
        />
        {studentNames.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-ensena-muted">Viewing:</span>
            <select
              value={viewingStudent ?? ""}
              onChange={(e) => setViewingStudent(e.target.value || null)}
              className="h-6 rounded border border-ensena-border px-1 text-[11px] outline-none"
            >
              <option value="">My starter code</option>
              {studentNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {viewed ? (
            <CodeEditor files={viewed} readOnly onChange={() => {}} />
          ) : (
            <CodeEditor files={state.starter} readOnly={false} onChange={(files) => onChange({ ...state, starter: files })} />
          )}
        </div>
      </div>
    );
  }

  if (!state.launched) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-xs text-ensena-muted">
        Waiting for your tutor to launch the coding activity…
      </div>
    );
  }

  const files = myFiles ?? state.starter;

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ensena-ink">{state.title}</p>
        <button
          type="button"
          onClick={() => onChange({ ...state, responses: { ...state.responses, [selfName]: { ...state.starter, updatedAtISO: new Date().toISOString() } } })}
          className="flex shrink-0 items-center gap-1 rounded-full border border-ensena-border px-2 py-0.5 text-[10px] font-semibold text-ensena-muted hover:bg-ensena-bg-soft"
        >
          <RotateCcw className="size-3" /> Reset
        </button>
      </div>
      {state.instructions && <p className="rounded-lg bg-ensena-bg-soft p-1.5 text-[11px] text-ensena-ink">{state.instructions}</p>}
      <div className="min-h-0 flex-1">
        <CodeEditor
          files={files}
          readOnly={!canEdit}
          onChange={(next) => onChange({ ...state, responses: { ...state.responses, [selfName]: { ...next, updatedAtISO: new Date().toISOString() } } })}
        />
      </div>
    </div>
  );
}
