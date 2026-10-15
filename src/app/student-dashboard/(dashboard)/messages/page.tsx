import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { MessagesReal } from "@/components/student-dashboard/live/messages-real";
import { StudentMessagesClient } from "@/components/student-dashboard/messages/student-messages-client";
import { startConversationWith } from "@/lib/actions/messages";
import { loadInbox, loadThread } from "@/lib/messages-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Messages | Ensena Student Dashboard",
};

const UUID = /^[0-9a-f-]{36}$/i;

// ?c=<conversation id> opens a conversation; ?tutor=<tutor id> opens (or
// starts) the 1-on-1 conversation with that tutor; ?draft= pre-fills the
// message box (e.g. a discovery-session or pre-approval request).
export default async function StudentMessagesPage({ searchParams }: { searchParams: Promise<{ c?: string; tutor?: string; draft?: string }> }) {
  const profile = isSupabaseConfigured() ? await requireRole("student") : null;
  if (!profile) {
    return (
      <Suspense fallback={null}>
        <StudentMessagesClient />
      </Suspense>
    );
  }
  const { c, tutor, draft } = await searchParams;
  if (tutor && UUID.test(tutor)) {
    const started = await startConversationWith(tutor);
    if (started.ok && started.conversationId) redirect(`/student-dashboard/messages?c=${started.conversationId}${draft ? `&draft=${encodeURIComponent(draft.slice(0, 1000))}` : ""}`);
  }
  const inbox = await loadInbox(profile.id);
  const activeId = c && inbox.some((conv) => conv.id === c) ? c : null;
  const thread = activeId ? await loadThread(profile.id, activeId) : null;
  return <MessagesReal selfId={profile.id} initialInbox={inbox} initialActiveId={activeId} initialThread={thread} />;
}
