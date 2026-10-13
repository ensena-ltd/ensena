"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MoreVertical, Search, Users2 } from "lucide-react";

import { MessageAttachmentView } from "@/components/shared/messages/message-attachment";
import { MessageComposer } from "@/components/shared/messages/message-composer";
import { CounterOfferModal } from "@/components/shared/offers/counter-offer-modal";
import { OfferMessageCard } from "@/components/shared/offers/offer-message-card";
import { useStudentMessages } from "@/hooks/use-messages";
import { buildBookingReference } from "@/lib/booking-reference";
import { discoverySessions } from "@/lib/discovery-sessions-data";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import { markStudentConversationRead, respondToOffer, sendStudentMessage } from "@/lib/messages-store";
import type { Offer } from "@/lib/offers-data";
import {
  dashboardStudent,
  initialStudentConversations,
  studentGroupClasses,
  studentLessons,
  studentTutorConversationId,
  type StudentChatMessage,
  type StudentConversation,
} from "@/lib/student-dashboard-data";
import { slugify } from "@/lib/tutors";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

interface BookingAction {
  actionLabel: string;
  href?: string;
  bookingId: string;
  bookingIdLabel: string;
  classLine?: string;
}

function bookingActionFor(conv: StudentConversation): BookingAction | null {
  if (!conv.booking) return null;
  const { type, seedId } = conv.booking;
  if (type === "private") {
    const lesson = studentLessons.find((l) => l.id === seedId);
    return {
      actionLabel: "View Class",
      href: `/student-dashboard/lessons/class/${seedId}`,
      bookingId: buildBookingReference("private", seedId),
      bookingIdLabel: "Booking ID",
      classLine: lesson ? `${lesson.subject} · Private Class` : undefined,
    };
  }
  if (type === "group") {
    const cls = studentGroupClasses.find((c) => c.id === seedId);
    return {
      actionLabel: "View Group Class",
      href: `/student-dashboard/group-classes/${seedId}`,
      bookingId: buildBookingReference("group", seedId),
      bookingIdLabel: "Group Class ID",
      classLine: cls ? `${cls.title} · Group Class` : undefined,
    };
  }
  if (type === "discovery") {
    const d = discoverySessions.find((s) => s.id === seedId);
    return {
      actionLabel: "View Appointment",
      href: `/student-dashboard/lessons/class/${seedId}`,
      bookingId: d?.bookingReference ?? buildBookingReference("discovery", seedId),
      bookingIdLabel: "Booking ID",
      classLine: d ? `${d.subject} · Discovery Session` : undefined,
    };
  }
  // counselling — no dedicated appointment page exists yet, so just surface the real Booking ID.
  return {
    actionLabel: "",
    bookingId: buildBookingReference("counselling", seedId),
    bookingIdLabel: "Booking ID",
    classLine: "Academic Support",
  };
}

function ConversationAvatar({ conv, size = "md" }: { conv: StudentConversation; size?: "md" | "lg" }) {
  const dims = size === "lg" ? "size-14" : "size-11";
  if (conv.kind === "Group Class") {
    return (
      <span className={cn("relative flex shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600", dims)}>
        <Users2 className={size === "lg" ? "size-6" : "size-5"} />
      </span>
    );
  }
  if (conv.image) {
    return (
      <div className={cn("relative shrink-0 overflow-hidden rounded-full", dims)}>
        <Image src={conv.image} alt={conv.name} fill sizes="56px" className="object-cover" />
        {conv.online && <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-emerald-500" />}
      </div>
    );
  }
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary", dims)}>
      {initials(conv.name)}
    </span>
  );
}

function contextLine(conv: StudentConversation): string {
  return `${conv.kind} · ${conv.contextLabel}`;
}

// Mirrors the tutor dashboard's own resolveInitialMessagesState exactly: a
// `?tutor=` arriving for a tutor with no seed conversation gets a real,
// freshly-synthesized one instead of silently landing on the wrong (first)
// thread. The synthesized id (studentTutorConversationId) is the same
// deterministic scheme MessageTutorModal uses, so a conversation started
// from a tutor's profile page and one opened here for the same tutor are
// the same real thread, never two orphaned ones.
function resolveInitialStudentMessagesState(tutorParam: string | null): { conversations: StudentConversation[]; activeId: string } {
  if (!tutorParam) return { conversations: initialStudentConversations, activeId: initialStudentConversations[0].id };

  const normalized = tutorParam.toLowerCase();
  const match = initialStudentConversations.find((c) => c.name.toLowerCase() === normalized);
  if (match) return { conversations: initialStudentConversations, activeId: match.id };

  const synthesized: StudentConversation = {
    id: studentTutorConversationId(slugify(tutorParam)),
    name: tutorParam,
    kind: "Private Tutor",
    contextLabel: "New conversation",
    lastMessage: "Start the conversation…",
    time: "Now",
    unread: 0,
    pinned: false,
    archived: false,
  };
  return { conversations: [synthesized, ...initialStudentConversations], activeId: synthesized.id };
}

export function StudentMessagesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorParam = searchParams.get("tutor");

  const initialState = useMemo(() => resolveInitialStudentMessagesState(tutorParam), [tutorParam]);
  const initialActiveId = initialState.activeId;

  const [conversations, setConversations] = useState<StudentConversation[]>(initialState.conversations);
  const messages = useStudentMessages();
  // Real, derived unread count — the other party's messages in this
  // conversation that aren't marked read yet (see markStudentConversationRead).
  // Computed from the same reactive `messages` array driving re-renders,
  // not the conversation's own static `unread` seed field, which is never
  // written to after this point.
  function unreadFor(convId: string): number {
    return messages.filter((m) => m.convId === convId && m.sender !== "student" && !m.read).length;
  }
  const [activeId, setActiveId] = useState(initialActiveId);
  const [mobileView, setMobileView] = useState<"list" | "chat">(tutorParam ? "chat" : "list");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [blockedToast, setBlockedToast] = useState<string | null>(null);
  const [counterOfferFor, setCounterOfferFor] = useState<Offer | null>(null);

  function flashBlocked(message: string) {
    setBlockedToast(message);
    setTimeout(() => setBlockedToast((cur) => (cur === message ? null : cur)), 4000);
  }

  const filteredConversations = useMemo(() => {
    const sorted = [...conversations].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    return sorted.filter((c) => !query.trim() || c.name.toLowerCase().includes(query.toLowerCase()));
  }, [conversations, query]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const activeMessages = messages.filter((m) => m.convId === activeId);
  const booking = bookingActionFor(activeConversation);

  // The conversation the page opens on is, from the student's point of
  // view, being "opened" just as much as one picked by hand — marked read
  // once, on mount, the same way selectConversation does for every
  // subsequent pick.
  useEffect(() => {
    markStudentConversationRead(initialActiveId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectConversation(id: string) {
    setActiveId(id);
    markStudentConversationRead(id);
    setMobileView("chat");
  }

  function doSendMessage(text: string, attachments: MessageAttachment[] = [], clientId?: string): boolean {
    const result = sendStudentMessage(activeId, dashboardStudent.name, text, {
      clientId,
      attachments: attachments.length ? attachments : undefined,
    });
    if (!result.ok) {
      flashBlocked(result.userMessage);
      return false;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, lastMessage: text || "Sent an attachment", time: "Just now" } : c))
    );
    return true;
  }

  // One id per send *attempt* (regenerated after each successful send, not
  // per keystroke) — a double-tap on Send while this exact draft is still
  // in flight reuses the same id, so the store recognizes the retry
  // instead of creating a second message.
  const [sendAttemptId, setSendAttemptId] = useState(() => crypto.randomUUID());

  function handleComposerSend(text: string, attachments: MessageAttachment[]): boolean {
    const sent = doSendMessage(text, attachments, sendAttemptId);
    if (sent) setSendAttemptId(crypto.randomUUID());
    return sent;
  }

  function acceptOffer(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.offer) return;
    // Re-checked here, in the store, against the offer's real 24-hour
    // expiration — not just whatever the Accept button happened to be
    // showing when this was clicked.
    const result = respondToOffer(messageId, (o) => ({ ...o, status: "Accepted" }), "student");
    if (!result.ok) {
      flashBlocked(result.reason === "expired" ? "This offer has expired. Ask your tutor to send a new one." : "This offer could not be found.");
      return;
    }
    if (msg.offer.bookingKind === "group-class" && msg.offer.groupClassSlug) {
      router.push(`/group-classes/${msg.offer.groupClassSlug}`);
      return;
    }
    const path = msg.offer.bookingKind === "discovery" ? "discovery-session" : "book";
    router.push(`/find-teachers/${msg.offer.tutorSlug}/${path}?offerId=${msg.offer.id}`);
  }

  function declineOffer(messageId: string) {
    respondToOffer(messageId, (o) => ({ ...o, status: "Declined" }), "student");
  }

  function withdrawRequest(messageId: string) {
    respondToOffer(messageId, (o) => ({ ...o, status: "Withdrawn" }), "student");
  }

  function requestRenew(messageId: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.offer) return;
    doSendMessage(`Hi ${msg.offer.tutorName.split(" ")[0]}, could you send that offer again? It expired.`);
  }

  function sendCounterOffer(updated: Offer) {
    const result = respondToOffer(updated.id, () => updated, "student");
    if (!result.ok) {
      flashBlocked("This offer has expired and can no longer be countered.");
      setCounterOfferFor(null);
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: "Sent a counter-offer", time: "Just now" } : c)));
    setCounterOfferFor(null);
  }

  function renderMessage(m: StudentChatMessage) {
    return (
      <div key={m.id}>
        {m.dividerLabel && (
          <div className="my-3 flex items-center justify-center">
            <span className="rounded-full bg-ensena-bg-soft px-3 py-1 text-xs font-medium text-ensena-muted">{m.dividerLabel}</span>
          </div>
        )}
        {m.offer ? (
          <div className={cn("flex", m.sender === "student" ? "justify-end" : "justify-start")}>
            <OfferMessageCard
              offer={m.offer}
              viewerRole="student"
              onAccept={() => acceptOffer(m.id)}
              onDecline={() => declineOffer(m.id)}
              onRequestRenew={() => requestRenew(m.id)}
              onWithdraw={() => withdrawRequest(m.id)}
              onCounter={() => setCounterOfferFor(m.offer ?? null)}
            />
          </div>
        ) : (
          <div className={cn("flex flex-col", m.sender === "student" ? "items-end" : "items-start")}>
            {m.attachments && m.attachments.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-2">
                {m.attachments.map((a) => (
                  <MessageAttachmentView key={a.id} attachment={a} />
                ))}
              </div>
            )}
            {m.text && (
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[70%]",
                  m.sender === "student" ? "bg-ensena-primary/10 text-ensena-ink" : "bg-ensena-bg-soft text-ensena-ink"
                )}
              >
                <p>{m.text}</p>
                <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-ensena-muted">
                  {m.time}
                  {m.sender === "student" && m.read && <span className="text-ensena-primary">✓✓</span>}
                </p>
              </div>
            )}
            {m.reaction && <span className="mt-1 rounded-full border border-ensena-border bg-ensena-surface px-2 py-0.5 text-xs">{m.reaction}</span>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Desktop: two-column layout, never swapped for mobile */}
      <div className="hidden h-[calc(100vh-8rem)] gap-4 lg:flex">
        <div className="flex w-80 shrink-0 flex-col rounded-2xl border border-ensena-border bg-ensena-surface xl:w-96">
          <div className="p-4">
            <h1 className="font-heading text-xl font-semibold text-ensena-ink">Messages</h1>
            <p className="mt-1 text-xs text-ensena-muted">Stay connected with your tutors and Ensena.</p>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="h-10 w-full rounded-full border border-ensena-border pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto border-t border-ensena-border">
            {filteredConversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-ensena-border px-4 py-3.5 text-left",
                    activeId === c.id ? "bg-ensena-primary/5" : "hover:bg-ensena-bg-soft/60"
                  )}
                >
                  <ConversationAvatar conv={c} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ensena-ink">{c.name}</p>
                      <span className="shrink-0 text-[11px] text-ensena-muted">{c.time}</span>
                    </div>
                    <p className="truncate text-xs text-ensena-muted">{contextLine(c)}</p>
                    <p className="mt-0.5 truncate text-xs text-ensena-muted">{c.lastMessage}</p>
                  </div>
                  {unreadFor(c.id) > 0 && (
                    <span className="mt-1 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                      {unreadFor(c.id)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {filteredConversations.length === 0 && <p className="p-4 text-center text-sm text-ensena-muted">No conversations here.</p>}
          </ul>
        </div>

        <div className="flex flex-1 flex-col rounded-2xl border border-ensena-border bg-ensena-surface">
          <div className="flex items-center justify-between border-b border-ensena-border p-4">
            <div className="flex items-center gap-3">
              <ConversationAvatar conv={activeConversation} />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{activeConversation.name}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  {contextLine(activeConversation)}
                  {activeConversation.online && (
                    <span className="ml-1 flex items-center gap-1 text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> Online</span>
                  )}
                </p>
              </div>
            </div>
            {booking?.href && booking.actionLabel && (
              <Link href={booking.href} className="flex h-9 shrink-0 items-center justify-center rounded-full border border-ensena-primary px-4 text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                {booking.actionLabel}
              </Link>
            )}
          </div>

          {booking?.classLine && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ensena-border bg-ensena-bg-soft/60 px-4 py-2.5 text-xs text-ensena-muted">
              <span>{booking.classLine}</span>
              <span className="flex items-center gap-1.5">
                {booking.bookingIdLabel}: <span className="font-mono font-semibold text-ensena-ink">{booking.bookingId}</span>
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-3">{activeMessages.map(renderMessage)}</div>
          </div>

          <div className="border-t border-ensena-border">
            <MessageComposer draft={draft} onDraftChange={setDraft} onSend={handleComposerSend} actorName={dashboardStudent.name} actorRole="Student" actorEmail={dashboardStudent.email} />
          </div>
        </div>
      </div>

      {/* Mobile: two-screen pattern — inbox list, or a full-screen chat, never side-by-side */}
      <div className="lg:hidden">
        {mobileView === "list" ? (
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Messages</h1>
            <p className="mt-1 text-sm text-ensena-muted">Stay connected with your tutors and Ensena.</p>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="h-11 w-full rounded-full border border-ensena-border pl-10 pr-4 text-sm"
              />
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-ensena-border rounded-2xl border border-ensena-border bg-ensena-surface">
              {filteredConversations.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => selectConversation(c.id)} className="flex w-full items-start gap-3 p-4 text-left">
                    <ConversationAvatar conv={c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{c.name}</p>
                        <span className="shrink-0 text-[11px] text-ensena-muted">{c.time}</span>
                      </div>
                      <p className="truncate text-xs text-ensena-muted">{contextLine(c)}</p>
                      <p className="mt-0.5 truncate text-sm text-ensena-muted">{c.lastMessage}</p>
                    </div>
                    {unreadFor(c.id) > 0 && (
                      <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-[11px] font-semibold text-white">
                        {unreadFor(c.id)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {filteredConversations.length === 0 && <p className="p-4 text-center text-sm text-ensena-muted">No conversations here.</p>}
            </ul>
          </div>
        ) : (
          <div className="fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col bg-white">
            <div className="flex items-center gap-3 border-b border-ensena-border p-4">
              <button type="button" aria-label="Back to Messages" onClick={() => setMobileView("list")} className="text-ensena-ink">
                <ArrowLeft className="size-5" />
              </button>
              <ConversationAvatar conv={activeConversation} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{activeConversation.name}</p>
                <p className="flex items-center gap-1 text-xs text-ensena-muted">
                  {contextLine(activeConversation)}
                  {activeConversation.online && (
                    <span className="ml-1 flex items-center gap-1 text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> Online</span>
                  )}
                </p>
              </div>
              {activeConversation.kind === "Private Tutor" && (
                <button
                  type="button"
                  aria-label="View tutor profile"
                  onClick={() => router.push(`/find-teachers/${slugify(activeConversation.name)}`)}
                  className="text-ensena-muted"
                >
                  <MoreVertical className="size-5" />
                </button>
              )}
            </div>

            {booking?.classLine && (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ensena-border bg-ensena-bg-soft/60 px-4 py-2.5 text-xs text-ensena-muted">
                <div>
                  <p>{booking.classLine}</p>
                  <p className="mt-0.5">
                    {booking.bookingIdLabel}: <span className="font-mono font-semibold text-ensena-ink">{booking.bookingId}</span>
                  </p>
                </div>
                {booking.href && booking.actionLabel && (
                  <Link href={booking.href} className="flex h-8 shrink-0 items-center justify-center rounded-full border border-ensena-primary px-3.5 text-xs font-semibold text-ensena-primary">
                    {booking.actionLabel}
                  </Link>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-3">{activeMessages.map(renderMessage)}</div>
            </div>

            <div className="border-t border-ensena-border">
              <MessageComposer draft={draft} onDraftChange={setDraft} onSend={handleComposerSend} actorName={dashboardStudent.name} actorRole="Student" actorEmail={dashboardStudent.email} compact />
            </div>
          </div>
        )}
      </div>

      <CounterOfferModal
        key={`counter-${counterOfferFor?.id ?? "none"}`}
        open={counterOfferFor !== null}
        offer={counterOfferFor}
        viewerRole="student"
        onClose={() => setCounterOfferFor(null)}
        onSend={sendCounterOffer}
      />

      {blockedToast && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-2xl bg-ensena-ink px-4 py-3 text-center text-sm text-white shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
          <p className="font-semibold">Message not sent</p>
          <p className="mt-0.5 text-xs text-white/80">{blockedToast}</p>
        </div>
      )}
    </div>
  );
}
