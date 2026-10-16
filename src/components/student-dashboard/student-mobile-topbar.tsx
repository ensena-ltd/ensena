"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { Bell } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { useStudentNotifications } from "@/hooks/use-student-notifications";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { hasCounsellingRecords } from "@/lib/admin-counselling-data";
import { NotificationsDropdown, useLiveNotifications } from "@/components/student-dashboard/live/notifications-live";
import { dashboardStudent, notificationCategoryHref, studentProfileMenuItems } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

// The mobile avatar menu, in the mobile design's order. Counselling only
// once the student has booked it.
function mobileAccountMenuItems(showCounselling: boolean) {
  const byLabel = (label: string) => studentProfileMenuItems.find((i) => i.label === label);
  return [
    byLabel("Promotions & Offers"),
    showCounselling ? { label: "Counselling", href: "/student-dashboard/counselling" } : undefined,
    byLabel("My Profile"),
    byLabel("Payment Methods"),
    byLabel("Payment History"),
    byLabel("Account Settings"),
    byLabel("Notifications"),
    byLabel("Security"),
    { label: "Contact Support", href: "/student-dashboard/help" },
  ].filter((i): i is { label: string; href: string } => !!i);
}

// Mobile-only (lg:hidden) top bar. The five primary sections live in
// StudentBottomNav instead — this bar deliberately does not repeat them,
// just the logo and profile/notification access, per the "keep the top
// area clean, no duplicated primary nav in the header" requirement.
export function StudentMobileTopbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const me = useStudentIdentity();
  const live = useLiveNotifications();
  const { notifications: studentNotifications } = useStudentNotifications();
  const unreadCount = live ? live.unreadCount : studentNotifications.filter((n) => n.unread).length;
  const accountMenuItems = mobileAccountMenuItems(me.hasCounselling ?? hasCounsellingRecords(dashboardStudent.name));

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
          {notifOpen && live && <NotificationsDropdown live={live} onClose={() => setNotifOpen(false)} />}
          {notifOpen && !live && (
            <div className="absolute right-0 top-11 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-ensena-border bg-white p-2 shadow-lg">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <p className="text-xs font-semibold text-ensena-ink">Notifications</p>
                <Link
                  href="/student-dashboard/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-ensena-primary hover:underline"
                >
                  View all
                </Link>
              </div>
              <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {studentNotifications.slice(0, 5).map((n) => {
                  const href = notificationCategoryHref[n.category] ?? "/student-dashboard/notifications";
                  return (
                    <li key={n.id}>
                      <Link href={href} onClick={() => setNotifOpen(false)} className="block rounded-xl px-2.5 py-2 text-xs hover:bg-ensena-bg-soft">
                        <p className={cn("font-medium", n.unread ? "text-ensena-ink" : "text-ensena-muted")}>{n.text}</p>
                        <p className="mt-0.5 text-ensena-muted">{n.time}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
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
                <p className="text-xs text-ensena-muted">{me.tier}</p>
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
