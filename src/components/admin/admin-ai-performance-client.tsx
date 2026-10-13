"use client";

import { useState } from "react";
import { BarChart3, Lightbulb, Send } from "lucide-react";

import { aiInsightCards, answerAdminQuestion, recommendationFeed } from "@/lib/admin-ai-insights";
import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  danger: "border-rose-200 bg-rose-50",
  warning: "border-amber-200 bg-amber-50",
  success: "border-emerald-200 bg-emerald-50",
  info: "border-blue-200 bg-blue-50",
};

const toneText: Record<string, string> = {
  danger: "text-rose-700",
  warning: "text-amber-700",
  success: "text-emerald-700",
  info: "text-blue-700",
};

const suggestedQuestions = [
  "Which tutors are performing best?",
  "Which students are at risk of dropping out?",
  "Which group classes have low attendance?",
  "Which tutors have declining ratings?",
  "What revenue is expected this month?",
  "Which students need counselling?",
  "Suggest tutors to feature on the homepage.",
  "Detect suspicious activity or fake reviews.",
  "Which tutors convert Discovery Sessions into long-term students?",
  "Which subjects convert best from Discovery Sessions?",
  "What's the readiness score for students after their Discovery Session?",
  "Which students are at risk of churn after a Discovery Session?",
];

interface ChatMessage {
  role: "admin" | "ai";
  text: string;
}

export function AdminAiPerformanceClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Hi Cynthia, ask me anything about tutor performance, student activity, group class enrollment, or platform revenue." },
  ]);
  const [input, setInput] = useState("");

  function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question) return;
    const answer = answerAdminQuestion(question);
    setMessages((prev) => [...prev, { role: "admin", text: question }, { role: "ai", text: answer }]);
    setInput("");
  }

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Performance Insights</h1>
        <p className="mt-1 text-sm text-ensena-muted">Platform-wide insights and an assistant to help you run Ensena.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-heading text-base font-semibold text-ensena-ink">Insights</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {aiInsightCards.map((c) => (
              <div key={c.id} className={cn("rounded-2xl border p-4", toneStyles[c.tone])}>
                <p className={cn("text-[11px] font-semibold uppercase tracking-wide", toneText[c.tone])}>{c.category}</p>
                <p className="mt-1 text-sm font-semibold text-ensena-ink">{c.title}</p>
                <p className="mt-1 text-xs text-ensena-muted">{c.detail}</p>
                <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", toneText[c.tone])}>
                  <Lightbulb className="size-3.5" /> {c.action}
                </p>
              </div>
            ))}
          </div>

          <h2 className="mt-6 font-heading text-base font-semibold text-ensena-ink">Recommendations</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {recommendationFeed.map((r) => (
              <li key={r.id} className="flex items-start gap-2.5 rounded-xl border border-ensena-border bg-ensena-surface p-3.5 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-ensena-primary" />
                <p className="text-ensena-ink">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex h-[600px] flex-col rounded-2xl border border-ensena-border bg-ensena-surface">
          <div className="flex items-center gap-2 border-b border-ensena-border p-4">
            <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
              <BarChart3 className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ensena-ink">Ask Ensena</p>
              <p className="text-xs text-ensena-muted">Rule-based assistant over your platform data</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", m.role === "admin" ? "ml-auto bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-ink")}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="border-t border-ensena-border p-3">
            <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
              {suggestedQuestions.map((q) => (
                <button key={q} type="button" onClick={() => send(q)} className="rounded-full border border-ensena-border px-2.5 py-1 text-[11px] text-ensena-muted hover:bg-ensena-bg-soft">
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask a question…"
                className="h-10 flex-1 rounded-full border border-ensena-border px-4 text-sm"
              />
              <button type="button" onClick={() => send()} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
