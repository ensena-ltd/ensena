"use client";

import { useEffect, useRef, useState } from "react";

import type { ClassroomChatMessage } from "@/lib/classroom-data";
import { appendChatMessage, getChatMessages } from "@/lib/classroom-chat-store";
import { createClassroomSyncTransport, type ChatMessageEvent, type ClassroomSyncTransport } from "@/lib/classroom-sync";

export interface UseClassroomChatResult {
  chat: ClassroomChatMessage[];
  sendChatMessage: (message: ClassroomChatMessage) => void;
}

// Real, persisted AND synced classroom chat — replaces the previous
// per-participant local `useState(session.chatSeed)`, which reset on every
// refresh and was never actually seen by the other participant (each side
// only ever rendered its own local copy). Persistence is
// classroom-chat-store.ts (localStorage, survives refresh/reopen); live
// delivery rides the exact same shared, ref-counted transport the
// whiteboard/hand-raise/tool signaling already use for this classroomId, so
// this adds no extra connection.
export function useClassroomChat({ classroomId, seed }: { classroomId: string; seed: ClassroomChatMessage[] }): UseClassroomChatResult {
  const [chat, setChat] = useState<ClassroomChatMessage[]>(() => getChatMessages(classroomId, seed));
  const transportRef = useRef<ClassroomSyncTransport | null>(null);

  useEffect(() => {
    const transport = createClassroomSyncTransport(classroomId);
    transportRef.current = transport;

    const unsub = transport.onChatEvent((event: ChatMessageEvent) => {
      setChat(appendChatMessage(classroomId, { id: event.id, sender: event.sender, senderRole: event.senderRole, text: event.text, time: event.time }));
    });

    return () => {
      unsub();
      transport.disconnect();
      transportRef.current = null;
    };
  }, [classroomId]);

  function sendChatMessage(message: ClassroomChatMessage) {
    setChat(appendChatMessage(classroomId, message));
    transportRef.current?.sendChatEvent({ id: message.id, sender: message.sender, senderRole: message.senderRole, text: message.text, time: message.time });
  }

  return { chat, sendChatMessage };
}
