"use client";

import { useState } from "react";
import Image from "next/image";
import { Send, X } from "lucide-react";

import { useStudentMessages } from "@/hooks/use-messages";
import { sendStudentMessage } from "@/lib/messages-store";
import { dashboardStudent, initialStudentConversations, studentTutorConversationId } from "@/lib/student-dashboard-data";
import type { TutorListing } from "@/lib/tutors";
import { cn } from "@/lib/utils";

export function MessageTutorModal({
  open,
  tutor,
  onClose,
}: {
  open: boolean;
  tutor: TutorListing;
  onClose: () => void;
}) {
  const existingConversation = initialStudentConversations.find(
    (c) => c.name.toLowerCase() === tutor.name.toLowerCase()
  );
  const convId = existingConversation?.id ?? studentTutorConversationId(tutor.slug);

  // Real, store-backed messages — the same sendStudentMessage choke point
  // (moderation/safety check included) every other messaging entry point in
  // the app goes through, instead of this modal's own disconnected local
  // state (which never persisted and bypassed moderation entirely).
  const allMessages = useStudentMessages();
  const messages = allMessages.filter((m) => m.convId === convId && !m.offer);

  const [draft, setDraft] = useState("");
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [sendAttemptId, setSendAttemptId] = useState(() => crypto.randomUUID());

  if (!open) return null;

  function handleSend() {
    if (!draft.trim()) return;
    const result = sendStudentMessage(convId, dashboardStudent.name, draft.trim(), { clientId: sendAttemptId });
    if (!result.ok) {
      setBlockedMessage(result.userMessage);
      return;
    }
    setBlockedMessage(null);
    setDraft("");
    setSendAttemptId(crypto.randomUUID());
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="message-tutor-title">
      <div className="flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white sm:h-[70vh] sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
              <Image src={tutor.image} alt={tutor.name} fill sizes="40px" className="object-cover" />
            </div>
            <div>
              <h2 id="message-tutor-title" className="font-heading text-sm font-semibold text-ensena-ink">
                {tutor.name}
              </h2>
              <p className="text-xs text-ensena-muted">{tutor.subjectTitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <p className="mt-6 text-center text-sm text-ensena-muted">
              Start a conversation with {tutor.name.split(" ")[0]}.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.sender === "student" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                      m.sender === "student" ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-ink"
                    )}
                  >
                    {m.text}
                    <p className={cn("mt-0.5 text-[10px]", m.sender === "student" ? "text-white/70" : "text-ensena-muted")}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {blockedMessage && (
          <p className="mx-3 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{blockedMessage}</p>
        )}
        <div className="flex items-center gap-2 border-t border-ensena-border p-3">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={`Message ${tutor.name.split(" ")[0]}…`}
            className="h-10 flex-1 rounded-full border border-ensena-border px-4 text-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
