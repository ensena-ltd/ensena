"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Bell, Calendar, Compass, FileText, MessageCircle, MessageSquare, Star, Tag, Wallet } from "lucide-react";
import { toast } from "sonner";

import { fetchMyNotifications, markAllMyNotificationsRead, markMyNotificationRead } from "@/lib/actions/student-notifications";
import type { StudentNotificationRow } from "@/lib/student-notifications-server";
import { cn } from "@/lib/utils";

import { formatShortDate } from "./learning-utils";

// One live copy of the student's notifications for the whole dashboard —
// the mobile top bar's bell, the home page's desktop bell and the
// Notifications page all read and update the same list, so marking one
// read clears it everywhere at once. Refreshed every minute and whenever
// the tab regains focus.

const POLL_MS = 60_000;

interface LiveNotifications {
  notifications: StudentNotificationRow[];
  unreadCount: number;
  nowMs: number;
  /** Marks it read and opens where it points. */
  open: (n: StudentNotificationRow) => void;
  markAllRead: () => void;
}

const Ctx = createContext<LiveNotifications | null>(null);

// Also used by the tutor dashboard (TutorNotificationsProvider below) —
// the rows are just "my notifications"; only the fallback link differs.
export function StudentNotificationsProvider({ initial, fallbackHref = "/student-dashboard/notifications", children }: { initial: StudentNotificationRow[]; fallbackHref?: string; children: ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initial);
  const [nowMs, setNowMs] = useState(0);

  const refresh = useCallback(async () => {
    const next = await fetchMyNotifications().catch(() => null);
    if (next) setNotifications(next);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- wall clock for "2h ago", client-only
    setNowMs(Date.now());
    const clock = setInterval(() => setNowMs(Date.now()), 60_000);
    const poll = setInterval(() => document.visibilityState === "visible" && void refresh(), POLL_MS);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const open = useCallback(
    (n: StudentNotificationRow) => {
      if (n.unread) {
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
        void markMyNotificationRead(n.id);
      }
      router.push(n.actionUrl || fallbackHref);
    },
    [router, fallbackHref]
  );

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((x) => ({ ...x, unread: false })));
    void markAllMyNotificationsRead().then((r) => {
      if (!r.ok) {
        toast.error("Couldn't mark your notifications as read.");
        void refresh();
      }
    });
  }, [refresh]);

  const value = useMemo(
    () => ({ notifications, unreadCount: notifications.filter((n) => n.unread).length, nowMs, open, markAllRead }),
    [notifications, nowMs, open, markAllRead]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function TutorNotificationsProvider({ initial, children }: { initial: StudentNotificationRow[]; children: ReactNode }) {
  return (
    <StudentNotificationsProvider initial={initial} fallbackHref="/tutor-dashboard">
      {children}
    </StudentNotificationsProvider>
  );
}

/** The live notifications, or null outside a signed-in student dashboard (demo mode). */
export function useLiveNotifications(): LiveNotifications | null {
  return useContext(Ctx);
}

export function notificationTimeAgo(ms: number, nowMs: number): string {
  if (!nowMs) return "";
  const mins = Math.max(0, Math.round((nowMs - ms) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : formatShortDate(ms);
}

const FILTERS = ["All", "Booking", "Assignment", "Message", "Payment", "Review", "Announcement", "Discovery", "Counselling", "Promotion", "Achievement"] as const;

const categoryIcons: Record<string, typeof Bell> = {
  Booking: Calendar,
  Assignment: FileText,
  Message: MessageSquare,
  Payment: Wallet,
  Review: Star,
  Announcement: Bell,
  Discovery: Compass,
  Counselling: MessageCircle,
  Promotion: Tag,
  Achievement: Award,
};

// Mobile top bar's bell dropdown — the latest five, newest first.
export function NotificationsDropdown({ live, onClose }: { live: LiveNotifications; onClose: () => void }) {
  const latest = live.notifications.slice(0, 5);
  return (
    <div className="absolute right-0 top-12 z-30 w-[calc(100vw-6rem)] max-w-md rounded-2xl border border-ensena-border bg-white p-2 shadow-lg">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-semibold text-ensena-ink">Notifications</p>
        <Link href="/student-dashboard/notifications" onClick={onClose} className="text-sm font-medium text-ensena-primary hover:underline">
          View all
        </Link>
      </div>
      {latest.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-ensena-muted">You&apos;re all caught up.</p>
      ) : (
        <ul className="flex max-h-[26rem] flex-col overflow-y-auto">
          {latest.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  live.open(n);
                }}
                className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-ensena-bg-soft"
              >
                <p className={cn("text-sm", n.unread ? "font-medium text-ensena-ink" : "text-ensena-muted")}>{n.text}</p>
                <p className="mt-0.5 text-sm text-ensena-muted">{notificationTimeAgo(n.createdAtMs, live.nowMs)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The Notifications page (all screen sizes).
export function StudentNotificationsReal() {
  const live = useLiveNotifications();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  if (!live) return null;

  const filtered = live.notifications.filter((n) => filter === "All" || n.category === filter);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ensena-muted">
            {live.unreadCount} unread notification{live.unreadCount === 1 ? "" : "s"}.
          </p>
        </div>
        <button type="button" onClick={live.markAllRead} disabled={live.unreadCount === 0} className="text-sm font-semibold text-ensena-primary hover:underline disabled:opacity-50">
          Mark all as read
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", filter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft")}
            >
              {tab}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-ensena-border">
          {filtered.map((n) => {
            const Icon = categoryIcons[n.category] ?? Bell;
            return (
              <li key={n.id}>
                <button type="button" onClick={() => live.open(n)} className={cn("flex w-full items-start gap-3 py-3 text-left", n.unread && "-mx-2 rounded-lg bg-ensena-primary/5 px-2")}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ensena-ink">{n.text}</p>
                    <p className="mt-0.5 text-xs text-ensena-muted">
                      {n.category}
                      {live.nowMs ? ` · ${notificationTimeAgo(n.createdAtMs, live.nowMs)}` : ""}
                    </p>
                  </div>
                  {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-primary" />}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-ensena-muted">{live.notifications.length === 0 ? "No notifications yet. Booking updates, messages and reminders will show up here." : "No notifications in this category."}</p>
          )}
        </ul>
      </div>
    </div>
  );
}
