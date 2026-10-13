"use client";

import { useState } from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ClassroomChatMessage, ClassroomRole } from "@/lib/classroom-data";
import { cn } from "@/lib/utils";

export function ClassroomChatPanel({ role, chat, onSend }: { role: ClassroomRole; chat: ClassroomChatMessage[]; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  function submit() {
    onSend(draft);
    setDraft("");
  }

  return (
    <div className="flex size-full flex-col p-4">
      <ul className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {chat.map((m) => (
          <li key={m.id} className={cn("flex flex-col gap-0.5", m.senderRole === role ? "items-end" : "items-start")}>
            <span className="text-[11px] text-white/40">
              {m.sender} · {m.time}
            </span>
            <span
              className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.senderRole === role ? "bg-ensena-primary text-white" : "bg-white/10 text-white")}
            >
              {m.text}
            </span>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-3 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2 py-1"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          aria-label="Type a message"
          className="h-9 flex-1 border-0 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/40"
        />
        <Button type="submit" size="icon" className="size-8 shrink-0 rounded-full bg-ensena-primary text-white">
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
