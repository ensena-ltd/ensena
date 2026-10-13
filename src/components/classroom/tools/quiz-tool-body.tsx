"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";

type QuestionType = "multiple-choice" | "true-false" | "short-answer" | "numeric";

interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  points: number;
  // multiple-choice
  options: string[];
  correctIndex: number;
  // true-false
  correctBoolean: boolean;
  // short-answer
  correctText: string;
  // numeric
  correctNumber: number;
}

interface QuizAnswer {
  value: string | number | boolean;
  correct: boolean;
}

interface QuizSettings {
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  /** "live": the tutor controls which question everyone sees, in lockstep. "self-paced": each student moves through the set on their own. */
  mode: "live" | "self-paced";
}

interface QuizState {
  title: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  launched: boolean;
  /** Only meaningful in "live" mode — the question index every student is currently shown, tutor-controlled. */
  currentQuestionIndex: number;
  /** Each student's own answers, keyed by their real display name then by question id — never overwritten by another student's (per the Ensena Classroom group-permission model). */
  responses: Record<string, Record<string, QuizAnswer>>;
}

function isQuizState(s: Record<string, unknown>): s is QuizState & Record<string, unknown> {
  return typeof s.title === "string" && Array.isArray(s.questions);
}

function newQuestion(): QuizQuestion {
  return { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: "multiple-choice", text: "New question", points: 1, options: ["Option A", "Option B"], correctIndex: 0, correctBoolean: true, correctText: "", correctNumber: 0 };
}

function defaultQuiz(): QuizState {
  return {
    title: "Quick Quiz",
    questions: [{ ...newQuestion(), text: "What is 5 × 7?", type: "numeric", correctNumber: 35 }],
    settings: { shuffleQuestions: false, showCorrectAnswers: true, mode: "self-paced" },
    launched: false,
    currentQuestionIndex: 0,
    responses: {},
  };
}

function isCorrect(q: QuizQuestion, value: string | number | boolean): boolean {
  if (q.type === "multiple-choice") return value === q.correctIndex;
  if (q.type === "true-false") return value === q.correctBoolean;
  if (q.type === "numeric") return Number(value) === q.correctNumber;
  return String(value).trim().toLowerCase() === q.correctText.trim().toLowerCase();
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = { "multiple-choice": "Multiple Choice", "true-false": "True / False", "short-answer": "Short Answer", numeric: "Numeric" };

// A real multi-question quiz — the tutor builds a set of questions (host-
// only authoring, regardless of the current whiteboard permission mode,
// since authoring the activity is board management), launches it, and a
// permitted student answers question-by-question. Each student's own
// answers land under their own name in the shared `responses` map, never
// overwriting a classmate's. Supports both a tutor-paced "Live" mode (one
// synced current question for everyone) and a "Self-paced" mode (each
// student moves through the set independently) — see QuizSettings.
export function QuizToolBody({
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
  const state: QuizState = isQuizState(rawState) ? (rawState as unknown as QuizState) : defaultQuiz();
  const [expandedId, setExpandedId] = useState<string | null>(state.questions[0]?.id ?? null);
  const [myQuestionIndex, setMyQuestionIndex] = useState(0);

  function updateQuestion(id: string, patch: Partial<QuizQuestion>) {
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
    const copy = { ...source, id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
    const index = state.questions.findIndex((q) => q.id === id);
    const questions = [...state.questions.slice(0, index + 1), copy, ...state.questions.slice(index + 1)];
    onChange({ ...state, questions });
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
  function setSettings(patch: Partial<QuizSettings>) {
    onChange({ ...state, settings: { ...state.settings, ...patch } });
  }
  function launch() {
    onChange({ ...state, launched: true, currentQuestionIndex: 0, responses: {} });
  }
  function resetQuiz() {
    onChange({ ...state, launched: false, currentQuestionIndex: 0, responses: {} });
  }
  function advanceLive(delta: number) {
    const next = Math.min(state.questions.length - 1, Math.max(0, state.currentQuestionIndex + delta));
    onChange({ ...state, currentQuestionIndex: next });
  }

  if (isHost) {
    const entries = Object.entries(state.responses);
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
                      <div className="flex items-center gap-1">
                        <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })} className="h-7 rounded border border-ensena-border px-1 text-[11px] outline-none">
                          {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                            <option key={t} value={t}>
                              {QUESTION_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={q.points}
                          onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) || 1 })}
                          className="h-7 w-14 rounded border border-ensena-border px-1 text-[11px] outline-none"
                          aria-label="Points"
                        />
                        <span className="text-[10px] text-ensena-muted">pts</span>
                      </div>
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

                      {q.type === "short-answer" && (
                        <input
                          value={q.correctText}
                          onChange={(e) => updateQuestion(q.id, { correctText: e.target.value })}
                          placeholder="Correct answer (exact match)"
                          className="h-7 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
                        />
                      )}

                      {q.type === "numeric" && (
                        <input
                          type="number"
                          value={q.correctNumber}
                          onChange={(e) => updateQuestion(q.id, { correctNumber: Number(e.target.value) || 0 })}
                          placeholder="Correct number"
                          className="h-7 rounded border border-ensena-border px-1.5 text-[11px] outline-none focus:border-ensena-primary"
                        />
                      )}

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

            <div className="flex flex-col gap-1 border-t border-ensena-border pt-2 text-[11px]">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={state.settings.shuffleQuestions} onChange={(e) => setSettings({ shuffleQuestions: e.target.checked })} className="accent-ensena-primary" /> Shuffle questions
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={state.settings.showCorrectAnswers} onChange={(e) => setSettings({ showCorrectAnswers: e.target.checked })} className="accent-ensena-primary" /> Show correct answers after
                submitting
              </label>
              <div className="flex items-center gap-1.5">
                <span>Mode:</span>
                <button
                  type="button"
                  onClick={() => setSettings({ mode: state.settings.mode === "live" ? "self-paced" : "live" })}
                  className="rounded-full border border-ensena-border px-2 py-0.5 font-semibold text-ensena-ink"
                >
                  {state.settings.mode === "live" ? "Live (tutor-paced)" : "Self-paced"}
                </button>
              </div>
            </div>

            <button type="button" onClick={launch} disabled={state.questions.length === 0} className="h-8 rounded-full bg-ensena-primary text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50">
              Launch Quiz
            </button>
          </>
        ) : (
          <>
            {state.settings.mode === "live" && (
              <div className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2 py-1.5 text-xs">
                <button type="button" onClick={() => advanceLive(-1)} disabled={state.currentQuestionIndex === 0} className="text-ensena-primary disabled:opacity-30">
                  ← Prev
                </button>
                <span className="font-semibold text-ensena-ink">
                  Question {state.currentQuestionIndex + 1} of {state.questions.length}
                </span>
                <button type="button" onClick={() => advanceLive(1)} disabled={state.currentQuestionIndex === state.questions.length - 1} className="text-ensena-primary disabled:opacity-30">
                  Next →
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Results ({entries.length} responded)</p>
              <button type="button" onClick={resetQuiz} className="flex items-center gap-1 text-[10px] font-semibold text-ensena-primary">
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {entries.length === 0 && <p className="text-[11px] text-ensena-muted">No responses yet.</p>}
              {entries.map(([name, answers]) => {
                const answered = Object.keys(answers).length;
                const scored = Object.entries(answers).reduce((sum, [qId, a]) => {
                  const q = state.questions.find((qq) => qq.id === qId);
                  return sum + (a.correct && q ? q.points : 0);
                }, 0);
                const total = state.questions.reduce((sum, q) => sum + q.points, 0);
                return (
                  <div key={name} className="flex items-center justify-between rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-[11px]">
                    <span className="font-medium text-ensena-ink">{name}</span>
                    <span className="text-ensena-muted">
                      {scored}/{total} pts · {answered}/{state.questions.length} answered
                    </span>
                  </div>
                );
              })}
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

  const myAnswers = state.responses[selfName] ?? {};
  const activeIndex = state.settings.mode === "live" ? state.currentQuestionIndex : myQuestionIndex;
  const question = state.questions[activeIndex];
  const myAnswer = question ? myAnswers[question.id] : undefined;

  function submit(value: string | number | boolean) {
    if (!canEdit || !question) return;
    const answer: QuizAnswer = { value, correct: isCorrect(question, value) };
    onChange({ ...state, responses: { ...state.responses, [selfName]: { ...myAnswers, [question.id]: answer } } });
  }

  if (!question) return null;

  const myScore = Object.entries(myAnswers).reduce((sum, [qId, a]) => {
    const q = state.questions.find((qq) => qq.id === qId);
    return sum + (a.correct && q ? q.points : 0);
  }, 0);
  const totalPoints = state.questions.reduce((sum, q) => sum + q.points, 0);
  const allAnswered = state.questions.every((q) => myAnswers[q.id] !== undefined);

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex items-center justify-between text-[10px] text-ensena-muted">
        <span>
          Question {activeIndex + 1} of {state.questions.length}
        </span>
        {state.settings.mode === "self-paced" && (
          <div className="flex gap-1">
            <button type="button" onClick={() => setMyQuestionIndex((i) => Math.max(0, i - 1))} disabled={activeIndex === 0} className="text-ensena-primary disabled:opacity-30">
              ←
            </button>
            <button type="button" onClick={() => setMyQuestionIndex((i) => Math.min(state.questions.length - 1, i + 1))} disabled={activeIndex === state.questions.length - 1} className="text-ensena-primary disabled:opacity-30">
              →
            </button>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-ensena-ink">{question.text}</p>

      {question.type === "multiple-choice" && (
        <div className="flex flex-col gap-1.5">
          {question.options.map((opt, i) => {
            const mine = myAnswer?.value === i;
            return (
              <button
                key={i}
                type="button"
                disabled={!canEdit || myAnswer !== undefined}
                onClick={() => submit(i)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs font-medium",
                  mine && state.settings.showCorrectAnswers ? (myAnswer!.correct ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-600") : mine ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {question.type === "true-false" && (
        <div className="flex gap-2">
          {[true, false].map((v) => {
            const mine = myAnswer?.value === v;
            return (
              <button
                key={String(v)}
                type="button"
                disabled={!canEdit || myAnswer !== undefined}
                onClick={() => submit(v)}
                className={cn(
                  "h-9 flex-1 rounded-lg border text-xs font-semibold",
                  mine && state.settings.showCorrectAnswers ? (myAnswer!.correct ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-rose-400 bg-rose-50 text-rose-600") : mine ? "border-ensena-primary bg-ensena-primary/10" : "border-ensena-border text-ensena-ink"
                )}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      )}

      {(question.type === "short-answer" || question.type === "numeric") && (
        <ShortAnswerInput type={question.type} disabled={!canEdit || myAnswer !== undefined} onSubmit={submit} />
      )}

      {myAnswer !== undefined && state.settings.showCorrectAnswers && (
        <p className={cn("text-[11px] font-medium", myAnswer.correct ? "text-emerald-600" : "text-rose-500")}>{myAnswer.correct ? "Correct!" : "Not quite."}</p>
      )}

      {allAnswered && <p className="mt-auto text-center text-xs font-semibold text-ensena-ink">Your score: {state.settings.showCorrectAnswers ? `${myScore}/${totalPoints}` : "Submitted. Ask your tutor for results."}</p>}
    </div>
  );
}

function ShortAnswerInput({ type, disabled, onSubmit }: { type: "short-answer" | "numeric"; disabled: boolean; onSubmit: (value: string | number) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex items-center gap-1.5">
      <input
        type={type === "numeric" ? "number" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={disabled}
        placeholder="Your answer"
        className="h-8 flex-1 rounded-lg border border-ensena-border px-2 text-xs outline-none focus:border-ensena-primary disabled:opacity-60"
      />
      <button
        type="button"
        disabled={disabled || !draft.trim()}
        onClick={() => onSubmit(type === "numeric" ? Number(draft) : draft)}
        className="h-8 rounded-lg bg-ensena-primary px-3 text-xs font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
