"use server";

import { revalidatePath } from "next/cache";
import { analyzeCommunication, BLOCKED_MESSAGE_COPY } from "@/lib/communication-safety";
import { ATTACHMENTS_BUCKET, isParticipant, loadInbox, loadThread, type InboxConversation, type Thread, type ThreadMessage } from "@/lib/messages-server";
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";
import { inTutorsGroupClass } from "@/lib/student-public-profile";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// The real inbox. Messages are written with the service-role client AFTER
// checking the sender is a participant, because the database's own
// on_message_inserted trigger (which bumps last_message_at and the other
// side's unread count) runs with the caller's permissions — written as the
// student through RLS, those counter updates would silently do nothing.
// Every message passes the same contact-sharing safety check and
// messaging-restriction check the rest of Ensena uses.

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_BODY = 4000;
const MAX_ATTACHMENTS = 5;

interface Me {
  id: string;
  role: string;
  name: string;
}

async function currentUser(): Promise<Me | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  return data ? { id: user.id, role: data.role, name: data.full_name?.trim() || "Someone" } : null;
}

export async function fetchInbox(): Promise<InboxConversation[]> {
  const me = await currentUser();
  return me ? loadInbox(me.id) : [];
}

export async function fetchThread(conversationId: string): Promise<Thread | null> {
  const me = await currentUser();
  if (!me || !UUID.test(conversationId)) return null;
  return loadThread(me.id, conversationId);
}

export interface SendMessageInput {
  conversationId: string;
  body: string;
  /** One id per send attempt, so a double-tap/retry never posts twice. */
  clientId: string;
  attachments?: { path: string; name: string; mimeType: string; size: number }[];
}

export type SendMessageResult = { ok: true; message: ThreadMessage; recipientIds: string[] } | { ok: false; message: string; blocked?: boolean };

export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const me = await currentUser();
  if (!me) return { ok: false, message: "Please sign in again." };
  if (!UUID.test(input.conversationId) || !(await isParticipant(me.id, input.conversationId))) return { ok: false, message: "Conversation not found." };
  const body = input.body.trim().slice(0, MAX_BODY);
  const files = (input.attachments ?? []).slice(0, MAX_ATTACHMENTS);
  if (!body && files.length === 0) return { ok: false, message: "Type a message first." };

  const admin = getServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Messaging restrictions / suspensions issued by Ensena moderation.
  const { data: restriction } = await admin
    .from("account_restrictions")
    .select("type, end_at")
    .eq("actor_id", me.id)
    .eq("status", "active")
    .in("type", ["MessagingRestriction", "Suspension"])
    .or(`end_at.is.null,end_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();
  if (restriction) {
    const until = restriction.end_at ? ` until ${new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(restriction.end_at))}` : "";
    return { ok: false, blocked: true, message: `Your messaging is restricted${until}. Contact Ensena support if you think this is a mistake.` };
  }

  // Contact details / external links / off-platform payment — checked on the
  // text and on attachment file names.
  const scanned = [body, ...files.map((f) => f.name)].filter(Boolean).join("\n");
  const analysis = analyzeCommunication(scanned);
  if (analysis.verdict === "block") {
    await admin.from("moderation_violations").insert({
      actor_id: me.id,
      category: analysis.primary?.category ?? "unknown",
      confidence: analysis.primary?.confidence === "high" ? 0.95 : 0.6,
      channel: "Message",
      confirmed: analysis.primary?.confidence === "high",
      evidence_snippet: body.slice(0, 280),
      from_context_window: false,
      occurred_at: nowIso,
    });
    return { ok: false, blocked: true, message: BLOCKED_MESSAGE_COPY };
  }

  // Idempotent retry.
  const clientId = input.clientId.slice(0, 80);
  const { data: existing } = await admin.from("messages").select("id").eq("conversation_id", input.conversationId).eq("sender_id", me.id).eq("client_id", clientId).maybeSingle();
  if (existing) {
    const thread = await loadThread(me.id, input.conversationId);
    const message = thread?.messages.find((m) => m.id === existing.id);
    if (message) return { ok: true, message, recipientIds: [] };
  }

  // Attachments must already be uploaded into this conversation's folder.
  for (const f of files) {
    if (!f.path.startsWith(`${input.conversationId}/`) || f.path.includes("..")) return { ok: false, message: "That attachment can't be sent." };
  }
  if (files.length) {
    const { data: found } = await admin.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(files.map((f) => f.path), 60);
    if (!found || found.some((f) => f.error || !f.signedUrl)) return { ok: false, message: "An attachment didn't finish uploading. Please try again." };
  }

  const { data: inserted, error } = await admin
    .from("messages")
    .insert({ conversation_id: input.conversationId, sender_id: me.id, body, client_id: clientId })
    .select("id, created_at")
    .single();
  if (error || !inserted) return { ok: false, message: "Your message couldn't be sent. Please try again." };

  if (files.length) {
    await admin.from("message_attachments").insert(
      files.map((f) => ({ message_id: inserted.id, name: f.name.slice(0, 200), mime_type: f.mimeType, size: f.size, storage_path: f.path, moderation_status: "approved" }))
    );
  }
  // The sender has obviously read their own conversation.
  await admin.from("conversation_participants").update({ unread_count: 0, last_read_at: nowIso }).eq("conversation_id", input.conversationId).eq("user_id", me.id);

  const [{ data: recipients }, thread] = await Promise.all([
    admin.from("conversation_participants").select("user_id").eq("conversation_id", input.conversationId).neq("user_id", me.id),
    loadThread(me.id, input.conversationId),
  ]);
  const recipientIds = ((recipients ?? []) as { user_id: string }[]).map((r) => r.user_id);
  await pingInboxes(recipientIds, input.conversationId);
  const message = thread?.messages.find((m) => m.id === inserted.id);
  if (!message) return { ok: false, message: "Your message was sent but couldn't be shown. Please refresh." };
  return { ok: true, message, recipientIds };
}

// Tells each recipient's open inbox to refetch, over Supabase Realtime
// Broadcast. The ping carries no message content — the inbox always
// re-reads through the permission-checked loaders above.
async function pingInboxes(userIds: string[], conversationId: string) {
  const admin = getServiceRoleClient();
  await Promise.all(
    userIds.map(async (id) => {
      const channel = admin.channel(`inbox:${id}`);
      try {
        await channel.httpSend("changed", { conversationId });
      } catch {
        // Recipients still pick it up on their next poll.
      } finally {
        await admin.removeChannel(channel);
      }
    })
  );
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const me = await currentUser();
  if (!me || !UUID.test(conversationId)) return;
  // Runs as the user: RLS lets each participant update only their own row.
  const supabase = await getSupabaseServerClient();
  await supabase.from("conversation_participants").update({ unread_count: 0, last_read_at: new Date().toISOString() }).eq("conversation_id", conversationId).eq("user_id", me.id);
  // Clear the matching "X sent you a message" notifications too.
  const admin = getServiceRoleClient();
  const { data: others } = await admin.from("conversation_participants").select("user_id").eq("conversation_id", conversationId).neq("user_id", me.id);
  const otherIds = ((others ?? []) as { user_id: string }[]).map((o) => o.user_id);
  const { data: people } = otherIds.length ? await admin.from("profiles").select("full_name").in("id", otherIds) : { data: [] };
  const texts = ((people ?? []) as { full_name: string | null }[]).filter((p) => p.full_name).map((p) => `${p.full_name} sent you a message`);
  if (texts.length) await admin.from("notifications").update({ unread: false }).eq("user_id", me.id).eq("category", "Message").eq("unread", true).in("text", texts);
  // Refreshes the layout's unread badge.
  revalidatePath("/student-dashboard", "layout");
}

export async function setConversationFlags(conversationId: string, flags: { pinned?: boolean; archived?: boolean }): Promise<{ ok: boolean }> {
  const me = await currentUser();
  if (!me || !UUID.test(conversationId)) return { ok: false };
  const patch: { pinned?: boolean; archived?: boolean } = {};
  if (typeof flags.pinned === "boolean") patch.pinned = flags.pinned;
  if (typeof flags.archived === "boolean") patch.archived = flags.archived;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("conversation_participants").update(patch).eq("conversation_id", conversationId).eq("user_id", me.id);
  return { ok: !error };
}

/**
 * Opens (or reuses) the student's 1-on-1 conversation with a tutor. Students
 * can message any approved tutor, or any tutor/counsellor they have a booking with.
 */
export async function startConversationWith(otherUserId: string): Promise<{ ok: boolean; conversationId?: string; message?: string }> {
  const me = await currentUser();
  if (!me) return { ok: false, message: "Please sign in again." };
  if (!UUID.test(otherUserId) || otherUserId === me.id) return { ok: false, message: "You can't message this person." };
  const admin = getServiceRoleClient();

  const [{ data: other }, { data: tutor }, { count: lessons }, { count: discovery }, { count: counselling }] = await Promise.all([
    admin.from("profiles").select("id, role, full_name").eq("id", otherUserId).maybeSingle(),
    admin.from("tutor_profiles").select("application_status, allow_new_student_messages").eq("id", otherUserId).maybeSingle(),
    admin.from("private_lessons").select("id", { count: "exact", head: true }).or(`and(student_id.eq.${me.id},tutor_id.eq.${otherUserId}),and(tutor_id.eq.${me.id},student_id.eq.${otherUserId})`),
    admin.from("discovery_sessions").select("id", { count: "exact", head: true }).or(`and(student_id.eq.${me.id},tutor_id.eq.${otherUserId}),and(tutor_id.eq.${me.id},student_id.eq.${otherUserId})`),
    admin.from("counselling_appointments").select("id", { count: "exact", head: true }).eq("student_id", me.id).eq("counsellor_id", otherUserId),
  ]);
  if (!other) return { ok: false, message: "You can't message this person." };
  // A group class counts as a booking between its tutor and each student in it.
  const inGroup =
    (lessons ?? 0) + (discovery ?? 0) + (counselling ?? 0) === 0 &&
    (me.role === "tutor" ? await inTutorsGroupClass(me.id, otherUserId) : other.role === "tutor" ? await inTutorsGroupClass(otherUserId, me.id) : false);
  const hasBooking = (lessons ?? 0) + (discovery ?? 0) + (counselling ?? 0) > 0 || inGroup;
  const approvedTutor = other.role === "tutor" && tutor?.application_status === "approved";
  if (!hasBooking && !(me.role === "student" && approvedTutor)) return { ok: false, message: "You can only message tutors on Ensena or people you have a class with." };

  // Reuse an existing 1-on-1 thread between exactly these two people.
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from("conversation_participants").select("conversation_id").eq("user_id", me.id),
    admin.from("conversation_participants").select("conversation_id").eq("user_id", otherUserId),
  ]);
  const shared = ((mine ?? []) as { conversation_id: string }[]).map((r) => r.conversation_id).filter((id) => ((theirs ?? []) as { conversation_id: string }[]).some((t) => t.conversation_id === id));
  if (shared.length) {
    const { data: candidates } = await admin.from("conversations").select("id, kind").in("id", shared).in("kind", ["direct", "booking"]);
    for (const c of (candidates ?? []) as { id: string }[]) {
      const { count } = await admin.from("conversation_participants").select("user_id", { count: "exact", head: true }).eq("conversation_id", c.id);
      if (count === 2) {
        await admin.from("conversation_participants").update({ archived: false }).eq("conversation_id", c.id).eq("user_id", me.id);
        return { ok: true, conversationId: c.id };
      }
    }
  }

  // Settings → Privacy → "Allow Messages from New Students": an existing
  // thread (above) is never cut off, but a student with no booking can't
  // open a new one.
  if (!hasBooking && approvedTutor && tutor?.allow_new_student_messages === false) {
    return { ok: false, message: `${other.full_name?.split(" ")[0] || "This tutor"} only takes messages from their current students. Book a lesson or discovery session to get in touch.` };
  }

  const { data: created, error } = await admin
    .from("conversations")
    .insert({ kind: hasBooking ? "booking" : "direct", context_label: other.role === "tutor" ? "Private Tutor" : other.role === "counsellor" ? "Counsellor" : null })
    .select("id")
    .single();
  if (error || !created) return { ok: false, message: "We couldn't start this conversation." };
  const { error: partError } = await admin.from("conversation_participants").insert([
    { conversation_id: created.id, user_id: me.id },
    { conversation_id: created.id, user_id: otherUserId },
  ]);
  if (partError) {
    await admin.from("conversations").delete().eq("id", created.id);
    return { ok: false, message: "We couldn't start this conversation." };
  }
  return { ok: true, conversationId: created.id };
}
