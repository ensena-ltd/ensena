"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type QuestionCardType = "short-answer" | "long-answer" | "multiple-choice" | "true-false" | "numeric";

interface QuestionCardItem {
  id: string;
  type: QuestionCardType;
  text: string;
  options: string[];
  correctIndex: number;
  correctBoolean: boolean;
  correctNumber: number;
  explanation: string;
}

interface QuestionCardResponse {
  value: string | number | boolean;
}

interface QuestionCardsState {
  title: string;
  questions: QuestionCardItem[];
  launched: boolean;
  /** The tutor moves the whole class through the set together — see the spec's own "Question 1 of 5 → tutor advances to Question 2" flow. */
  currentIndex: number;
  /** Each student's own answers, keyed by their real display name then by question id — never overwritten by another student's. */
  responses: Record<string, Record<string, QuestionCardResponse>>;
}

function isQuestionCardsState(s: Record<string, unknown>): s is QuestionCardsState & Record<string, unknown> {
  return typeof s.title === "string" && Array.isArray(s.questions);
}

const TYPE_LABELS: Record<QuestionCardType, string> = { "short-answer": "Short Answer", "long-answer": "Long Answer", "multiple-choice": "Multiple Choice", "true-false": "True / False", numeric: "Numeric" };

function newQuestion(): QuestionCardItem {
  return { id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "short-answer", text: "New question", options: ["Option A", "Option B"], correctIndex: 0, correctBoolean: true, correctNumber: 0, explanation: "" };
}

function defaultSet(): QuestionCardsState {
  return { title: "Question Set", questions: [{ ...newQuestion(), text: "What did you learn today?" }], launched: false, currentIndex: 0, responses: {} };
}

// A real question-card SET (not a single question) — the tutor builds a
// collection with real per-question types, then walks the whole class
// through them together, one at a time ("Question 1 of 5" → tutor advances
// to Question 2). Each student's own answer lands under their own name in
// the shared `responses` map, never overwriting a classmate's. Shared by
// both the Math/Activities "Question Cards" and the Language "Question
// Cards" registry entries.
export function QuestionCardToolBody({
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
  const state: QuestionCardsState = isQuestionCardsState(rawState) ? (rawState as unknown as QuestionCardsState) : defaultSet();
  const [expandedId, setExpandedId] = useState<string | null>(state.questions[0]?.id ?? null);

  function updateQuestion(id: string, patch: Partial<QuestionCardItem>) {
    onChange({ ...state, questions: state.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }
  function addQuestion() {
    const q = newQuestion();
    onChange({ ...state, questions: [...state.questions, q] });
    setExpandedId(q.id);
  }
  function duplicateQuestion(id: string) {
    const source = state.questions.find((q) => q.id === id);
    if (!source) return;
    const copy = { ...source, id: `qc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    const index = state.questions.findIndex((q) => q.id === id);
    onChange({ ...state, questions: [...state.questions.slice(0, index + 1), copy, ...state.questions.slice(index + 1)] });
  }
  function removeQuestion(id: string) {
    onChange({ ...state, questions: state.questions.filter((q) => q.id !== id) });
  }
  function moveQuestion(id: string, delta: number) {
    const index = state.questions.findIndex((q) => q.id === id);
    const target = index + delta;
    if (target < 0 || target >= state.questions.length) return;
    const questions = [...state.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    onChange({ ...state, questions });
  }
  function launch() {
    onChange({ ...state, launched: true, currentIndex: 0, responses: {} });
  }
  function reset() {
    onChange({ ...state, launched: false, currentIndex: 0, responses: {} });
  }
  function advance(delta: number) {
    const next = Math.min(state.questions.length - 1, Math.max(0, state.currentIndex + delta));
    onChange({ ...state, currentIndex: next });
  }

  if (isHost) {
    const currentQuestion = state.questions[state.currentIndex];
    const answersForCurrent = currentQuestion ? Object.entries(state.responses).map(([name, byQ]) => [name, byQ[currentQuestion.id]] as const).filter(([, r]) => r) : [];

    return (
      <div className="flex h-full flex-col gap-2 overflow-y-auto p-2.5">
        <input value={state.title} onChange={(e) => onChange({ ...state, title: e.target.value })} className="h-8 rounded-lg border border-ensena-border px-2 text-sm font-semibold outline-none focus:border-ensena-primary" />

        {!state.launched ? (
          <>
            <div className="flex flex-col gap-1.5">
              {state.questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-ensena-border">
                  <button type="button" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)} className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-left">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ensena-ink">
                      {i + 1}. {q.text}
                    </span>
                    {expandedId === q.id ? <ChevronUp className="size-3.5 shrink-0 text-ensena-muted" /> : <ChevronDown className="size-3.5 shrink-0 text-ensena-muted" />}
                  </button>
                  {expandedId === q.id && (
                    <div className="flex flex-col gap-1.5 border-t border-ensena-border p-2">
                      <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionCardType })} className="h-7 rounded border border-ensena-border px-1 text-[11px] outline-none">
                        {(Object.keys(TYPE_LABELS) as QuestionCardType[]).map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <textarea value={q.text} onChange={(e) => updateQuestion(q.id, { text: e.target.value })} rows={2} className="resize-none rounded border border-ensena-border p-1.5 text-xs outline-none focus:border-ensena-primary" />

                      {q.type === "multiple-choice" && (
                        <div className="flex flex-col gap-1">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateQuestion(q.id, { correctIndex: oi })}
                                className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", oi === q.correctIndex ? "border-emerald-500 bg-emerald-500 text-white" : "border-ensena-border text-transparent")}
                              >
                                <Check className="size-3" />
                              </button>
                              <input
                                value={opt}
                                onChange={(e) => updateQuestion(q.id, { options: q.options.map((o, idx) => (idx === oi ? e.target.value : o)) })}
                                className="h-7 min-w-0 flex-1 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
                              />
                              <button type="button" onClick={() => updateQuestion(q.id, { options: q.options.filter((_, idx) => idx !== oi) })} className="flex size-5 shrink-0 items-center justify-center text-ensena-muted hover:text-rose-500">
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id, { options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`] })}
                            className="flex h-6 items-center justify-center gap-1 rounded border border-dashed border-ensena-border text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft"
                          >
                            <Plus className="size-3" /> Add option
                          </button>
                        </div>
                      )}
                      {q.type === "true-false" && (
                        <div className="flex gap-1">
                          {[true, false].map((v) => (
                            <button
                              key={String(v)}
                              type="button"
                              onClick={() => updateQuestion(q.id, { correctBoolean: v })}
                              className={cn("h-7 flex-1 rounded border text-[11px] font-medium", q.correctBoolean === v ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-ensena-border text-ensena-ink")}
                            >
                              {v ? "True" : "False"}
                            </button>
                          ))}
                        </div>
                      )}
                      {q.type === "numeric" && (
                        <input
                          type="number"
                          value={q.correctNumber}
                          onChange={(e) => updateQuestion(q.id, { correctNumber: Number(e.target.value) || 0 })}
                          placeholder="Correct number (optional)"
                          className="h-7 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
                        />
                      )}
                      <input
                        value={q.explanation}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Explanation (optional, shown after answering)"
                        className="h-7 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
                      />

                      <div className="flex items-center justify-end gap-1 border-t border-ensena-border pt-1.5">
                        <button type="button" onClick={() => moveQuestion(q.id, -1)} disabled={i === 0} className="flex size-6 items-center justify-center rounded text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-30">
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestion(q.id, 1)}
                          disabled={i === state.questions.length - 1}
                          className="flex size-6 items-center justify-center rounded text-ensena-muted hover:bg-ensena-bg-soft disabled:opacity-30"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => duplicateQuestion(q.id)} className="flex h-6 items-center rounded px-1.5 text-[10px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
                          Duplicate
                        </button>
                        <button type="button" onClick={() => removeQuestion(q.id)} className="flex size-6 items-center justify-center rounded text-rose-500 hover:bg-rose-50">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addQuestion} className="flex h-7 items-center justify-center gap-1 rounded-lg border border-dashed border-ensena-border text-[11px] font-medium text-ensena-muted hover:bg-ensena-bg-soft">
                <Plus className="size-3.5" /> Add question
              </button>
            </div>
            <button type="button" onClick={launch} disabled={state.questions.length === 0} className="h-8 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
              Launch Activity
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2 py-1.5 text-xs">
              <button type="button" onClick={() => advance(-1)} disabled={state.currentIndex === 0} className="text-ensena-primary disabled:opacity-30">
                ← Prev
              </button>
              <span className="font-semibold text-ensena-ink">
                Question {state.currentIndex + 1} of {state.questions.length}
              </span>
              <button type="button" onClick={() => advance(1)} disabled={state.currentIndex === state.questions.length - 1} className="text-ensena-primary disabled:opacity-30">
                Next →
              </button>
            </div>
            <p className="text-xs font-medium text-ensena-ink">{currentQuestion?.text}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Answers ({answersForCurrent.length})</p>
              <button type="button" onClick={reset} className="flex items-center gap-1 text-[10px] font-semibold text-ensena-primary">
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {answersForCurrent.length === 0 && <p className="text-[11px] text-ensena-muted">No answers yet for this question.</p>}
              {answersForCurrent.map(([name, r]) => (
                <div key={name} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-[11px]">
                  <span className="font-medium text-ensena-ink">{name}</span>
                  <span className="text-ensena-muted">{String(r.value)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Student view.
  if (!state.launched) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="text-xs text-ensena-muted">Waiting for your tutor to launch &quot;{state.title}&quot;…</p>
      </div>
    );
  }

  const question = state.questions[state.currentIndex];
  const myAnswers = state.responses[selfName] ?? {};
  const myAnswer = question ? myAnswers[question.id] : undefined;

  function submit(value: string | number | boolean) {
    if (!canEdit || !question) return;
    onChange({ ...state, responses: { ...state.responses, [selfName]: { ...myAnswers, [question.id]: { value } } } });
  }

  if (!question) return null;

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <p className="text-[10px] text-ensena-muted">
        Question {state.currentIndex + 1} of {state.questions.length}
      </p>
      <p className="text-sm font-semibold text-ensena-ink">{question.text}</p>

      {question.type === "multiple-choice" && (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              disabled={!canEdit || myAnswer !== undefined}
              onClick={() => submit(i)}
              className={cn("rounded-lg border px-3 py-2 text-left text-xs font-medium", myAnswer?.value === i ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {question.type === "true-false" && (
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              disabled={!canEdit || myAnswer !== undefined}
              onClick={() => submit(v)}
              className={cn("h-9 flex-1 rounded-lg border text-xs font-semibold", myAnswer?.value === v ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink")}
            >
              {v ? "True" : "False"}
            </button>
          ))}
        </div>
      )}
      {(question.type === "short-answer" || question.type === "long-answer" || question.type === "numeric") && (
        <FreeTextInput type={question.type} disabled={!canEdit || myAnswer !== undefined} onSubmit={submit} />
      )}

      {myAnswer !== undefined && (
        <div className="rounded-lg bg-ensena-bg-soft p-2 text-[11px]">
          <p className="font-medium text-ensena-ink">You answered: {String(myAnswer.value)}</p>
          {question.explanation && <p className="mt-1 text-ensena-muted">{question.explanation}</p>}
        </div>
      )}
    </div>
  );
}

function FreeTextInput({ type, disabled, onSubmit }: { type: "short-answer" | "long-answer" | "numeric"; disabled: boolean; onSubmit: (value: string | number) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-col gap-1.5">
      {type === "long-answer" ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} disabled={disabled} rows={3} placeholder="Your answer" className="resize-none rounded-lg border border-ensena-border p-2 text-xs outline-none focus:border-ensena-primary disabled:opacity-60" />
      ) : (
        <input
          type={type === "numeric" ? "number" : "text"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          placeholder="Your answer"
          className="h-8 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary disabled:opacity-60"
        />
      )}
      <button
        type="button"
        disabled={disabled || !draft.trim()}
        onClick={() => onSubmit(type === "numeric" ? Number(draft) : draft)}
        className="h-8 rounded-lg bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
