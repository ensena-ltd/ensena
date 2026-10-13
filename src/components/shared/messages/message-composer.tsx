"use client";

import { useRef, useState } from "react";
import { Paperclip, Send, ShieldAlert, Smile } from "lucide-react";

import { EmojiPicker } from "@/components/shared/messages/emoji-picker";
import { PendingAttachmentsBar } from "@/components/shared/messages/pending-attachments-bar";
import { RestrictionAppealModal } from "@/components/shared/messages/restriction-appeal-modal";
import { useAttachmentPicker } from "@/hooks/use-attachment-picker";
import { useActiveRestriction } from "@/hooks/use-restriction";
import { ALLOWED_ATTACHMENT_TYPES } from "@/lib/attachment-store";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import { formatRestorationMoment, userFacingReasonLabel, type ActorRole } from "@/lib/moderation-store";
import { cn } from "@/lib/utils";

// Shared by both the tutor and student inboxes so real attachments and a
// real emoji picker behave identically on both sides — a real hidden file
// input (the native picker on mobile and desktop is just what a file input
// already does, no separate code path needed), real cursor-aware emoji
// insertion into a ref-tracked textarea, and real per-file
// uploading/uploaded/failed state backed by attachment-store.ts.
export function MessageComposer({
  draft,
  onDraftChange,
  onSend,
  actorName,
  actorRole,
  actorEmail,
  placeholder = "Type a message…",
  compact = false,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  /** Return true if the message was actually sent (caller clears its own side effects); false to keep the draft (e.g. blocked by moderation). */
  onSend: (text: string, attachments: MessageAttachment[]) => boolean;
  /** Whoever is composing — attachments are scanned through the same moderation choke point a plain-text message goes through, attributed to this sender. */
  actorName: string;
  actorRole: ActorRole;
  /** Passed through to a restriction appeal ticket, if this sender is currently restricted — never required for sending itself. */
  actorEmail?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const attachmentPicker = useAttachmentPicker(actorName, actorRole);
  const restriction = useActiveRestriction(actorName, actorRole, actorEmail);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      onDraftChange(draft + emoji);
      setEmojiOpen(false);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    onDraftChange(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  }

  function handleSend() {
    if (attachmentPicker.isUploading) return;
    if (!draft.trim() && attachmentPicker.readyAttachments.length === 0) return;
    const sent = onSend(draft, attachmentPicker.readyAttachments);
    if (sent) {
      onDraftChange("");
      attachmentPicker.clear();
    }
  }

  const canSend = (draft.trim().length > 0 || attachmentPicker.readyAttachments.length > 0) && !attachmentPicker.isUploading;

  // A real, active restriction replaces the composer entirely — never a
  // disabled input with a vague tooltip. Every notice here answers: what
  // happened, why, how long, when messaging resumes, and what to do about
  // it, per the platform's own "never leave an indefinite restriction
  // message" rule. Warning-type records never reach here (useActiveRestriction/
  // getActiveRestriction only ever returns a MessagingRestriction or
  // Suspension — a Warning never blocks sending).
  if (restriction) {
    const isSuspension = restriction.type === "Suspension";
    return (
      <div className={cn("border-t border-ensena-border bg-rose-50/60", compact ? "p-3" : "p-4")}>
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 size-4.5 shrink-0 text-rose-600" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ensena-ink">
              {isSuspension ? "Your account has been temporarily suspended" : "Your messaging access is temporarily restricted"}
            </p>
            <p className="mt-1 text-sm text-ensena-muted">
              {isSuspension
                ? `Your account has been temporarily suspended due to ${userFacingReasonLabel(restriction)}.`
                : `Your messaging access has been temporarily restricted due to ${userFacingReasonLabel(restriction)}.`}
            </p>
            <p className="mt-2 text-sm font-medium text-ensena-ink">
              {isSuspension ? "Suspension ends" : "Messaging will be available again on"}: {restriction.endAtMs ? formatRestorationMoment(restriction.endAtMs) : "—"}
            </p>
            {restriction.status === "UnderReview" && (
              <p className="mt-1.5 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                Internal Support is reviewing your appeal
              </p>
            )}
            <button
              type="button"
              onClick={() => setAppealOpen(true)}
              className="mt-3 h-9 rounded-full border border-ensena-border bg-white px-4 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
            >
              {restriction.status === "UnderReview" ? "View appeal status" : "Contact Internal Support"}
            </button>
          </div>
        </div>
        {appealOpen && (
          <RestrictionAppealModal restriction={restriction} actorEmail={actorEmail} actorRole={actorRole} onClose={() => setAppealOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PendingAttachmentsBar pending={attachmentPicker.pending} onRemove={attachmentPicker.removeFile} onRetry={attachmentPicker.retry} />
      <div className={cn("flex items-end gap-2", compact ? "p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]" : "p-4")}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) attachmentPicker.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted",
            !compact && "border border-ensena-border"
          )}
        >
          <Paperclip className="size-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          rows={1}
          className="h-10 max-h-28 flex-1 resize-none rounded-2xl border border-ensena-border px-4 py-2.5 text-sm leading-tight"
        />

        <div className="relative shrink-0">
          {emojiOpen && <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} />}
          <button
            type="button"
            aria-label="Insert emoji"
            onClick={() => setEmojiOpen((v) => !v)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full text-ensena-muted",
              !compact && "border border-ensena-border"
            )}
          >
            <Smile className="size-4" />
          </button>
        </div>

        {compact ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white disabled:opacity-40"
          >
            <Send className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Send className="size-4" /> Send
          </button>
        )}
      </div>
    </div>
  );
}
