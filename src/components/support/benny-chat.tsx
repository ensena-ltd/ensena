"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Loader2, MessageCircle, Paperclip, SendHorizontal, X } from "lucide-react";

import { fetchBennyChat, sendBennyMessage } from "@/lib/actions/support";
import { bennyHiddenOn, OPEN_BENNY_EVENT } from "@/lib/benny";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SUPPORT_EMAIL } from "@/lib/support-data";
import type { BennyChat } from "@/lib/support-server";
import { uploadSupportFiles } from "@/lib/support-uploads";
import { cn } from "@/lib/utils";

// Benny — the live-chat bubble. Every conversation is a real support
// request (source "Live Chat") answered by the team from Admin → Support;
// this widget only sends messages and polls for replies: every 5 seconds
// while open, every 30 seconds while closed (for the unread badge), and
// not at all while the tab is in the background.

const GUEST_KEY = "ensena_benny_guest";
const SEEN_KEY = "ensena_benny_seen";
const OPEN_POLL_MS = 5_000;
const CLOSED_POLL_MS = 30_000;
const TOPICS = ["Booking a lesson", "Payments & refunds", "My account", "Something isn't working"];

interface GuestInfo {
  token: string;
  name?: string;
  email?: string;
}

function readGuest(): GuestInfo {
  try {
    const saved = JSON.parse(window.localStorage.getItem(GUEST_KEY) ?? "null") as GuestInfo | null;
    if (saved?.token) return saved;
  } catch {
    // Storage blocked or bad JSON — start fresh.
  }
  const fresh = { token: crypto.randomUUID() };
  saveGuest(fresh);
  return fresh;
}

function saveGuest(info: GuestInfo) {
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(info));
  } catch {
    // Not saved — the chat still works for this visit.
  }
}

function readSeen(): string {
  try {
    return window.localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

function BennyAvatar({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-ensena-primary font-heading font-semibold text-white ring-2 ring-white", className)}>
      B
    </span>
  );
}

export function BennyChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<BennyChat | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Browser-only values; the panel starts closed, so server and client render the same.
  const [guest, setGuest] = useState<GuestInfo | null>(() => (typeof window === "undefined" ? null : readGuest()));
  const [guestName, setGuestName] = useState(() => guest?.name ?? "");
  const [guestEmail, setGuestEmail] = useState(() => guest?.email ?? "");
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seen, setSeen] = useState(() => (typeof window === "undefined" ? "" : readSeen()));
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hidden = bennyHiddenOn(pathname) || !isSupabaseConfigured();

  const refresh = useCallback(async () => {
    if (!guest) return;
    try {
      const result = await fetchBennyChat(guest.token);
      setSignedIn(result.signedIn);
      setChat(result.chat);
    } catch {
      // Offline or server busy — the next poll tries again.
    }
  }, [guest]);

  // Polling: fast while open, slow while closed, paused in background tabs.
  useEffect(() => {
    if (hidden || !guest) return;
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, open ? OPEN_POLL_MS : CLOSED_POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hidden, guest, open, refresh]);

  const messages = chat?.messages ?? [];
  const lastStaffAt = [...messages].reverse().find((m) => m.author === "staff")?.atISO ?? "";
  const unread = open ? 0 : messages.filter((m) => m.author === "staff" && m.atISO > seen).length;

  // Opening or closing the panel marks every staff reply so far as read.
  const toggle = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (lastStaffAt && lastStaffAt > seen) {
        setSeen(lastStaffAt);
        try {
          window.localStorage.setItem(SEEN_KEY, lastStaffAt);
        } catch {
          // Badge just resets next visit.
        }
      }
    },
    [lastStaffAt, seen]
  );

  useEffect(() => {
    const onOpen = () => toggle(true);
    window.addEventListener(OPEN_BENNY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BENNY_EVENT, onOpen);
  }, [toggle]);

  // Keep the newest message in view.
  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [open, messages.length]);

  if (hidden) return null;

  const needsGuestDetails = signedIn === false && !chat;

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Files must be 5MB or smaller.");
    if (files.length >= 5) return setError("You can attach up to 5 files.");
    setError(null);
    setFiles((prev) => [...prev, file]);
  }

  async function send(text = draft) {
    const body = text.trim();
    if ((!body && files.length === 0) || sending || !guest) return;
    if (needsGuestDetails && (!guestName.trim() || !guestEmail.trim())) {
      setError("Please add your name and email so we can reply.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const uploaded = files.length ? await uploadSupportFiles(files, signedIn ? undefined : guest.token) : [];
      const result = await sendBennyMessage({
        text: body,
        attachments: uploaded,
        guestToken: guest.token,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim(),
        page: pathname,
      });
      if (!result.ok) {
        setError(result.message);
      } else {
        setChat(result.chat);
        setDraft("");
        setFiles([]);
        if (!signedIn) {
          const next = { ...guest, name: guestName.trim(), email: guestEmail.trim() };
          setGuest(next);
          saveGuest(next);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your message couldn't be sent. Please try again.");
    }
    setSending(false);
    inputRef.current?.focus();
  }

  const greeting = "Hi! I'm Benny from the Ensena team. Ask us anything about lessons, payments or your account and we'll reply right here.";
  const waitingForTeam = messages.length > 0 && messages[messages.length - 1].author === "user";

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Chat with Benny"
          className="fixed bottom-40 right-4 z-50 flex h-[min(600px,calc(100dvh-11.5rem))] lg:bottom-24 lg:h-[min(600px,calc(100dvh-7.5rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-ensena-border bg-ensena-surface shadow-2xl sm:right-6"
        >
          <header className="relative flex flex-col items-center bg-ensena-primary/10 px-5 pb-5 pt-4 text-center">
            <p className="text-sm font-medium text-ensena-ink">Chat with Benny</p>
            <button type="button" onClick={() => toggle(false)} aria-label="Minimise chat" className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-white/60 hover:text-ensena-ink">
              <ChevronDown className="size-5" />
            </button>
            <BennyAvatar className="mt-3 size-14 text-xl" />
            <p className="mt-2 text-xs text-ensena-muted">We&apos;ll respond as soon as we can.</p>
          </header>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-ensena-bg-soft/60 px-4 py-4">
            <div className="flex flex-col gap-1">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-ensena-surface px-3.5 py-2.5 text-sm text-ensena-ink shadow-sm">{greeting}</div>
              <p className="flex items-center gap-1.5 text-[11px] text-ensena-muted">
                <BennyAvatar className="size-5 text-[10px] ring-0" /> Benny · Ensena
              </p>
            </div>

            {!chat && !needsGuestDetails && signedIn !== null && (
              <div className="flex flex-wrap gap-1.5">
                {TOPICS.map((t) => (
                  <button key={t} type="button" disabled={sending} onClick={() => send(t)} className="rounded-full border border-ensena-primary/30 bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-primary hover:bg-ensena-primary/5">
                    {t}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m) =>
              m.author === "user" ? (
                <div key={m.id} className="flex flex-col items-end gap-1">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-ensena-primary px-3.5 py-2.5 text-sm text-white">
                    {m.text}
                    {m.attachments?.map((a) => (
                      <a key={a.name} href={a.dataUrl || undefined} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-xs underline-offset-2 hover:underline">
                        <Paperclip className="size-3 shrink-0" /> {a.name}
                      </a>
                    ))}
                  </div>
                  <p className="text-[11px] text-ensena-muted">You · {formatTime(m.atISO)}</p>
                </div>
              ) : (
                <div key={m.id} className="flex flex-col gap-1">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-ensena-surface px-3.5 py-2.5 text-sm text-ensena-ink shadow-sm">
                    {m.text}
                    {m.attachments?.map((a) => (
                      <a key={a.name} href={a.dataUrl || undefined} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-ensena-bg-soft px-2 py-1 text-xs text-ensena-primary hover:underline">
                        <Paperclip className="size-3 shrink-0" /> {a.name}
                      </a>
                    ))}
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-ensena-muted">
                    <BennyAvatar className="size-5 text-[10px] ring-0" /> {m.authorName} · Ensena Support · {formatTime(m.atISO)}
                  </p>
                </div>
              )
            )}

            {waitingForTeam && (
              <p className="rounded-xl bg-ensena-surface px-3 py-2 text-center text-[11px] text-ensena-muted">
                Thanks! Someone from our team will reply here soon.{" "}
                {signedIn ? "We'll also send you a notification." : "If you leave, we'll reply by email."}
              </p>
            )}
            {chat?.status === "Resolved" && <p className="text-center text-[11px] text-ensena-muted">This chat was marked resolved. Send a message to reopen it.</p>}
          </div>

          <div className="border-t border-ensena-border bg-ensena-surface p-3">
            {needsGuestDetails && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Your name" autoComplete="name" aria-label="Your name" className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm outline-none focus-visible:border-ensena-primary" />
                <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email" autoComplete="email" aria-label="Email" className="h-9 rounded-lg border border-ensena-border px-2.5 text-sm outline-none focus-visible:border-ensena-primary" />
              </div>
            )}
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="flex items-center gap-1 rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs text-ensena-ink">
                    {f.name}
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {error && <p className="mb-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder="Enter your question or message here"
                aria-label="Message"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl px-1 py-2.5 text-sm outline-none"
              />
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt" onChange={pickFile} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} aria-label="Attach a file" className="flex size-10 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink">
                <Paperclip className="size-4.5" />
              </button>
              <button
                type="button"
                onClick={() => send()}
                disabled={sending || (!draft.trim() && files.length === 0)}
                aria-label="Send message"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-white hover:bg-ensena-primary-hover disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ensena-muted">
              Urgent? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-ensena-primary hover:underline">{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => toggle(!open)}
        aria-label={open ? "Close chat" : unread ? `Chat with Benny, ${unread} new ${unread === 1 ? "reply" : "replies"}` : "Chat with Benny"}
        aria-expanded={open}
        className="fixed bottom-[5.5rem] right-4 z-50 flex size-14 lg:bottom-5 items-center justify-center rounded-full bg-ensena-primary text-white shadow-lg transition-transform hover:scale-105 sm:right-6"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-rose-600 text-[11px] font-semibold text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
    </>
  );
}
