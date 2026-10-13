"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertOctagon,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BookUser,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  Flag,
  Headset,
  HelpCircle,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  School,
  Send,
  Settings,
  Star,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { useAdminSession } from "@/hooks/use-admin-session";
import { canAccessSection, clearAdminSession } from "@/lib/admin-session";
import { cn } from "@/lib/utils";

interface NavChild {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Users;
  children?: NavChild[];
  // Which allSections key gates this item — omitted means always visible
  // (nothing in this app's nav should be ungated except Dashboard, which is
  // itself a section every role has).
  sectionKey: string;
}

// Simplified 9-section admin nav (Dashboard + 9), matching the approved
// control-centre IA: broad areas (Counselling, Group Classes, Bookings) stay
// as single nav items rather than exploding into a top-level entry per
// sub-concept — their own pages (/admin/counsellors, etc.) already provide
// the tabs/filters described for those sub-sections. Users is the one area
// that gets real expandable sub-items (All Users/Students/Tutors/
// Restricted/Banned), all driving the same /admin/users table via ?tab= —
// see admin-users-client.tsx. Every previously-linked admin page (Tutors,
// Students, Lessons, Escrow, Withdrawals, Reviews, Support Tickets,
// Announcements, Content Management, Promotions, AI Performance Manager,
// Discovery Sessions, Pre-approvals & Offers, Academic Programs, etc.) still
// exists on disk and still works if visited directly — it's just not a
// top-level nav item anymore, the same "hide from nav, don't delete"
// convention already used for the student/tutor dashboards (see
// feature-flags.ts).
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, sectionKey: "Dashboard" },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    sectionKey: "Users",
    children: [
      { label: "All Users", href: "/admin/users" },
      { label: "Students", href: "/admin/users?tab=Students" },
      { label: "Tutors", href: "/admin/users?tab=Tutors" },
      { label: "Restricted", href: "/admin/users?tab=Restricted" },
      { label: "Banned", href: "/admin/users?tab=Banned" },
    ],
  },
  { label: "User Directory", href: "/admin/user-directory", icon: BookUser, sectionKey: "Users" },
  {
    label: "Tutor Verification",
    href: "/admin/verification",
    icon: BadgeCheck,
    sectionKey: "TutorVerification",
    children: [
      { label: "Pending Verification", href: "/admin/verification" },
      { label: "Verified Tutors", href: "/admin/verification?tab=Verified" },
      { label: "Rejected", href: "/admin/verification?tab=Rejected" },
      { label: "Resubmission Required", href: "/admin/verification?tab=Resubmission Required" },
      { label: "Restricted Tutors", href: "/admin/users?tab=Restricted&role=Tutor" },
    ],
  },
  {
    label: "Group Classes",
    href: "/admin/group-classes",
    icon: School,
    sectionKey: "GroupClasses",
    children: [
      { label: "All Group Classes", href: "/admin/group-classes" },
      { label: "Pending Approval", href: "/admin/group-classes?tab=Pending Approval" },
      { label: "Approved", href: "/admin/group-classes?tab=Approved" },
      { label: "Rejected", href: "/admin/group-classes?tab=Rejected" },
    ],
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: CalendarCheck,
    sectionKey: "Bookings",
    children: [
      { label: "All Bookings", href: "/admin/bookings" },
      { label: "Upcoming", href: "/admin/bookings?status=Upcoming" },
      { label: "Pending", href: "/admin/bookings?status=Pending" },
      { label: "Completed", href: "/admin/bookings?status=Completed" },
      { label: "Cancelled", href: "/admin/bookings?status=Cancelled" },
      { label: "Disputed", href: "/admin/bookings?status=Disputed" },
    ],
  },
  {
    label: "Counselling",
    href: "/admin/counsellors",
    icon: UserCheck,
    sectionKey: "Counselling",
    children: [
      { label: "Dashboard", href: "/admin/counsellors" },
      { label: "Appointments", href: "/admin/counsellors?tab=Appointments" },
      { label: "Students", href: "/admin/counsellors?tab=Students" },
      { label: "Intake Forms", href: "/admin/counsellors?tab=Intake Forms" },
      { label: "Action Plans", href: "/admin/counsellors?tab=Action Plans" },
      { label: "Counsellor Settings", href: "/admin/counsellors?tab=Counsellor Settings" },
    ],
  },
  {
    label: "Payments & Earnings",
    href: "/admin/payments",
    icon: CreditCard,
    sectionKey: "Payments",
    children: [
      { label: "Overview", href: "/admin/payments" },
      { label: "Transactions", href: "/admin/payments?tab=Transactions" },
      { label: "Tutor Payouts", href: "/admin/payments?tab=Tutor Payouts" },
      { label: "Refunds", href: "/admin/payments?tab=Refunds" },
      { label: "Disputes", href: "/admin/payments?tab=Disputes" },
    ],
  },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, sectionKey: "Analytics" },
  { label: "Disputes", href: "/admin/disputes", icon: Flag, sectionKey: "Disputes" },
  { label: "Reports & Issues", href: "/admin/reports", icon: AlertOctagon, sectionKey: "Reports" },
  { label: "Support", href: "/admin/support", icon: Headset, sectionKey: "Support" },
  { label: "Reviews", href: "/admin/reviews", icon: Star, sectionKey: "Reviews" },
  { label: "Communications", href: "/admin/communications", icon: Send, sectionKey: "Communications" },
  { label: "Platform Management", href: "/admin/platform-management", icon: Layers, sectionKey: "PlatformManagement" },
  { label: "Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen, sectionKey: "KnowledgeBase" },
  { label: "Help Center", href: "/admin/help", icon: HelpCircle, sectionKey: "Help" },
  { label: "Settings", href: "/admin/settings", icon: Settings, sectionKey: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const session = useAdminSession();
  const visibleNavItems = navItems.filter((item) => canAccessSection(session, item.sectionKey));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(
    navItems.find((item) => item.children && pathname.startsWith(item.href))?.label ?? null
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-ensena-border bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="flex size-10 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-72 shrink-0 flex-col overflow-y-auto border-r border-ensena-border bg-white transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:w-64 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <Logo />
            <p className="mt-1 text-xs font-medium text-ensena-muted">Admin Panel</p>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft lg:hidden"
          >
            <X className="size-4.5" />
          </button>
        </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {visibleNavItems.map((item) => {
            const onSection = pathname.startsWith(item.href);
            const isActive = onSection && !item.children;
            const isOpen = item.children ? openGroup === item.label : false;
            return (
              <li key={item.label}>
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => setOpenGroup((cur) => (cur === item.label ? null : item.label))}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                      onSection ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", isOpen && "rotate-180")} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-ensena-primary/10 text-ensena-primary"
                        : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                )}

                {item.children && isOpen && (
                  <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-ensena-border pl-4">
                    {item.children.map((child) => {
                      const childTab = child.href.includes("?tab=") ? child.href.split("?tab=")[1] : null;
                      const childActive = pathname === item.href && (childTab ? tabParam === childTab : !tabParam);
                      return (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "block rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                              childActive
                                ? "bg-ensena-primary/10 text-ensena-primary"
                                : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative border-t border-ensena-border p-3">
        {profileOpen && (
          <div className="absolute inset-x-3 bottom-full z-30 mb-2 rounded-2xl border border-ensena-border bg-white p-1.5 shadow-lg">
            <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              <User className="size-3.5" /> My Profile
            </Link>
            <Link href="/admin/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              <Settings className="size-3.5" /> Account Settings
            </Link>
            <SignOutLink
              onBeforeNavigate={() => { setProfileOpen(false); clearAdminSession(); }}
              className="mt-1 flex items-center gap-2 rounded-xl border-t border-ensena-border px-2.5 pt-2.5 pb-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="size-3.5" /> Log Out
            </SignOutLink>
          </div>
        )}
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left hover:bg-ensena-bg-soft"
        >
          <span className="relative size-9 shrink-0 overflow-hidden rounded-full">
            <Image src={session.image ?? "/teacher-4.jpg.png"} alt={session.name} fill sizes="36px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ensena-ink">{session.name}</span>
            <span className="block truncate text-xs text-ensena-muted">{session.role}</span>
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-ensena-muted transition-transform", profileOpen && "rotate-180")} />
        </button>
      </div>
      </aside>
    </>
  );
}
