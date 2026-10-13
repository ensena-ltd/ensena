import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { MessagesReal } from "@/components/student-dashboard/live/messages-real";
import { MessagesClient } from "@/components/tutor-dashboard/messages/messages-client";
import { startConversationWith } from "@/lib/actions/messages";
import { loadInbox, loadThread } from "@/lib/messages-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/supabase/require-role";

export const metadata: Metadata = {
  title: "Messages | Ensena Tutor Dashboard",
};

const UUID = /^[0-9a-f-]{36}$/i;

// ?c=<conversation id> opens a conversation; ?student=<student id> opens
// (or starts) the 1-on-1 conversation with a student the tutor teaches.
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string; student?: string }> }) {
  const profile = isSupabaseConfigured() ? await requireRole("tutor") : null;
  if (!profile) {
    return (
      <Suspense fallback={null}>
        <MessagesClient />
      </Suspense>
    );
  }
  const { c, student } = await searchParams;
  let startError: string | null = null;
  if (student && UUID.test(student)) {
    const started = await startConversationWith(student);
    if (started.ok && started.conversationId) redirect(`/tutor-dashboard/messages?c=${started.conversationId}`);
    startError = started.message ?? "You can only message students you teach.";
  }
  const inbox = await loadInbox(profile.id);
  const activeId = c && inbox.some((conv) => conv.id === c) ? c : null;
  const thread = activeId ? await loadThread(profile.id, activeId) : null;
  return (
    <>
      {startError && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{startError}</p>}
      <MessagesReal selfId={profile.id} initialInbox={inbox} initialActiveId={activeId} initialThread={thread} role="tutor" />
    </>
  );
}
