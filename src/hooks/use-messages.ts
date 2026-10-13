"use client";

import { useSyncExternalStore } from "react";

import { getStudentMessages, getTutorMessages, subscribeMessages } from "@/lib/messages-store";
import { initialMessages, type ChatMessage } from "@/lib/tutor-dashboard-data";
import { initialStudentMessages, type StudentChatMessage } from "@/lib/student-dashboard-data";

// Server snapshots pinned to the literal seed arrays — same hydration-safety
// rule as every other store hook this session.
export function useStudentMessages(): StudentChatMessage[] {
  return useSyncExternalStore(subscribeMessages, getStudentMessages, () => initialStudentMessages);
}

export function useTutorMessages(): ChatMessage[] {
  return useSyncExternalStore(subscribeMessages, getTutorMessages, () => initialMessages);
}
