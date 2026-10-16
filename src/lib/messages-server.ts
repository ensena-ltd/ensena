// Server-only: a signed-in user's real inbox and message threads, from
// Supabase (conversations, conversation_participants, messages,
// message_attachments). Other participants' names/photos live on profiles,
// which RLS doesn't let users read for each other, so this uses the
// service-role client — always scoped to conversations the user is
// actually a participant in.
import { getSupabaseServerClient as getServiceRoleClient } from "@/lib/supabase";

export const ATTACHMENTS_BUCKET = "message-attachments";
const SIGNED_URL_SECONDS = 60 * 60;
const THREAD_PAGE = 200;

export interface InboxPerson {
  id: string;
  name: string;
  image: string | null;
  role: string;
  /** profiles.last_seen_at (refreshed at most every 5 min while they use a dashboard). */
  lastSeenAtMs: number | null;
}

export interface InboxConversation {
  id: string;
  kind: "direct" | "booking" | "offer" | "support";
  contextLabel: string | null;
  others: InboxPerson[];
  lastMessage: { body: string; senderId: string; createdAtMs: number; hasAttachments: boolean } | null;
  lastMessageAtMs: number;
  unread: number;
  pinned: boolean;
  archived: boolean;
  /** The next upcoming lesson between the student and this tutor, if any. */
  nextLessonId: string | null;
  nextLessonSubject: string | null;
  nextLessonReference: string | null;
}

export interface ThreadAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string | null;
  blocked: boolean;
}

export interface ThreadMessage {
  id: string;
  senderId: string;
  body: string;
  createdAtMs: number;
  dividerLabel: string | null;
  reaction: string | null;
  clientId: string | null;
  attachments: ThreadAttachment[];
}

export interface Thread {
  conversationId: string;
  messages: ThreadMessage[];
  /** When each OTHER participant last read the conversation (for ✓✓ read receipts). */
  othersLastReadAtMs: number | null;
}

type Row = Record<string, unknown>;

export async function isParticipant(userId: string, conversationId: string): Promise<boolean> {
  const { count } = await getServiceRoleClient()
    .from("conversation_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function loadInbox(userId: string): Promise<InboxConversation[]> {
  const admin = getServiceRoleClient();
  const { data: mine } = await admin.from("conversation_participants").select("conversation_id, pinned, archived, unread_count").eq("user_id", userId);
  const memberships = (mine ?? []) as { conversation_id: string; pinned: boolean; archived: boolean; unread_count: number }[];
  if (memberships.length === 0) return [];
  const ids = memberships.map((m) => m.conversation_id);

  const [{ data: convRows }, { data: partRows }, { data: lastRows }] = await Promise.all([
    admin.from("conversations").select("id, kind, context_label, last_message_at").in("id", ids),
    admin.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids).neq("user_id", userId),
    // Latest message per conversation: fetch recent ones and keep the first per id.
    admin.from("messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(Math.min(1000, ids.length * 20)),
  ]);
  const others = (partRows ?? []) as { conversation_id: string; user_id: string }[];
  const otherIds = [...new Set(others.map((o) => o.user_id))];
  const lastByConv = new Map<string, Row>();
  for (const m of (lastRows ?? []) as Row[]) if (!lastByConv.has(m.conversation_id as string)) lastByConv.set(m.conversation_id as string, m);
  const lastIds = [...lastByConv.values()].map((m) => m.id as string);

  const [{ data: people }, { data: attachRows }, { data: lessons }] = await Promise.all([
    otherIds.length ? admin.from("profiles").select("id, full_name, avatar_url, role, last_seen_at").in("id", otherIds) : { data: [] },
    lastIds.length ? admin.from("message_attachments").select("message_id").in("message_id", lastIds) : { data: [] },
    otherIds.length
      ? admin
          .from("private_lessons")
          .select("id, tutor_id, student_id, scheduled_at, subject, booking_reference")
          .or(`and(student_id.eq.${userId},tutor_id.in.(${otherIds.join(",")})),and(tutor_id.eq.${userId},student_id.in.(${otherIds.join(",")}))`)
          .neq("status", "Cancelled")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
      : { data: [] },
  ]);
  const byId = new Map(((people ?? []) as { id: string; full_name: string | null; avatar_url: string | null; role: string; last_seen_at: string | null }[]).map((p) => [p.id, p]));
  const withAttachments = new Set(((attachRows ?? []) as { message_id: string }[]).map((a) => a.message_id));
  const lessonRows = (lessons ?? []) as { id: string; tutor_id: string; student_id: string; subject: string | null; booking_reference: string | null }[];

  return ((convRows ?? []) as Row[])
    .map((c) => {
      const id = c.id as string;
      const membership = memberships.find((m) => m.conversation_id === id)!;
      const people = others
        .filter((o) => o.conversation_id === id)
        .map((o) => {
          const p = byId.get(o.user_id);
          return { id: o.user_id, name: p?.full_name?.trim() || "Ensena user", image: p?.avatar_url ?? null, role: p?.role ?? "", lastSeenAtMs: p?.last_seen_at ? new Date(p.last_seen_at).getTime() : null };
        });
      const last = lastByConv.get(id);
      const otherIdSet = new Set(people.map((p) => p.id));
      const nextLesson = lessonRows.find((l) => otherIdSet.has(l.tutor_id) || otherIdSet.has(l.student_id));
      return {
        id,
        kind: c.kind as InboxConversation["kind"],
        contextLabel: (c.context_label as string | null) ?? null,
        others: people,
        lastMessage: last
          ? { body: (last.body as string) ?? "", senderId: last.sender_id as string, createdAtMs: new Date(last.created_at as string).getTime(), hasAttachments: withAttachments.has(last.id as string) }
          : null,
        lastMessageAtMs: new Date(c.last_message_at as string).getTime(),
        unread: membership.unread_count ?? 0,
        pinned: membership.pinned,
        archived: membership.archived,
        nextLessonId: nextLesson?.id ?? null,
        nextLessonSubject: nextLesson?.subject ?? null,
        nextLessonReference: nextLesson?.booking_reference ?? null,
      } satisfies InboxConversation;
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAtMs - a.lastMessageAtMs);
}

export async function loadThread(userId: string, conversationId: string): Promise<Thread | null> {
  if (!(await isParticipant(userId, conversationId))) return null;
  const admin = getServiceRoleClient();
  const [{ data: rows }, { data: othersRead }] = await Promise.all([
    admin.from("messages").select("id, sender_id, body, divider_label, reaction, client_id, created_at").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(THREAD_PAGE),
    admin.from("conversation_participants").select("last_read_at").eq("conversation_id", conversationId).neq("user_id", userId),
  ]);
  const messages = ((rows ?? []) as Row[]).reverse();
  const ids = messages.map((m) => m.id as string);
  const { data: attachRows } = ids.length
    ? await admin.from("message_attachments").select("id, message_id, name, mime_type, size, storage_path, moderation_status").in("message_id", ids)
    : { data: [] };
  const attachments = (attachRows ?? []) as { id: string; message_id: string; name: string; mime_type: string; size: number; storage_path: string | null; moderation_status: string }[];
  const paths = attachments.filter((a) => a.storage_path && a.moderation_status !== "blocked").map((a) => a.storage_path!);
  const { data: signed } = paths.length ? await admin.storage.from(ATTACHMENTS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS) : { data: [] };
  const urlFor = new Map(((signed ?? []) as { path: string | null; signedUrl: string }[]).filter((s) => s.path).map((s) => [s.path!, s.signedUrl]));

  const reads = ((othersRead ?? []) as { last_read_at: string | null }[]).map((r) => (r.last_read_at ? new Date(r.last_read_at).getTime() : 0));
  return {
    conversationId,
    othersLastReadAtMs: reads.length ? Math.max(...reads) || null : null,
    messages: messages.map((m) => ({
      id: m.id as string,
      senderId: m.sender_id as string,
      body: (m.body as string) ?? "",
      createdAtMs: new Date(m.created_at as string).getTime(),
      dividerLabel: (m.divider_label as string | null) ?? null,
      reaction: (m.reaction as string | null) ?? null,
      clientId: (m.client_id as string | null) ?? null,
      attachments: attachments
        .filter((a) => a.message_id === m.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          mimeType: a.mime_type,
          size: Number(a.size),
          url: a.storage_path ? (urlFor.get(a.storage_path) ?? null) : null,
          blocked: a.moderation_status === "blocked",
        })),
    })),
  };
}
