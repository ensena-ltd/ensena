"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Compass, Heart, MessageSquare, User } from "lucide-react";

import { studentMobileNavItems, type StudentSidebarNavItem } from "@/lib/student-dashboard-data";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { cn } from "@/lib/utils";

const navIcons: Record<string, typeof Compass> = {
  Explore: Compass,
  Bookings: Calendar,
  Messages: MessageSquare,
  Wishlist: Heart,
  Profile: User,
};

function isItemActive(item: StudentSidebarNavItem, pathname: string): boolean {
  if (item.href === "/student-dashboard") return pathname === item.href;
  if (pathname.startsWith(item.href)) return true;
  return (item.activeMatch ?? []).some((prefix) => pathname.startsWith(prefix));
}

// Fixed bottom tab bar — mobile's counterpart to StudentSidebar on desktop.
// Exactly the five primary destinations, same active-state logic as the
// sidebar's links. `pb-[env(safe-area-inset-bottom)]` keeps the labels
// clear of the iPhone home-indicator area.
export function StudentBottomNav() {
  const pathname = usePathname();
  const me = useStudentIdentity();
  const navItems = studentMobileNavItems;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ensena-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ boxShadow: "0 -8px 24px -16px rgba(17, 24, 39, 0.25)" }}
    >
      <ul className="flex items-stretch justify-between">
        {navItems.map((item) => {
          const Icon = navIcons[item.label] ?? Compass;
          const active = isItemActive(item, pathname);
          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-1 py-2.5 text-center transition-colors",
                  active ? "text-ensena-primary" : "text-ensena-muted"
                )}
              >
                <span className="relative">
                  <Icon className={cn("size-5", active && "fill-ensena-primary/10")} strokeWidth={active ? 2.25 : 1.75} />
                  {(item.label === "Messages" && me.unreadMessages !== null ? me.unreadMessages || undefined : item.badge) && (
                    <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-ensena-primary text-[8px] font-semibold text-white">
                      {item.label === "Messages" && me.unreadMessages !== null ? (me.unreadMessages > 9 ? "9+" : me.unreadMessages) : item.badge}
                    </span>
                  )}
                </span>
                <span className={cn("text-[10.5px] leading-none", active ? "font-semibold" : "font-medium")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
