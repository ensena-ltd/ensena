"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, HeartHandshake, LayoutDashboard, LogOut, MessageSquare, Search, Settings, User, Users2 } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { hasCounsellingRecords, hasUpcomingCounsellingSession } from "@/lib/admin-counselling-data";
import { buildStudentNavItems, dashboardStudent, studentAccountNavItems, type StudentSidebarNavItem } from "@/lib/student-dashboard-data";
import { buildContactSupportHref } from "@/lib/support-links";
import { useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { cn } from "@/lib/utils";

const navIcons: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  "Find a Tutor": Search,
  "Group Classes": Users2,
  "My Classes": Calendar,
  Counselling: HeartHandshake,
  Messages: MessageSquare,
};

const accountIcons: Record<string, typeof User> = {
  Profile: User,
  Settings: Settings,
};

function isItemActive(item: StudentSidebarNavItem, pathname: string): boolean {
  if (item.href === "/student-dashboard") return pathname === item.href;
  if (pathname.startsWith(item.href)) return true;
  return (item.activeMatch ?? []).some((prefix) => pathname.startsWith(prefix));
}

// Desktop-only (hidden below lg) fixed left sidebar — the student's
// permanent primary nav. Mobile gets the same five destinations via
// StudentBottomNav instead; this component never renders on mobile, and
// StudentBottomNav never renders on desktop, so the two are always
// mutually exclusive rather than one being a squeezed copy of the other.
export function StudentSidebar() {
  const pathname = usePathname();
  const me = useStudentIdentity();
  const showCounselling = hasCounsellingRecords(dashboardStudent.name);
  const navItems = buildStudentNavItems(showCounselling, showCounselling && hasUpcomingCounsellingSession(dashboardStudent.name));

  return (
    <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-ensena-border bg-white lg:flex">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = navIcons[item.label] ?? LayoutDashboard;
            const active = isItemActive(item, pathname);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                  )}
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {(item.label === "Messages" && me.unreadMessages !== null ? me.unreadMessages || undefined : item.badge) && (
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
                      {item.label === "Messages" && me.unreadMessages !== null ? (me.unreadMessages > 9 ? "9+" : me.unreadMessages) : item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 border-t border-ensena-border" />

        <p className="px-3.5 text-[11px] font-semibold uppercase tracking-wide text-ensena-muted">Account</p>
        <ul className="mt-2 flex flex-col gap-1">
          {studentAccountNavItems.map((item) => {
            const Icon = accountIcons[item.label] ?? User;
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                    active ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                  )}
                >
                  <Icon className="size-4.5 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 border-t border-ensena-border" />

        {/* General dashboard support — opens the Student Help Center first
            (buildContactSupportHref), not the ticket form directly. A
            booking/class/counselling page's own "Contact Support" passes
            that record's context instead — see need-help-card.tsx — so the
            two never collide. */}
        <div className="rounded-xl bg-ensena-bg-soft p-3.5">
          <p className="text-sm font-semibold text-ensena-ink">Need help?</p>
          <p className="text-xs text-ensena-muted">We&apos;re here for you</p>
          <Link
            href={buildContactSupportHref({ role: "Student", context: "student" })}
            className="mt-2.5 flex h-9 w-full items-center justify-center rounded-full border border-ensena-border bg-white text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
          >
            Contact Support
          </Link>
        </div>

        <ul className="mt-3 flex flex-col gap-1 pb-3">
          <li>
            <SignOutLink className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
              <LogOut className="size-4.5 shrink-0" />
              Logout
            </SignOutLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
