"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowLeft, Download, FileText, Loader2, MessageSquare, MoreVertical, Paperclip, Pin, PinOff, Search, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";

import { EmojiPicker } from "@/components/shared/messages/emoji-picker";
import { fetchInbox, fetchThread, markConversationRead, sendMessage, setConversationFlags } from "@/lib/actions/messages";
import { formatFileSize } from "@/lib/attachment-store";
import type { InboxConversation, Thread, ThreadAttachment, ThreadMessage } from "@/lib/messages-server";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { formatTime, platformISODate, relativeDay } from "./learning-utils";
import { PersonAvatar } from "./live-shared";

const BUCKET = "message-attachments";
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
];
const POLL_MS = 20_000;

type Filter = "All" | "Unread" | "Archived";

interface PendingFile {
  key: string;
  file: File;
  status: "uploading" | "ready" | "failed";
  path?: string;
}

interface OutgoingMessage {
  clientId: string;
  body: string;
  files: { name: string; mimeType: string; size: number }[];
  createdAtMs: number;
  failed?: string;
}

const titleOf = (c: InboxConversation) => (c.others.length ? c.others.map((o) => o.name).join(", ") : c.contextLabel || "Conversation");
const roleLabel = (role: string) => (role === "tutor" ? "Tutor" : role === "counsellor" ? "Counsellor" : role === "admin" || role === "staff" ? "Ensena Support" : role === "student" ? "Student" : "");

// Everything role-specific about the inbox: where it lives and where its
// links go. The conversations themselves work the same for every role.
interface InboxVariant {
  base: string;
  subtitle: string;
  emptyHint: string;
  emptyCta: { href: string; label: string } | null;
  personHref: (person: { id: string; role: string }) => { href: string; label: string } | null;
  lessonHref: (lessonId: string) => string;
}

const studentInbox: InboxVariant = {
  base: "/student-dashboard/messages",
  subtitle: "Stay connected with your tutors and Ensena.",
  emptyHint: "Message a tutor from their profile to ask questions before you book.",
  emptyCta: { href: "/student-dashboard/find-a-tutor", label: "Find a tutor" },
  personHref: (p) => (p.role === "tutor" ? { href: `/student-dashboard/tutors/${p.id}`, label: "View tutor profile" } : null),
  lessonHref: (id) => `/student-dashboard/lessons?view=${id}`,
};

const tutorInbox: InboxVariant = {
  base: "/tutor-dashboard/messages",
  subtitle: "Chat with your students and Ensena support.",
  emptyHint: "Students who message you, and students you teach, show up here. Use the message button on any student to start a chat.",
  emptyCta: { href: "/tutor-dashboard/students", label: "My students" },
  personHref: (p) => (p.role === "student" ? { href: `/tutor-dashboard/students/${p.id}`, label: "View student" } : null),
  lessonHref: (id) => `/tutor-dashboard/private-lessons/${id}`,
};

function listTime(ms: number, nowMs: number): string {
  const day = relativeDay(ms, nowMs);
  return day === "Today" ? formatTime(ms) : day;
}

function previewOf(c: InboxConversation, selfId: string): string {
  if (!c.lastMessage) return "No messages yet. Say hello 👋";
  const prefix = c.lastMessage.senderId === selfId ? "You: " : "";
  return prefix + (c.lastMessage.body || (c.lastMessage.hasAttachments ? "📎 Attachment" : ""));
}

export function MessagesReal({
  selfId,
  initialInbox,
  initialActiveId,
  initialThread,
  role = "student",
}: {
  selfId: string;
  initialInbox: InboxConversation[];
  initialActiveId: string | null;
  initialThread: Thread | null;
  role?: "student" | "tutor";
}) {
  const variant = role === "tutor" ? tutorInbox : studentInbox;
  const router = useRouter();
  const [inbox, setInbox] = useState(initialInbox);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const [threads, setThreads] = useState<Record<string, Thread>>(initialThread ? { [initialThread.conversationId]: initialThread } : {});
  const [outgoing, setOutgoing] = useState<Record<string, OutgoingMessage[]>>({});
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">(initialActiveId ? "chat" : "list");
  const [nowMs, setNowMs] = useState(0);
  const activeRef = useRef(activeId);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wall clock for relative times, client-only
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(async () => {
    const [nextInbox, nextThread] = await Promise.all([fetchInbox(), activeRef.current ? fetchThread(activeRef.current) : Promise.resolve(null)]);
    setInbox(nextInbox);
    if (nextThread) {
      setThreads((prev) => ({ ...prev, [nextThread.conversationId]: nextThread }));
      const conv = nextInbox.find((c) => c.id === nextThread.conversationId);
      if (conv && conv.unread > 0 && document.visibilityState === "visible") {
        await markConversationRead(nextThread.conversationId);
        setInbox((prev) => prev.map((c) => (c.id === nextThread.conversationId ? { ...c, unread: 0 } : c)));
      }
    }
  }, []);

  // Live updates: a Realtime broadcast ping on this user's inbox channel
  // (sent by the server whenever someone messages them), plus a slow poll
  // and a refresh whenever the tab regains focus as a fallback.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase.channel(`inbox:${selfId}`).on("broadcast", { event: "changed" }, () => void refresh()).subscribe();
    const poll = setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [selfId, refresh]);

  async function openConversation(id: string) {
    setActiveId(id);
    setMobileView("chat");
    window.history.replaceState(null, "", `${variant.base}?c=${id}`);
    setInbox((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    const thread = await fetchThread(id);
    if (thread) setThreads((prev) => ({ ...prev, [id]: thread }));
    await markConversationRead(id);
  }

  // Mark the conversation the page opened on as read.
  useEffect(() => {
    if (initialActiveId) void markConversationRead(initialActiveId);
  }, [initialActiveId]);

  async function toggleFlag(conv: InboxConversation, flag: "pinned" | "archived") {
    const next = !conv[flag];
    setInbox((prev) => prev.map((c) => (c.id === conv.id ? { ...c, [flag]: next } : c)));
    const result = await setConversationFlags(conv.id, { [flag]: next });
    if (!result.ok) {
      setInbox((prev) => prev.map((c) => (c.id === conv.id ? { ...c, [flag]: !next } : c)));
      toast.error("Couldn't update this conversation.");
    } else if (flag === "archived") {
      toast.success(next ? "Conversation archived." : "Conversation moved back to your inbox.");
    }
  }

  async function send(conversationId: string, body: string, files: PendingFile[]): Promise<boolean> {
    const clientId = crypto.randomUUID();
    const draft: OutgoingMessage = { clientId, body: body.trim(), files: files.map((f) => ({ name: f.file.name, mimeType: f.file.type, size: f.file.size })), createdAtMs: Date.now() };
    setOutgoing((prev) => ({ ...prev, [conversationId]: [...(prev[conversationId] ?? []), draft] }));
    const result = await sendMessage({
      conversationId,
      body,
      clientId,
      attachments: files.map((f) => ({ path: f.path!, name: f.file.name, mimeType: f.file.type, size: f.file.size })),
    });
    if (!result.ok) {
      setOutgoing((prev) => ({ ...prev, [conversationId]: (prev[conversationId] ?? []).filter((m) => m.clientId !== clientId) }));
      if (result.blocked) toast.error("Message not sent", { description: result.message, duration: 8000 });
      else toast.error(result.message);
      return false;
    }
    setOutgoing((prev) => ({ ...prev, [conversationId]: (prev[conversationId] ?? []).filter((m) => m.clientId !== clientId) }));
    setThreads((prev) => {
      const t = prev[conversationId];
      if (!t || t.messages.some((m) => m.id === result.message.id)) return prev;
      return { ...prev, [conversationId]: { ...t, messages: [...t.messages, result.message] } };
    });
    setInbox((prev) =>
      prev
        .map((c) =>
          c.id === conversationId
            ? { ...c, archived: false, lastMessageAtMs: result.message.createdAtMs, lastMessage: { body: result.message.body, senderId: selfId, createdAtMs: result.message.createdAtMs, hasAttachments: result.message.attachments.length > 0 } }
            : c
        )
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.lastMessageAtMs - a.lastMessageAtMs)
    );
    return true;
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inbox.filter((c) => {
      if (filter === "Archived" ? !c.archived : c.archived) return false;
      if (filter === "Unread" && c.unread === 0) return false;
      return !q || titleOf(c).toLowerCase().includes(q) || (c.lastMessage?.body ?? "").toLowerCase().includes(q);
    });
  }, [inbox, filter, query]);

  const active = inbox.find((c) => c.id === activeId) ?? null;
  const thread = activeId ? threads[activeId] : undefined;
  const totalUnread = inbox.filter((c) => !c.archived).reduce((n, c) => n + c.unread, 0);

  const list = (
    <ConversationList
      conversations={visible}
      selfId={selfId}
      activeId={activeId}
      nowMs={nowMs}
      filter={filter}
      setFilter={setFilter}
      query={query}
      setQuery={setQuery}
      totalUnread={totalUnread}
      onOpen={(id) => void openConversation(id)}
      emptyInbox={inbox.length === 0}
      subtitle={variant.subtitle}
    />
  );

  const chat = active ? (
    <ChatPanel
      key={active.id}
      conversation={active}
      thread={thread}
      outgoing={outgoing[active.id] ?? []}
      selfId={selfId}
      nowMs={nowMs}
      variant={variant}
      onBack={() => {
        setMobileView("list");
        router.replace(variant.base, { scroll: false });
      }}
      onToggleFlag={(flag) => void toggleFlag(active, flag)}
      onSend={(body, files) => send(active.id, body, files)}
    />
  ) : (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <MessageSquare className="size-10 text-ensena-muted" />
      <p className="font-heading text-base font-semibold text-ensena-ink">{inbox.length ? "Pick a conversation" : "No messages yet"}</p>
      <p className="max-w-xs text-sm text-ensena-muted">
        {inbox.length ? "Choose a conversation on the left to read and reply." : variant.emptyHint}
      </p>
      {inbox.length === 0 && variant.emptyCta && (
        <Link href={variant.emptyCta.href} className="mt-2 rounded-full bg-ensena-primary px-4 py-2 text-sm font-semibold text-white">
          {variant.emptyCta.label}
        </Link>
      )}
    </div>
  );

  return (
    <div>
      <div className="hidden h-[calc(100vh-8rem)] gap-4 lg:flex">
        <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-ensena-border bg-ensena-surface xl:w-96">{list}</div>
        <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-ensena-border bg-ensena-surface">{chat}</div>
      </div>
      <div className="lg:hidden">
        {mobileView === "list" || !active ? (
          <div className="flex flex-col rounded-2xl border border-ensena-border bg-ensena-surface">{list}</div>
        ) : (
          <div className="fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col bg-ensena-surface">{chat}</div>
        )}
      </div>
    </div>
  );
}

function ConversationList({
  conversations,
  selfId,
  activeId,
  nowMs,
  filter,
  setFilter,
  query,
  setQuery,
  totalUnread,
  onOpen,
  emptyInbox,
  subtitle,
}: {
  conversations: InboxConversation[];
  selfId: string;
  activeId: string | null;
  nowMs: number;
  filter: Filter;
  setFilter: (f: Filter) => void;
  query: string;
  setQuery: (q: string) => void;
  totalUnread: number;
  onOpen: (id: string) => void;
  emptyInbox: boolean;
  subtitle: string;
}) {
  return (
    <>
      <div className="p-4">
        <h1 className="font-heading text-xl font-semibold text-ensena-ink">Messages</h1>
        <p className="mt-1 text-xs text-ensena-muted">{subtitle}</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations…" aria-label="Search conversations" className="h-10 w-full rounded-full border border-ensena-border bg-ensena-surface pl-9 pr-3 text-sm text-ensena-ink" />
        </div>
        <div className="mt-3 flex gap-1.5">
          {(["All", "Unread", "Archived"] as Filter[]).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1 text-xs font-medium", filter === f ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-muted hover:text-ensena-ink")}>
              {f}
              {f === "Unread" && totalUnread > 0 ? ` (${totalUnread})` : ""}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto border-t border-ensena-border">
        {conversations.map((c) => {
          const person = c.others[0];
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className={cn("flex w-full items-start gap-3 border-b border-ensena-border px-4 py-3.5 text-left", activeId === c.id ? "bg-ensena-primary/5" : "hover:bg-ensena-bg-soft/60")}
              >
                <PersonAvatar name={person?.name ?? titleOf(c)} image={person?.image ?? null} className="size-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("flex min-w-0 items-center gap-1 truncate text-sm text-ensena-ink", c.unread > 0 ? "font-bold" : "font-semibold")}>
                      {c.pinned && <Pin className="size-3 shrink-0 text-ensena-muted" />}
                      <span className="truncate">{titleOf(c)}</span>
                    </p>
                    {nowMs > 0 && <span className="shrink-0 text-[11px] text-ensena-muted">{listTime(c.lastMessage?.createdAtMs ?? c.lastMessageAtMs, nowMs)}</span>}
                  </div>
                  <p className="truncate text-xs text-ensena-muted">{[roleLabel(person?.role ?? ""), c.contextLabel].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ")}</p>
                  <p className={cn("mt-0.5 truncate text-xs", c.unread > 0 ? "font-medium text-ensena-ink" : "text-ensena-muted")}>{previewOf(c, selfId)}</p>
                </div>
                {c.unread > 0 && <span className="mt-1 flex min-w-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-primary px-1 text-[10px] font-semibold text-white">{c.unread}</span>}
              </button>
            </li>
          );
        })}
        {conversations.length === 0 && (
          <p className="p-6 text-center text-sm text-ensena-muted">
            {emptyInbox ? "No conversations yet." : filter === "Archived" ? "No archived conversations." : filter === "Unread" ? "You're all caught up." : "No conversations match your search."}
          </p>
        )}
      </ul>
    </>
  );
}

function AttachmentView({ a, mine }: { a: ThreadAttachment; mine: boolean }) {
  if (a.blocked) return <span className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">Attachment removed by Ensena moderation</span>;
  if (a.url && a.mimeType.startsWith("image/")) {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="relative block h-40 w-56 overflow-hidden rounded-xl border border-ensena-border bg-ensena-bg-soft">
        <Image src={a.url} alt={a.name} fill sizes="224px" className="object-cover" unoptimized />
      </a>
    );
  }
  return (
    <a
      href={a.url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn("flex max-w-64 items-center gap-2.5 rounded-xl border px-3 py-2 text-xs", mine ? "border-ensena-primary/20 bg-ensena-primary/5" : "border-ensena-border bg-ensena-bg-soft", !a.url && "pointer-events-none opacity-60")}
    >
      <FileText className="size-5 shrink-0 text-ensena-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-ensena-ink">{a.name}</span>
        <span className="text-ensena-muted">{formatFileSize(a.size)}</span>
      </span>
      <Download className="size-4 shrink-0 text-ensena-muted" />
    </a>
  );
}

function ChatPanel({
  conversation: c,
  thread,
  outgoing,
  selfId,
  nowMs,
  variant,
  onBack,
  onToggleFlag,
  onSend,
}: {
  variant: InboxVariant;
  conversation: InboxConversation;
  thread: Thread | undefined;
  outgoing: OutgoingMessage[];
  selfId: string;
  nowMs: number;
  onBack: () => void;
  onToggleFlag: (flag: "pinned" | "archived") => void;
  onSend: (body: string, files: PendingFile[]) => Promise<boolean>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const person = c.others[0];
  const personLink = person ? variant.personHref(person) : null;
  const messages = thread?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, outgoing.length]);

  // Day dividers between messages from different (Lagos) calendar days.
  const items: ({ type: "day"; label: string; key: string } | { type: "msg"; m: ThreadMessage } | { type: "out"; m: OutgoingMessage })[] = [];
  let lastDay = "";
  for (const m of messages) {
    const day = platformISODate(m.createdAtMs);
    if (day !== lastDay && nowMs > 0) items.push({ type: "day", label: relativeDay(m.createdAtMs, nowMs), key: `d-${day}` });
    lastDay = day;
    items.push({ type: "msg", m });
  }
  for (const m of outgoing) items.push({ type: "out", m });

  return (
    <>
      <div className="flex items-center gap-3 border-b border-ensena-border p-4">
        <button type="button" aria-label="Back to Messages" onClick={onBack} className="text-ensena-ink lg:hidden">
          <ArrowLeft className="size-5" />
        </button>
        <PersonAvatar name={person?.name ?? titleOf(c)} image={person?.image ?? null} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ensena-ink">{titleOf(c)}</p>
          <p className="truncate text-xs text-ensena-muted">{[roleLabel(person?.role ?? ""), c.contextLabel].filter((v, i, a) => v && a.indexOf(v) === i).join(" · ")}</p>
        </div>
        {c.nextLessonId && (
          <Link href={variant.lessonHref(c.nextLessonId)} className="hidden h-9 shrink-0 items-center rounded-full border border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5 sm:flex">
            View next class
          </Link>
        )}
        <div className="relative">
          <button type="button" aria-label="Conversation options" onClick={() => setMenuOpen((v) => !v)} className="flex size-9 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
            <MoreVertical className="size-4.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
              {personLink && (
                <Link href={personLink.href} className="block rounded-lg px-3 py-2 text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                  {personLink.label}
                </Link>
              )}
              {c.nextLessonId && (
                <Link href={variant.lessonHref(c.nextLessonId)} className="block rounded-lg px-3 py-2 text-sm text-ensena-ink hover:bg-ensena-bg-soft sm:hidden">
                  View next class
                </Link>
              )}
              <button type="button" onClick={() => { setMenuOpen(false); onToggleFlag("pinned"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                {c.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />} {c.pinned ? "Unpin" : "Pin to top"}
              </button>
              <button type="button" onClick={() => { setMenuOpen(false); onToggleFlag("archived"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                {c.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />} {c.archived ? "Move to inbox" : "Archive"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!thread ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-ensena-muted">
            <Loader2 className="size-4 animate-spin" /> Loading messages…
          </p>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm text-ensena-muted">No messages yet. Introduce yourself and tell {person?.name.split(" ")[0] ?? "them"} what you&apos;d like help with.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((item) => {
              if (item.type === "day") {
                return (
                  <div key={item.key} className="my-2 flex justify-center">
                    <span className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-muted">{item.label}</span>
                  </div>
                );
              }
              if (item.type === "out") {
                return (
                  <div key={item.m.clientId} className="flex flex-col items-end opacity-70">
                    {item.m.files.length > 0 && <p className="mb-1 text-xs text-ensena-muted">📎 {item.m.files.map((f) => f.name).join(", ")}</p>}
                    {item.m.body && <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-ensena-primary/10 px-3.5 py-2.5 text-sm text-ensena-ink sm:max-w-[70%]">{item.m.body}</div>}
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ensena-muted">
                      <Loader2 className="size-3 animate-spin" /> Sending…
                    </p>
                  </div>
                );
              }
              const m = item.m;
              const mine = m.senderId === selfId;
              const sender = c.others.find((o) => o.id === m.senderId);
              const read = mine && thread.othersLastReadAtMs !== null && thread.othersLastReadAtMs >= m.createdAtMs;
              return (
                <div key={m.id}>
                  {m.dividerLabel && (
                    <div className="my-2 flex justify-center">
                      <span className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-muted">{m.dividerLabel}</span>
                    </div>
                  )}
                  <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                    {!mine && c.others.length > 1 && sender && <p className="mb-0.5 text-[11px] font-medium text-ensena-muted">{sender.name}</p>}
                    {m.attachments.length > 0 && (
                      <div className={cn("mb-1 flex flex-wrap gap-2", mine && "justify-end")}>
                        {m.attachments.map((a) => (
                          <AttachmentView key={a.id} a={a} mine={mine} />
                        ))}
                      </div>
                    )}
                    {m.body && (
                      <div className={cn("max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm text-ensena-ink sm:max-w-[70%]", mine ? "bg-ensena-primary/10" : "bg-ensena-bg-soft")}>{m.body}</div>
                    )}
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-ensena-muted">
                      {formatTime(m.createdAtMs)}
                      {mine && <span className={read ? "text-ensena-primary" : ""}>{read ? "✓✓ Read" : "✓ Sent"}</span>}
                    </p>
                    {m.reaction && <span className="mt-1 rounded-full border border-ensena-border bg-ensena-surface px-2 py-0.5 text-xs">{m.reaction}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <Composer conversationId={c.id} onSend={onSend} />
    </>
  );
}

function Composer({ conversationId, onSend }: { conversationId: string; onSend: (body: string, files: PendingFile[]) => Promise<boolean> }) {
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploading = files.some((f) => f.status === "uploading");
  const ready = files.filter((f) => f.status === "ready");
  const canSend = !sending && !uploading && (draft.trim().length > 0 || ready.length > 0);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const supabase = getSupabaseBrowserClient();
    for (const file of Array.from(list).slice(0, 5 - files.length)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: that file type isn't supported. Use images, PDFs, Office documents, text or CSV.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 25 MB.`);
        continue;
      }
      const key = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(-120);
      const path = `${conversationId}/${key}-${safeName}`;
      setFiles((prev) => [...prev, { key, file, status: "uploading" }]);
      // RLS on storage only allows uploads into conversations you're part of.
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, status: error ? "failed" : "ready", path: error ? undefined : path } : f)));
      if (error) toast.error(`${file.name} couldn't be uploaded.`);
    }
  }

  async function removeFile(f: PendingFile) {
    setFiles((prev) => prev.filter((x) => x.key !== f.key));
    if (f.path) await getSupabaseBrowserClient().storage.from(BUCKET).remove([f.path]);
  }

  async function submit() {
    if (!canSend) return;
    setSending(true);
    const body = draft;
    const toSend = ready;
    setDraft("");
    setFiles([]);
    const ok = await onSend(body, toSend);
    if (!ok) {
      setDraft(body);
      setFiles(toSend);
    }
    setSending(false);
    textareaRef.current?.focus();
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + emoji + draft.slice(end));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  return (
    <div className="border-t border-ensena-border p-3">
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <span key={f.key} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", f.status === "failed" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-ensena-border bg-ensena-bg-soft text-ensena-ink")}>
              {f.status === "uploading" ? <Loader2 className="size-3 animate-spin" /> : <Paperclip className="size-3" />}
              <span className="max-w-40 truncate">{f.file.name}</span>
              <button type="button" aria-label={`Remove ${f.file.name}`} onClick={() => void removeFile(f)} className="text-ensena-muted hover:text-rose-600">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative flex items-end gap-2">
        <button type="button" aria-label="Attach a file" onClick={() => fileInputRef.current?.click()} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <Paperclip className="size-4.5" />
        </button>
        <input ref={fileInputRef} type="file" multiple accept={ALLOWED_TYPES.join(",")} className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
        <button type="button" aria-label="Add emoji" onClick={() => setEmojiOpen((v) => !v)} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <Smile className="size-4.5" />
        </button>
        {emojiOpen && (
          <div className="absolute bottom-12 left-0 z-30">
            <EmojiPicker onSelect={insertEmoji} onClose={() => setEmojiOpen(false)} />
          </div>
        )}
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Type a message…"
          aria-label="Message"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-ensena-border bg-ensena-surface px-3.5 py-2.5 text-sm text-ensena-ink outline-none placeholder:text-ensena-muted focus:border-ensena-primary/50"
        />
        <button type="button" aria-label="Send" disabled={!canSend} onClick={() => void submit()} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white disabled:opacity-40">
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-ensena-muted">Keep contact details and payments on Ensena. Messages sharing phone numbers, emails or outside links are blocked.</p>
    </div>
  );
}
