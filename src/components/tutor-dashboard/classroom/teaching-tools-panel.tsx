"use client";

import { useRef, useState } from "react";
import { FileText, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToolTab = "equations" | "graph" | "calculator" | "code" | "scratchpad" | "documents";

const toolTabs: ToolTab[] = ["calculator", "equations", "graph", "code", "scratchpad", "documents"];

export function TeachingToolsPanel({ onClose, hideHeader = false }: { onClose: () => void; hideHeader?: boolean }) {
  const [toolTab, setToolTab] = useState<ToolTab>("calculator");
  const [calcInput, setCalcInput] = useState("");
  const [calcResult, setCalcResult] = useState("");
  const [scratchpad, setScratchpad] = useState("");
  const [codeContent, setCodeContent] = useState("// Write code here\n");
  const [equation, setEquation] = useState("");
  const [documents, setDocuments] = useState<string[]>(["Week 3 Lesson Slides.pdf", "Practice Worksheet.pdf"]);
  const documentInputRef = useRef<HTMLInputElement>(null);
  function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setDocuments((prev) => [...prev, file.name]);
  }

  function evaluateCalc() {
    try {
      const result = Function(`"use strict"; return (${calcInput || "0"})`)();
      setCalcResult(String(result));
    } catch {
      setCalcResult("Error");
    }
  }

  return (
    <>
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-ensena-border p-3">
          <p className="text-sm font-semibold text-ensena-ink">Teaching Tools</p>
          <button type="button" onClick={onClose} aria-label="Close panel"><X className="size-4" /></button>
        </div>
      )}
      <div className="flex gap-1 overflow-x-auto border-b border-ensena-border p-2 text-xs">
        {toolTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setToolTab(t)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 font-medium capitalize",
              toolTab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {toolTab === "calculator" && (
          <div>
            <input
              value={calcInput}
              onChange={(e) => setCalcInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && evaluateCalc()}
              placeholder="e.g. (12 * 4) / 2"
              className="h-10 w-full rounded-lg border border-ensena-border px-3 text-sm"
            />
            <button type="button" onClick={evaluateCalc} className="mt-2 h-9 w-full rounded-full bg-ensena-primary text-xs font-semibold text-white">
              Calculate
            </button>
            {calcResult && <p className="mt-2 text-lg font-semibold text-ensena-ink">= {calcResult}</p>}
          </div>
        )}
        {toolTab === "equations" && (
          <div>
            <textarea
              value={equation}
              onChange={(e) => setEquation(e.target.value)}
              rows={3}
              placeholder="Type an equation, e.g. x^2 + 5x + 6 = 0"
              className="w-full rounded-lg border border-ensena-border p-2.5 font-mono text-sm"
            />
            <p className="mt-2 text-xs text-ensena-muted">Rendered equation preview:</p>
            <p className="mt-1 rounded-lg bg-ensena-bg-soft p-3 font-mono text-sm">{equation || "No equation yet"}</p>
          </div>
        )}
        {toolTab === "graph" && (
          <div>
            <p className="text-xs text-ensena-muted">Quick function plot (e.g. y = x²)</p>
            <svg viewBox="0 0 200 120" className="mt-2 w-full rounded-lg border border-ensena-border bg-ensena-surface">
              <line x1="0" y1="60" x2="200" y2="60" stroke="#E5E7EB" />
              <line x1="100" y1="0" x2="100" y2="120" stroke="#E5E7EB" />
              <polyline
                points={Array.from({ length: 41 }, (_, i) => {
                  const x = i - 20;
                  const y = x * x * 0.15;
                  return `${100 + x * 5},${60 - y}`;
                }).join(" ")}
                fill="none"
                stroke="#6C63FF"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}
        {toolTab === "code" && (
          <textarea
            value={codeContent}
            onChange={(e) => setCodeContent(e.target.value)}
            rows={12}
            className="w-full rounded-lg border border-ensena-border bg-ensena-ink p-3 font-mono text-xs text-white"
            spellCheck={false}
          />
        )}
        {toolTab === "scratchpad" && (
          <textarea
            value={scratchpad}
            onChange={(e) => setScratchpad(e.target.value)}
            rows={12}
            placeholder="Jot down notes here…"
            className="w-full rounded-lg border border-ensena-border p-3 text-sm"
          />
        )}
        {toolTab === "documents" && (
          <div className="flex flex-col gap-2">
            <input ref={documentInputRef} type="file" accept=".pdf,.ppt,.pptx,image/*" onChange={handleDocumentUpload} className="hidden" />
            {documents.map((doc) => (
              <div key={doc} className="flex items-center gap-2 rounded-lg border border-ensena-border p-2.5 text-sm">
                <FileText className="size-4 text-ensena-muted" /> {doc}
              </div>
            ))}
            <button type="button" onClick={() => documentInputRef.current?.click()} className="mt-1 rounded-full border border-dashed border-ensena-border py-2 text-xs font-medium text-ensena-muted">
              + Upload PDF / PPT / Image
            </button>
          </div>
        )}
      </div>
    </>
  );
}
