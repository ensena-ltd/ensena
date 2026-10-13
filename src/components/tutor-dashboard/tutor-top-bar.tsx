"use client";

import { useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, ChevronDown, MessageSquare } from "lucide-react";

import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useTutorMessages } from "@/hooks/use-messages";
import { useTutorNotifications } from "@/hooks/use-tutor-notifications";
import { isDispute } from "@/lib/escrow-release";
import { totalUnreadForTutor } from "@/lib/messages-store";
import { useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { markTutorNotificationsRead } from "@/lib/actions/tutor-dashboard";

export interface TutorTopBarLiveData {
  notifications: { id: string; text: string; actionUrl: string | null; unread: boolean }[];
  unreadNotifications: number;
  unreadMessages: number;
}

// Desktop-only top bar shown above each tutor-dashboard page's content
// (mobile gets its own compact bar inside DashboardSidebar). `primaryAction`
// is the page-specific button on the left (e.g. "View public profile" on
// the dashboard, "+ Create Group Class" on Students/Classes); everything on
// the right — notifications, messages, tutor identity — is the same
// everywhere. Pages backed by Supabase pass `live` so the badges come from
// the tutor's real notifications/inbox instead of the local demo stores.
export function TutorTopBar({ primaryAction, live }: { primaryAction?: ReactNode; live?: TutorTopBarLiveData }) {
  const messages = useTutorMessages();
  const unreadMessages = totalUnreadForTutor(messages);
  const { lessons } = useLessonConfirmations();
  const { notifications, markAllRead } = useTutorNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const me = useTutorIdentity();
  const [liveBadgeCleared, setLiveBadgeCleared] = useState(false);
  const [, startTransition] = useTransition();

  const myLessons = lessons.filter((l) => l.tutor === me.name);
  const confirmationEvents = myLessons
    .filter((l) => l.confirmationStatus === "Pending" || isDispute(l))
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      text: isDispute(l)
        ? `${l.student} reported an issue with your ${l.type === "Group" ? "group class" : "lesson"} session.`
        : `Your ${l.type === "Group" ? "group class" : "lesson"} session with ${l.student} has ended. Earnings become available after the confirmation period if no issue is reported.`,
    }));
  // Real message/offer notifications (new messages received, offers sent/
  // accepted/declined/countered) — already newest-first (pushTutorNotification
  // prepends), shown above the pre-existing lesson-confirmation/dispute list
  // rather than force-merged into one sort order across two unrelated time
  // scales.
  const recentNotifications = live ? live.notifications.slice(0, 6) : notifications.slice(0, 6);
  const shownConfirmationEvents = live ? [] : confirmationEvents;
  const badgeCount = live
    ? liveBadgeCleared ? 0 : live.unreadNotifications
    : recentNotifications.filter((n) => n.unread).length + confirmationEvents.length;
  const unreadMessageCount = live ? live.unreadMessages : unreadMessages;

  function openNotifications() {
    setNotifOpen((v) => !v);
    if (notifOpen) return;
    if (!live) return markAllRead();
    if (live.unreadNotifications > 0 && !liveBadgeCleared) {
      setLiveBadgeCleared(true);
      startTransition(async () => {
        await markTutorNotificationsRead();
      });
    }
  }

  return (
    <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
      <div>{primaryAction}</div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={openNotifications}
            className="relative flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Bell className="size-5" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                {badgeCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 z-30 w-80 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <p className="text-xs font-semibold text-ensena-ink">Notifications</p>
                <Link href="/tutor-dashboard/escrow" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-ensena-primary hover:underline">
                  View earnings
                </Link>
              </div>
              <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {recentNotifications.map((n) =>
                  n.actionUrl ? (
                    <li key={n.id}>
                      <Link href={n.actionUrl} onClick={() => setNotifOpen(false)} className="block rounded-xl px-2.5 py-2 text-xs text-ensena-ink hover:bg-ensena-bg-soft">
                        {n.text}
                      </Link>
                    </li>
                  ) : (
                    <li key={n.id} className="rounded-xl px-2.5 py-2 text-xs text-ensena-ink hover:bg-ensena-bg-soft">{n.text}</li>
                  )
                )}
                {shownConfirmationEvents.map((e) => (
                  <li key={e.id} className="rounded-xl px-2.5 py-2 text-xs text-ensena-ink hover:bg-ensena-bg-soft">{e.text}</li>
                ))}
                {recentNotifications.length === 0 && shownConfirmationEvents.length === 0 && (
                  <li className="px-2.5 py-4 text-center text-xs text-ensena-muted">No new notifications.</li>
                )}
              </ul>
            </div>
          )}
        </div>
        <Link
          href="/tutor-dashboard/messages"
          aria-label="Messages"
          className="relative flex size-9 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <MessageSquare className="size-5" />
          {unreadMessageCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
              {unreadMessageCount}
            </span>
          )}
        </Link>
        <div className="flex items-center gap-2.5 border-l border-ensena-border pl-4">
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
            <Image src={me.image} alt={me.name} fill sizes="36px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ensena-ink">{me.name}</p>
            <p className="text-xs text-ensena-muted">Tutor</p>
          </div>
          <ChevronDown className="size-4 shrink-0 text-ensena-muted" />
        </div>
      </div>
    </div>
  );
}
