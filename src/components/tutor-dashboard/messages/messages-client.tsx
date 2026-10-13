"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  Search,
  Send,
  ShieldAlert,
  Star,
  Tag,
  Users2,
  Video,
} from "lucide-react";

import { TutorTopBar } from "@/components/tutor-dashboard/tutor-top-bar";
import { MessageAttachmentView } from "@/components/shared/messages/message-attachment";
import { MessageComposer } from "@/components/shared/messages/message-composer";
import { CounterOfferModal } from "@/components/shared/offers/counter-offer-modal";
import { OfferMessageCard } from "@/components/shared/offers/offer-message-card";
import { SendOfferModal } from "@/components/tutor-dashboard/messages/send-offer-modal";
import { SuggestChangesModal } from "@/components/tutor-dashboard/messages/suggest-changes-modal";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTutorMessages } from "@/hooks/use-messages";
import type { MessageAttachment } from "@/lib/message-attachment-types";
import { appendTutorMessage, markTutorConversationRead, respondToOffer, sendTutorMessage } from "@/lib/messages-store";
import { dashboardStudent, studentTutorConversationId } from "@/lib/student-dashboard-data";
import {
  dashboardTutor,
  findStudentIdByName,
  hourlyRateFor,
  initialConversations,
  type Conversation,
} from "@/lib/tutor-dashboard-data";
import { slugify } from "@/lib/tutors";
import { defaultOfferPolicySettings, totalFinalPrice, type Offer, type OfferKind } from "@/lib/offers-data";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type Tab = "All" | "Unread" | "Starred";
const tabs: Tab[] = ["All", "Unread", "Starred"];

const sizeClasses = { md: "size-11", lg: "size-20" } as const;
const iconSizeClasses = { md: "size-5", lg: "size-8" } as const;

function ConversationAvatar({ conversation, size = "md" }: { conversation: Conversation; size?: "md" | "lg" }) {
  if (conversation.type === "Private Student" || conversation.type === "Discovery Session") {
    return conversation.image ? (
      <div className={cn("relative shrink-0 overflow-hidden rounded-full", sizeClasses[size])}>
        <Image src={conversation.image} alt={conversation.title} fill sizes={size === "lg" ? "80px" : "44px"} className="object-cover" />
      </div>
    ) : (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 font-semibold text-ensena-primary", sizeClasses[size], size === "lg" ? "text-xl" : "text-xs")}>
        {initials(conversation.title)}
      </span>
    );
  }
  const isAlt = conversation.id.charCodeAt(conversation.id.length - 1) % 2 === 0;
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full", sizeClasses[size], isAlt ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700")}>
      {conversation.type === "Group Class" ? <Users2 className={iconSizeClasses[size]} /> : <Calendar className={iconSizeClasses[size]} />}
    </span>
  );
}

function DividerLine({ label }: { label: string }) {
  const isUnread = label.toLowerCase().includes("unread");
  return (
    <div className="my-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-ensena-border" />
      <span className={cn("shrink-0 text-[11px] font-medium", isUnread ? "text-ensena-primary" : "text-ensena-muted")}>{label}</span>
      <div className="h-px flex-1 bg-ensena-border" />
    </div>
  );
}

function RelatedRow({ icon: Icon, tint, title, lines, href }: { icon: typeof BookOpen; tint: string; title: string; lines: string[]; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-ensena-border p-3 hover:bg-ensena-bg-soft">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tint)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ensena-ink">{title}</p>
        {lines.map((l, i) => (
          <p key={i} className="truncate text-xs text-ensena-muted">{l}</p>
        ))}
      </div>
      <ChevronRight className="size-4 shrink-0 text-ensena-muted" />
    </Link>
  );
}

function ActionRow({
  icon: Icon,
  label,
  onClick,
  href,
  danger,
}: {
  icon: typeof Calendar;
  label: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-xl border border-ensena-border p-3 text-left text-sm font-medium hover:bg-ensena-bg-soft",
    danger ? "text-rose-600" : "text-ensena-ink"
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        <Icon className="size-4" /> {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="size-4" /> {label}
    </button>
  );
}

// Several other pages (student profile, private lessons, group class
// detail, discovery sessions, offers) link here with `?student=` or
// `?class=` expecting that specific conversation to open. Most of those
// names aren't part of the curated 7-conversation demo list this page
// matches to the mockup, so a non-matching name gets a fresh, real
// conversation synthesized on the spot rather than silently landing on the
// wrong (or first) thread — every existing link still does something
// correct, not just something that doesn't crash.
function resolveInitialMessagesState(studentParam: string | null, classParam: string | null): { conversations: Conversation[]; activeId: string } {
  const targetName = studentParam ?? classParam;
  if (!targetName) return { conversations: initialConversations, activeId: initialConversations[0].id };

  const normalized = targetName.toLowerCase();
  const match = initialConversations.find((c) => c.title.toLowerCase() === normalized || c.studentName?.toLowerCase() === normalized);

  let list = initialConversations;
  let activeId = match?.id;
  if (!match) {
    // The one real, reciprocal pairing this demo can actually exercise on
    // both sides is Tunde (dashboardTutor) <-> Cynthia (dashboardStudent) —
    // so a fresh conversation with exactly that student reuses the SAME
    // deterministic id the student side already synthesizes
    // (studentTutorConversationId), rather than the c-synth-* scheme used
    // for every other (student-side-only) name. Without this, a message
    // sent from the student's "message this tutor" entry point would mirror
    // into the tutor's own message store under a convId this page would
    // never look for, and silently never appear here.
    const isRealStudent = studentParam?.toLowerCase() === dashboardStudent.name.toLowerCase();
    const synthesized: Conversation = classParam
      ? { id: `c-synth-${slugify(classParam)}`, type: "Group Class", title: classParam, subtitle: "Group Class", lastMessage: "Start the conversation…", time: "Now", unread: 0, starred: false }
      : {
          id: isRealStudent ? studentTutorConversationId(dashboardTutor.slug) : `c-synth-${slugify(studentParam ?? "")}`,
          type: "Private Student",
          title: studentParam ?? "",
          subtitle: "Private Student",
          lastMessage: "Start the conversation…",
          time: "Now",
          unread: 0,
          starred: false,
          studentName: studentParam ?? "",
        };
    list = [synthesized, ...initialConversations];
    activeId = synthesized.id;
  }

  return { conversations: list.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)), activeId: activeId! };
}

function CollapsibleSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ensena-border">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-ensena-ink">
        {title} <ChevronDown className={cn("size-4 text-ensena-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-2 border-t border-ensena-border p-3">{children}</div>}
    </div>
  );
}

// One chronological inbox — no separate Private Student / Group Class /
// Discovery Session tabs (deliberate MVP decision). Each conversation just
// carries a `type` and a subtitle so the list stays scannable; the
// Conversation Details panel (desktop: always-visible right column,
// mobile: collapsible sections under the chat) surfaces whatever's
// relevant to that specific person or class.
export function MessagesClient() {
  const searchParams = useSearchParams();
  const studentParam = searchParams.get("student");
  const classParam = searchParams.get("class");

  const [conversations, setConversations] = useState<Conversation[]>(() => resolveInitialMessagesState(studentParam, classParam).conversations);
  const messages = useTutorMessages();
  const [activeId, setActiveId] = useState<string>(() => resolveInitialMessagesState(studentParam, classParam).activeId);
  // The conversation the page opens on is being "opened" just as much as
  // one picked by hand — marked read once, on mount.
  useEffect(() => {
    markTutorConversationRead(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">(() => (studentParam || classParam ? "chat" : "list"));
  const [mobileSection, setMobileSection] = useState<"related" | "actions" | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockedToast, setBlockedToast] = useState<string | null>(null);

  function flashBlocked(message: string) {
    setBlockedToast(message);
    setTimeout(() => setBlockedToast((cur) => (cur === message ? null : cur)), 4000);
  }

  const [offerModalKind, setOfferModalKind] = useState<OfferKind | null>(null);
  const [respondingToMessageId, setRespondingToMessageId] = useState<string | null>(null);
  const [suggestChangesFor, setSuggestChangesFor] = useState<Offer | null>(null);
  const [counterOfferFor, setCounterOfferFor] = useState<Offer | null>(null);

  // Real, derived unread count — the other party's messages in this
  // conversation that aren't marked read yet (see markTutorConversationRead)
  // — replaces the conversation's own static `unread` seed field, which is
  // never written to after this point, everywhere it's read below.
  function unreadFor(convId: string): number {
    return messages.filter((m) => m.convId === convId && m.sender !== "tutor" && !m.read).length;
  }

  const conversationsWithRealUnread = useMemo(
    () => conversations.map((c) => ({ ...c, unread: unreadFor(c.id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, messages]
  );

  const filteredConversations = useMemo(() => {
    return conversationsWithRealUnread.filter((c) => {
      if (tab === "Unread" && c.unread === 0) return false;
      if (tab === "Starred" && !c.starred) return false;
      if (query.trim() && !c.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [conversationsWithRealUnread, tab, query]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? conversations[0];
  const activeMessages = messages.filter((m) => m.convId === activeId);
  const studentId = activeConversation.studentName ? findStudentIdByName(activeConversation.studentName) : undefined;
  const hasRelated = Boolean(activeConversation.related?.privateSession || activeConversation.related?.groupClass || activeConversation.related?.discoverySession);

  function selectConversation(id: string) {
    setActiveId(id);
    markTutorConversationRead(id);
    setMobileView("chat");
    setMobileSection(null);
  }

  function toggleStar(id: string) {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  }

  // One id per send *attempt* (regenerated after each successful send, not
  // per keystroke) — a double-tap on Send while this exact draft is still
  // in flight reuses the same id, so the store recognizes the retry
  // instead of creating a second message.
  const [sendAttemptId, setSendAttemptId] = useState(() => crypto.randomUUID());

  function sendMessage(text: string, attachments: MessageAttachment[] = []): boolean {
    if (!text.trim() && attachments.length === 0) return false;
    const result = sendTutorMessage(activeId, dashboardTutor.name, text, {
      clientId: sendAttemptId,
      attachments: attachments.length ? attachments : undefined,
    });
    if (!result.ok) {
      flashBlocked(result.userMessage);
      return false;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, lastMessage: text || "Sent an attachment", time: "Just now" } : c))
    );
    setSendAttemptId(crypto.randomUUID());
    return true;
  }

  function sendOffer(offer: Offer) {
    const time = "Just now";
    if (respondingToMessageId) {
      respondToOffer(respondingToMessageId, () => offer);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: "Sent a Special Offer", time } : c)));
      setRespondingToMessageId(null);
    } else {
      const summary = offer.kind === "special-offer" ? "Sent a Special Offer" : "Sent a Pre-approval";
      appendTutorMessage({ id: `m-${Date.now()}`, convId: activeId, sender: "tutor", time, read: false, offer });
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: summary, time } : c)));
    }
    setOfferModalKind(null);
  }

  function withdrawOffer(messageId: string) {
    respondToOffer(messageId, (o) => ({ ...o, status: "Withdrawn" }));
  }

  // A fresh, real 24-hour expiration — never a resurrection of the old one.
  function renewOffer(messageId: string) {
    respondToOffer(messageId, (o) => ({
      ...o,
      status: "Sent",
      expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
    }));
  }

  function acceptRequest(messageId: string) {
    respondToOffer(messageId, (offer) => {
      const standardPricePerSession = hourlyRateFor(offer.durationMins, offer.standardPricePerSession);
      return {
        ...offer,
        kind: "pre-approval",
        standardPricePerSession,
        finalPricePerSession: standardPricePerSession,
        discountPct: null,
        discountRequestMessage: undefined,
        status: "Sent",
        expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
      };
    });
  }

  function declineRequest(messageId: string) {
    respondToOffer(messageId, (o) => ({ ...o, status: "Declined" }));
  }

  function declineOffer(messageId: string) {
    respondToOffer(messageId, (o) => ({ ...o, status: "Declined" }));
  }

  // The tutor agreeing to the student's last counter without proposing a
  // different price — recorded as its own history entry (by "tutor", same
  // price) so lastProposalBy flips back to the tutor and the student's card
  // shows Accept & Book next, rather than silently marking it "Accepted"
  // before the student has actually confirmed a booking.
  function acceptCounterOffer(messageId: string) {
    respondToOffer(messageId, (o) => {
      const nowIso = new Date().toISOString();
      return {
        ...o,
        history: [...(o.history ?? []), { price: totalFinalPrice(o), discountPct: o.discountPct, by: "tutor" as const, at: nowIso, note: "Accepted the counter-offer" }],
        status: "Sent",
        expiresAt: new Date(Date.now() + defaultOfferPolicySettings.defaultExpirationHours * 60 * 60 * 1000).toISOString(),
      };
    });
  }

  function sendCounterOffer(updated: Offer) {
    const result = respondToOffer(updated.id, () => updated);
    if (!result.ok) {
      flashBlocked("This offer has expired and can no longer be countered.");
      setCounterOfferFor(null);
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: "Sent a counter-offer", time: "Just now" } : c)));
    setCounterOfferFor(null);
  }

  function openSpecialOfferForRequest(messageId: string) {
    setRespondingToMessageId(messageId);
    setOfferModalKind("special-offer");
  }

  function sendUpdatedProposal(updated: Offer) {
    const result = respondToOffer(updated.id, () => updated);
    if (!result.ok) {
      flashBlocked("This proposal has expired and can no longer be changed.");
      setSuggestChangesFor(null);
      return;
    }
    setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, lastMessage: "Sent an updated proposal", time: "Just now" } : c)));
    setSuggestChangesFor(null);
  }

  function confirmBlock() {
    setConversations((prev) => prev.filter((c) => c.id !== activeId));
    setBlockOpen(false);
    setMobileView("list");
    setActiveId((prev) => conversations.find((c) => c.id !== prev)?.id ?? prev);
  }

  const relatedInfoContent = hasRelated ? (
    <>
      {activeConversation.related?.privateSession && (
        <RelatedRow
          icon={BookOpen}
          tint="bg-violet-100 text-violet-700"
          title="Private Sessions"
          lines={[`Next session: ${activeConversation.related.privateSession.nextLabel}`, `Topic: ${activeConversation.related.privateSession.topic}`]}
          href="/tutor-dashboard/private-lessons?tab=Lessons"
        />
      )}
      {activeConversation.related?.groupClass && (
        <RelatedRow
          icon={Users2}
          tint="bg-amber-100 text-amber-700"
          title="Group Classes"
          lines={[activeConversation.related.groupClass.name, activeConversation.related.groupClass.schedule]}
          href={`/tutor-dashboard/group-classes/${activeConversation.related.groupClass.slug}`}
        />
      )}
      {activeConversation.related?.discoverySession && (
        <RelatedRow
          icon={Calendar}
          tint="bg-emerald-100 text-emerald-700"
          title="Discovery Session"
          lines={[activeConversation.related.discoverySession.statusLabel]}
          href="/tutor-dashboard/private-lessons?tab=Schedule"
        />
      )}
    </>
  ) : (
    <p className="text-sm text-ensena-muted">Nothing to show yet.</p>
  );

  const actionsContent =
    activeConversation.type === "Group Class" ? (
      activeConversation.related?.groupClass ? (
        <ActionRow icon={Users2} label="View Class" href={`/tutor-dashboard/group-classes/${activeConversation.related.groupClass.slug}`} />
      ) : null
    ) : (
      <>
        <ActionRow icon={Calendar} label="Schedule Session" onClick={() => sendMessage(`Hi ${activeConversation.title.split(" ")[0]}, I'd like to schedule our next session. What time works for you?`)} />
        <ActionRow icon={Video} label="Start Discovery Session" href="/tutor-dashboard/private-lessons?tab=Schedule" />
        {activeConversation.type === "Private Student" && <ActionRow icon={ShieldAlert} label="Block Student" danger onClick={() => setBlockOpen(true)} />}
      </>
    );

  return (
    <div>
      <TutorTopBar />

      <div className="hidden lg:block">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Messages</h1>
        <p className="mt-1 text-sm text-ensena-muted">All your conversations in one place.</p>
      </div>

      {/* Desktop: 3-column layout */}
      <div className="mt-5 hidden gap-4 lg:grid lg:h-[calc(100vh-11rem)] lg:grid-cols-[320px_1fr_320px]">
        {/* Conversation list */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-ensena-border bg-ensena-surface">
          <div className="flex items-center gap-2 p-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search messages…"
                className="h-9 w-full rounded-full border border-ensena-border pl-9 pr-3 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-4 border-b border-ensena-border px-4 text-sm">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "border-b-2 pb-2.5 pt-1 font-medium",
                  tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
                )}
              >
                {t}{t === "Unread" ? ` (${conversationsWithRealUnread.filter((c) => c.unread > 0).length})` : ""}
              </button>
            ))}
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filteredConversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectConversation(c.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-ensena-border px-4 py-3.5 text-left",
                    activeId === c.id ? "bg-ensena-bg-soft" : "hover:bg-ensena-bg-soft/60"
                  )}
                >
                  <ConversationAvatar conversation={c} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                      <span className="shrink-0 text-[11px] text-ensena-muted">{c.time}</span>
                    </div>
                    <p className="truncate text-xs text-ensena-muted">{c.subtitle}</p>
                    <p className="mt-0.5 truncate text-xs text-ensena-muted">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">{c.unread}</span>
                  )}
                </button>
              </li>
            ))}
            {filteredConversations.length === 0 && <p className="p-4 text-center text-sm text-ensena-muted">No conversations here.</p>}
          </ul>
        </div>

        {/* Chat panel */}
        <div className="flex min-h-0 flex-col rounded-2xl border border-ensena-border bg-ensena-surface">
          <div className="flex items-center justify-between border-b border-ensena-border p-4">
            <div className="flex items-center gap-2.5">
              <ConversationAvatar conversation={activeConversation} />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{activeConversation.title}</p>
                {activeConversation.online ? (
                  <p className="flex items-center gap-1 text-xs text-ensena-success"><span className="size-1.5 rounded-full bg-ensena-success" /> Online</p>
                ) : (
                  <p className="text-xs text-ensena-muted">{activeConversation.subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => toggleStar(activeConversation.id)} aria-label="Star conversation" className="flex size-9 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                <Star className={cn("size-4", activeConversation.starred && "fill-ensena-primary text-ensena-primary")} />
              </button>
              <div className="relative">
                <button type="button" onClick={() => setHeaderMenuOpen((v) => !v)} aria-label="More options" className="flex size-9 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
                  <MoreVertical className="size-4" />
                </button>
                {headerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                      {activeConversation.type !== "Group Class" && (
                        <>
                          <button type="button" onClick={() => { setOfferModalKind("pre-approval"); setHeaderMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                            <Send className="size-3.5" /> Send Pre-approval
                          </button>
                          <button type="button" onClick={() => { setOfferModalKind("special-offer"); setHeaderMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                            <Tag className="size-3.5" /> Send Special Offer
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col">
              {activeMessages.map((m) => (
                <div key={m.id}>
                  {m.dividerBefore && <DividerLine label={m.dividerBefore} />}
                  {m.offer ? (
                    <div className={cn("mb-3 flex", m.sender === "tutor" ? "justify-end" : "justify-start")}>
                      <OfferMessageCard
                        offer={m.offer}
                        viewerRole="tutor"
                        onWithdraw={() => withdrawOffer(m.id)}
                        onRenew={() => renewOffer(m.id)}
                        onAcceptRequest={() => acceptRequest(m.id)}
                        onSendSpecialOfferForRequest={() => openSpecialOfferForRequest(m.id)}
                        onSuggestChanges={() => setSuggestChangesFor(m.offer ?? null)}
                        onDeclineRequest={() => declineRequest(m.id)}
                        onCounter={() => setCounterOfferFor(m.offer ?? null)}
                        onAcceptCounter={() => acceptCounterOffer(m.id)}
                        onDecline={() => declineOffer(m.id)}
                      />
                    </div>
                  ) : (
                    <div className={cn("mb-3 flex", m.sender === "tutor" ? "justify-end" : "justify-start")}>
                      <div className="max-w-[70%]">
                        {m.studentName && m.sender === "student" && <p className="mb-1 px-1 text-[11px] font-medium text-ensena-muted">{m.studentName}</p>}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mb-1 flex flex-wrap gap-2">
                            {m.attachments.map((a) => (
                              <MessageAttachmentView key={a.id} attachment={a} />
                            ))}
                          </div>
                        )}
                        {(m.text || m.attachment) && (
                          <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm", m.sender === "tutor" ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-ink")}>
                            {m.attachment ? (
                              <div className="flex items-center gap-2">
                                {m.attachment.type === "pdf" && <FileText className="size-4" />}
                                {m.attachment.type === "image" && <ImageIcon className="size-4" />}
                                {m.attachment.type === "voice" && <Mic className="size-4" />}
                                <span className="text-sm">{m.attachment.name}</span>
                              </div>
                            ) : (
                              <p>{m.text}</p>
                            )}
                            <div className={cn("mt-1 flex items-center gap-1 text-[10px]", m.sender === "tutor" ? "text-white/70" : "text-ensena-muted")}>
                              {m.time}
                              {m.sender === "tutor" && (m.read ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-ensena-border">
            <MessageComposer draft={draft} onDraftChange={setDraft} onSend={sendMessage} actorName={dashboardTutor.name} actorRole="Tutor" />
          </div>
        </div>

        {/* Conversation details */}
        <div className="flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-ensena-border bg-ensena-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Conversation Details</p>
          <div className="mt-3 flex flex-col items-center text-center">
            <ConversationAvatar conversation={activeConversation} size="lg" />
            <p className="mt-2 text-sm font-semibold text-ensena-ink">{activeConversation.title}</p>
            <p className="text-xs text-ensena-muted">{activeConversation.subtitle}</p>
            {activeConversation.online && (
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ensena-success"><span className="size-1.5 rounded-full bg-ensena-success" /> Online</p>
            )}
          </div>

          {(activeConversation.level || activeConversation.joinedDate) && (
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              {activeConversation.level && (
                <div className="flex justify-between gap-2"><dt className="text-ensena-muted">Level</dt><dd className="truncate text-ensena-ink">{activeConversation.level}</dd></div>
              )}
              {activeConversation.joinedDate && (
                <div className="flex justify-between gap-2"><dt className="text-ensena-muted">Joined Ensena</dt><dd className="text-ensena-ink">{activeConversation.joinedDate}</dd></div>
              )}
            </dl>
          )}

          {studentId && (
            <Link href={`/tutor-dashboard/students/${studentId}`} className="mt-4 flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
              View Student Profile
            </Link>
          )}

          {hasRelated && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Related Information</p>
              <div className="mt-2 flex flex-col gap-2">{relatedInfoContent}</div>
            </div>
          )}

          {actionsContent && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Actions</p>
              <div className="mt-2 flex flex-col gap-2">{actionsContent}</div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: single column, list <-> chat */}
      <div className="mt-4 lg:hidden">
        {mobileView === "list" ? (
          <div>
            <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Messages</h1>
            <p className="mt-1 text-sm text-ensena-muted">All your conversations in one place.</p>

            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search messages…"
                  className="h-11 w-full rounded-full border border-ensena-border pl-9 pr-3 text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-5 border-b border-ensena-border text-sm">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "border-b-2 pb-2.5 font-medium",
                    tab === t ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted"
                  )}
                >
                  {t}{t === "Unread" ? ` (${conversationsWithRealUnread.filter((c) => c.unread > 0).length})` : ""}
                </button>
              ))}
            </div>

            <ul className="mt-2">
              {filteredConversations.map((c) => (
                <li key={c.id} className={cn("border-b border-ensena-border", c.unread > 0 && "bg-ensena-primary/5")}>
                  <button type="button" onClick={() => selectConversation(c.id)} className="flex w-full items-start gap-3 px-1 py-3.5 text-left">
                    <ConversationAvatar conversation={c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ensena-ink">{c.title}</p>
                        <span className="shrink-0 text-[11px] text-ensena-muted">{c.time}</span>
                      </div>
                      <p className="truncate text-xs text-ensena-muted">{c.subtitle}</p>
                      <p className="mt-0.5 truncate text-sm text-ensena-ink">{c.lastMessage}</p>
                    </div>
                    {c.unread > 0 && (
                      <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">{c.unread}</span>
                    )}
                  </button>
                </li>
              ))}
              {filteredConversations.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No conversations here.</p>}
            </ul>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 border-b border-ensena-border pb-3">
              <button type="button" onClick={() => setMobileView("list")} aria-label="Back to conversations" className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft">
                <ArrowLeft className="size-4.5" />
              </button>
              <ConversationAvatar conversation={activeConversation} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ensena-ink">{activeConversation.title}</p>
                {activeConversation.online ? (
                  <p className="flex items-center gap-1 text-xs text-ensena-success"><span className="size-1.5 rounded-full bg-ensena-success" /> Online</p>
                ) : (
                  <p className="truncate text-xs text-ensena-muted">{activeConversation.subtitle}</p>
                )}
              </div>
              <button type="button" onClick={() => toggleStar(activeConversation.id)} aria-label="Star conversation" className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted">
                <Star className={cn("size-4", activeConversation.starred && "fill-ensena-primary text-ensena-primary")} />
              </button>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setHeaderMenuOpen((v) => !v)} aria-label="More options" className="flex size-9 items-center justify-center rounded-full text-ensena-muted">
                  <MoreVertical className="size-4" />
                </button>
                {headerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setHeaderMenuOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-10 z-20 w-52 rounded-xl border border-ensena-border bg-ensena-surface p-1 shadow-lg">
                      {activeConversation.type !== "Group Class" && (
                        <>
                          <button type="button" onClick={() => { setOfferModalKind("pre-approval"); setHeaderMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                            <Send className="size-3.5" /> Send Pre-approval
                          </button>
                          <button type="button" onClick={() => { setOfferModalKind("special-offer"); setHeaderMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft">
                            <Tag className="size-3.5" /> Send Special Offer
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col py-3">
              {activeMessages.map((m) => (
                <div key={m.id}>
                  {m.dividerBefore && <DividerLine label={m.dividerBefore} />}
                  {m.offer ? (
                    <div className={cn("mb-3 flex", m.sender === "tutor" ? "justify-end" : "justify-start")}>
                      <OfferMessageCard
                        offer={m.offer}
                        viewerRole="tutor"
                        onWithdraw={() => withdrawOffer(m.id)}
                        onRenew={() => renewOffer(m.id)}
                        onAcceptRequest={() => acceptRequest(m.id)}
                        onSendSpecialOfferForRequest={() => openSpecialOfferForRequest(m.id)}
                        onSuggestChanges={() => setSuggestChangesFor(m.offer ?? null)}
                        onDeclineRequest={() => declineRequest(m.id)}
                        onCounter={() => setCounterOfferFor(m.offer ?? null)}
                        onAcceptCounter={() => acceptCounterOffer(m.id)}
                        onDecline={() => declineOffer(m.id)}
                      />
                    </div>
                  ) : (
                    <div className={cn("mb-3 flex", m.sender === "tutor" ? "justify-end" : "justify-start")}>
                      <div className="max-w-[82%]">
                        {m.studentName && m.sender === "student" && <p className="mb-1 px-1 text-[11px] font-medium text-ensena-muted">{m.studentName}</p>}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="mb-1 flex flex-wrap gap-2">
                            {m.attachments.map((a) => (
                              <MessageAttachmentView key={a.id} attachment={a} />
                            ))}
                          </div>
                        )}
                        {(m.text || m.attachment) && (
                          <div className={cn("rounded-2xl px-3.5 py-2.5 text-sm", m.sender === "tutor" ? "bg-ensena-primary text-white" : "bg-ensena-bg-soft text-ensena-ink")}>
                            {m.attachment ? (
                              <div className="flex items-center gap-2">
                                {m.attachment.type === "pdf" && <FileText className="size-4" />}
                                {m.attachment.type === "image" && <ImageIcon className="size-4" />}
                                {m.attachment.type === "voice" && <Mic className="size-4" />}
                                <span className="text-sm">{m.attachment.name}</span>
                              </div>
                            ) : (
                              <p>{m.text}</p>
                            )}
                            <div className={cn("mt-1 flex items-center gap-1 text-[10px]", m.sender === "tutor" ? "text-white/70" : "text-ensena-muted")}>
                              {m.time}
                              {m.sender === "tutor" && (m.read ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t border-ensena-border py-3 pb-24">
              {studentId && (
                <Link href={`/tutor-dashboard/students/${studentId}`} className="flex h-10 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                  View Student Profile
                </Link>
              )}
              <CollapsibleSection title="Related Information" open={mobileSection === "related"} onToggle={() => setMobileSection((v) => (v === "related" ? null : "related"))}>
                {relatedInfoContent}
              </CollapsibleSection>
              {actionsContent && (
                <CollapsibleSection title="Actions" open={mobileSection === "actions"} onToggle={() => setMobileSection((v) => (v === "actions" ? null : "actions"))}>
                  {actionsContent}
                </CollapsibleSection>
              )}
            </div>

            {/* Fixed to the viewport (not the scroll flow) so it always sits
                just above the bottom nav, matching "composer fixed at the
                bottom" — the collapsible sections above scroll underneath it
                instead of colliding with it. */}
            <div className="fixed inset-x-0 bottom-16 z-20 border-t border-ensena-border bg-ensena-surface sm:px-2">
              <MessageComposer draft={draft} onDraftChange={setDraft} onSend={sendMessage} actorName={dashboardTutor.name} actorRole="Tutor" compact />
            </div>
          </div>
        )}
      </div>

      <SendOfferModal
        key={`${offerModalKind ?? "none"}-${respondingToMessageId ?? "new"}`}
        kind={offerModalKind ?? "pre-approval"}
        open={offerModalKind !== null}
        studentName={activeConversation.studentName ?? activeConversation.title}
        conversationId={activeConversation.id}
        tutorName={dashboardTutor.name}
        tutorSlug={slugify(dashboardTutor.name)}
        prefillOffer={respondingToMessageId ? messages.find((m) => m.id === respondingToMessageId)?.offer : undefined}
        onClose={() => { setOfferModalKind(null); setRespondingToMessageId(null); }}
        onSend={sendOffer}
      />

      <SuggestChangesModal
        key={suggestChangesFor?.id ?? "none"}
        open={suggestChangesFor !== null}
        request={suggestChangesFor}
        onClose={() => setSuggestChangesFor(null)}
        onSend={sendUpdatedProposal}
      />

      <CounterOfferModal
        key={`counter-${counterOfferFor?.id ?? "none"}`}
        open={counterOfferFor !== null}
        offer={counterOfferFor}
        viewerRole="tutor"
        onClose={() => setCounterOfferFor(null)}
        onSend={sendCounterOffer}
      />

      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title="Block Student">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            {activeConversation.title} won&apos;t be able to message you or book new sessions. This conversation will be removed from your inbox.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBlockOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmBlock} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Block Student</Button>
          </div>
        </div>
      </Modal>

      {blockedToast && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-2xl bg-ensena-ink px-4 py-3 text-center text-sm text-white shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
          <p className="font-semibold">Message not sent</p>
          <p className="mt-0.5 text-xs text-white/80">{blockedToast}</p>
        </div>
      )}
    </div>
  );
}
