"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { useLiveNotifications } from "@/components/student-dashboard/live/notifications-live";
import { useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useTutorNotifications } from "@/hooks/use-tutor-notifications";
import { isDispute } from "@/lib/escrow-release";

// The tutor's mobile avatar menu, in the mobile design's order.
const accountMenuItems = [
  { label: "Public Profile", href: "/tutor-dashboard/profile?tab=Public Profile" },
  { label: "Availability", href: "/tutor-dashboard/profile?tab=Availability" },
  { label: "Earnings", href: "/tutor-dashboard/earnings" },
  { label: "Reviews", href: "/tutor-dashboard/reviews" },
  { label: "Account Settings", href: "/tutor-dashboard/settings" },
  { label: "Contact Support", href: "/tutor-dashboard/help" },
];

interface PanelItem {
  id: string;
  text: string;
  unread: boolean;
  onOpen?: () => void;
  href?: string;
}

// Mobile-only (lg:hidden) top bar: logo, notifications bell and the avatar
// menu — the five primary sections live in TutorBottomNav. A signed-in
// tutor sees their real notifications (layout's TutorNotificationsProvider);
// demo mode keeps the local demo stores.
export function TutorMobileTopbar() {
  const me = useTutorIdentity();
  const live = useLiveNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Demo mode: the same entries the desktop TutorTopBar shows.
  const { lessons } = useLessonConfirmations();
  const { notifications: demoNotifications, markAllRead: markDemoRead } = useTutorNotifications();
  const confirmationEvents = live
    ? []
    : lessons
        .filter((l) => l.tutor === me.name && (l.confirmationStatus === "Pending" || isDispute(l)))
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, 6)
        .map((l) => ({
          id: l.id,
          text: isDispute(l)
            ? `${l.student} reported an issue with your ${l.type === "Group" ? "group class" : "lesson"} session.`
            : `Your ${l.type === "Group" ? "group class" : "lesson"} session with ${l.student} has ended. Earnings become available after the confirmation period if no issue is reported.`,
          unread: true,
        }));

  const items: PanelItem[] = live
    ? live.notifications.slice(0, 6).map((n) => ({ id: n.id, text: n.text, unread: n.unread, onOpen: () => live.open(n) }))
    : [...demoNotifications.slice(0, 6).map((n) => ({ id: n.id, text: n.text, unread: n.unread, href: n.actionUrl })), ...confirmationEvents];
  const unreadCount = live ? live.unreadCount : demoNotifications.slice(0, 6).filter((n) => n.unread).length + confirmationEvents.length;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ensena-border bg-white px-4 py-3 lg:hidden">
      <Logo />

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((v) => !v);
              setProfileOpen(false);
              if (!notifOpen && !live) markDemoRead();
            }}
            className="relative flex size-9 items-center justify-center rounded-full border border-ensena-border text-ensena-ink"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-ensena-primary text-[9px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-30 w-[calc(100vw-6rem)] max-w-md rounded-2xl border border-ensena-border bg-white p-2 shadow-lg">
              <ul className="flex max-h-[26rem] flex-col gap-0.5 overflow-y-auto">
                {items.map((n) => {
                  const className = "block w-full rounded-xl px-3 py-2.5 text-left text-sm text-ensena-ink hover:bg-ensena-bg-soft";
                  const body = <span className={n.unread ? "font-medium" : undefined}>{n.text}</span>;
                  return (
                    <li key={n.id}>
                      {n.onOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            n.onOpen!();
                          }}
                          className={className}
                        >
                          {body}
                        </button>
                      ) : n.href ? (
                        <Link href={n.href} onClick={() => setNotifOpen(false)} className={className}>
                          {body}
                        </Link>
                      ) : (
                        <p className={className}>{body}</p>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ensena-muted">No new notifications.</li>}
              </ul>
              <Link href="/tutor-dashboard/escrow" onClick={() => setNotifOpen(false)} className="block px-3 py-2 text-sm font-medium text-ensena-primary hover:underline">
                View earnings &amp; disputes
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Profile"
            onClick={() => {
              setProfileOpen((v) => !v);
              setNotifOpen(false);
            }}
            className="relative size-9 shrink-0 overflow-hidden rounded-full border border-ensena-border"
          >
            <Image src={me.image} alt={me.name} fill sizes="36px" className="object-cover" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-12 z-30 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-ensena-border bg-white p-2 shadow-lg">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-ensena-ink">{me.name}</p>
                <p className="text-xs text-ensena-muted">Tutor</p>
              </div>
              <div className="border-t border-ensena-border pt-1.5">
                {accountMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setProfileOpen(false)}
                    className="block rounded-xl px-3 py-2 text-left text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    {item.label}
                  </Link>
                ))}
                <SignOutLink
                  onBeforeNavigate={() => setProfileOpen(false)}
                  className="mt-1.5 block w-full rounded-xl border-t border-ensena-border px-3 pt-3 pb-2 text-left text-sm font-medium text-ensena-primary hover:bg-rose-50"
                >
                  Logout
                </SignOutLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
