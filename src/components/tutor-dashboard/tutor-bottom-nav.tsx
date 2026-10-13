"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, LayoutDashboard, MessageSquare, User, Users2 } from "lucide-react";

import { useTutorMessages } from "@/hooks/use-messages";
import { totalUnreadForTutor } from "@/lib/messages-store";
import { cn } from "@/lib/utils";

// Exactly five destinations — Dashboard, Students, Classes, Messages,
// Profile. "Classes" is the umbrella for Schedule/Private Lessons/Group
// Classes/Availability, all already consolidated as tabs on
// /tutor-dashboard/private-lessons (MyLessonsHubClient) rather than separate
// bottom-nav items. Earnings/Reviews/Verification/Settings live inside
// Profile (see the tutor drawer menu in dashboard-sidebar.tsx), not here.
const items = [
  { label: "Dashboard", href: "/tutor-dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/tutor-dashboard/students", icon: Users2 },
  { label: "Classes", href: "/tutor-dashboard/private-lessons", icon: Calendar, activeMatch: ["/tutor-dashboard/group-classes"] },
  { label: "Messages", href: "/tutor-dashboard/messages", icon: MessageSquare },
  { label: "Profile", href: "/tutor-dashboard/profile", icon: User },
];

// Mobile-only bottom tab bar, shared across every tutor-dashboard page (not
// a per-page redesign of the desktop sidebar — a purpose-built mobile nav,
// matching the pattern used throughout the rest of this app).
export function TutorBottomNav() {
  const pathname = usePathname();
  const messages = useTutorMessages();
  const unreadMessages = totalUnreadForTutor(messages);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ensena-border bg-ensena-surface px-1 py-1.5 lg:hidden">
      {items.map((item) => {
        const isActive =
          (item.href === "/tutor-dashboard" ? pathname === item.href : pathname.startsWith(item.href)) ||
          (item.activeMatch ?? []).some((prefix) => pathname.startsWith(prefix));
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
              isActive ? "text-ensena-primary" : "text-ensena-muted"
            )}
          >
            <span className="relative">
              <Icon className="size-5" />
              {item.label === "Messages" && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-ensena-primary text-[8px] font-semibold text-white">
                  {unreadMessages}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
