"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Modal } from "@/components/ui/modal";
import { defaultAdminTutorThread, type AdminTutorMessage } from "@/lib/admin-group-classes-data";
import { cn } from "@/lib/utils";

// Private admin <-> user thread — deliberately separate from the classroom
// chat (which students can see). Shared by the Group Classes list, the
// Join classroom view, the Observe monitoring view, and the Booking
// Details "Contact Student"/"Contact Tutor" actions, so there's one
// implementation of "message someone privately" rather than several.
export function AdminMsgTutorModal({
  open,
  onClose,
  recipientName,
  role = "Tutor",
}: {
  open: boolean;
  onClose: () => void;
  recipientName: string;
  role?: "Tutor" | "Student";
}) {
  const firstName = recipientName.split(" ")[0] ?? recipientName;
  const [thread, setThread] = useState<AdminTutorMessage[]>(() => defaultAdminTutorThread(firstName));
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setThread((prev) => [...prev, { id: `at-${Date.now()}`, sender: "admin", text: draft, time: "Now" }]);
    setDraft("");
  }

  return (
    <Modal open={open} onClose={onClose} title={`Message ${recipientName}`}>
      <div className="flex flex-col gap-3">
        <p className="text-xs text-ensena-muted">
          Private to you and {recipientName}. {role === "Tutor" ? "Students" : "Tutors"} never see this thread.
        </p>
        <div className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl border border-ensena-border p-3">
          {thread.map((m) => (
            <div
              key={m.id}
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                m.sender === "admin" ? "self-end bg-ensena-primary text-white" : "self-start bg-ensena-bg-soft text-ensena-ink"
              )}
            >
              <p className="text-[10px] font-semibold opacity-70">{m.sender === "admin" ? "You" : recipientName} · {m.time}</p>
              <p>{m.text}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${recipientName}…`}
            className="h-10 flex-1 rounded-full border border-ensena-border px-3 text-sm"
          />
          <button type="button" onClick={send} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
