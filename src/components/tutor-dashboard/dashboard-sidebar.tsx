"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Star,
  User,
  Users2,
  Wallet,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { VerifiedTutorBadge } from "@/components/shared/verified-tutor-badge";
import { isTutorVerified, useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { TutorMobileTopbar } from "@/components/tutor-dashboard/tutor-mobile-topbar";
import { Button } from "@/components/ui/button";
import { useTutorMessages } from "@/hooks/use-messages";
import { useTutorRating } from "@/hooks/use-reviews";
import { totalUnreadForTutor } from "@/lib/messages-store";
import { dashboardTutor, sidebarNavItems } from "@/lib/tutor-dashboard-data";
import { cn } from "@/lib/utils";

const navIcons: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Students: Users2,
  Classes: Calendar,
  Messages: MessageSquare,
  Earnings: Wallet,
  Reviews: Star,
  Profile: User,
};

// A child link's own `?tab=` (if any), read out of its stored href so the
// sidebar's active-state check doesn't need a second hardcoded copy of
// each page's tab list.
function tabParamOf(href: string): string | null {
  const query = href.split("?")[1];
  if (!query) return null;
  return new URLSearchParams(query).get("tab");
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = useTutorIdentity();
  // A real tutor starts with no reviews; the demo persona keeps its seed.
  const rating = useTutorRating(me.name, me.id ? 0 : dashboardTutor.rating, me.id ? 0 : dashboardTutor.reviews);
  // All groups start expanded (matches the reference design — the sidebar
  // always shows sub-items rather than behaving like an accordion); the
  // chevron still lets the tutor collapse a group they don't need.
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(sidebarNavItems.filter((item) => item.children).map((item) => item.label))
  );

  const messages = useTutorMessages();
  const unreadMessages = totalUnreadForTutor(messages);

  return (
    <>
      {/* Mobile top bar (logo, bell, avatar menu), per the mobile design. */}
      <TutorMobileTopbar />

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
          <Logo />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="flex size-9 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft lg:hidden"
          >
            <X className="size-4.5" />
          </button>
        </div>

      <div className="mx-4 rounded-2xl bg-ensena-bg-soft p-3">
        <div className="flex items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-full">
            <Image src={me.image} alt={me.name} fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-ensena-ink">
              {me.name}
              <VerifiedTutorBadge verified={me.id ? isTutorVerified(me) : undefined} tutorName={me.name} className="size-3.5" />
            </p>
            <p className="flex items-center gap-1 text-xs text-ensena-muted">
              <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />
              {rating.rating} ({rating.reviews} reviews)
            </p>
          </div>
        </div>
        <Link
          href="/tutor-dashboard/profile?tab=Public Profile"
          className="mt-3 flex h-8 w-full items-center justify-center rounded-full border border-ensena-border bg-white text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
        >
          Edit Profile
        </Link>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {sidebarNavItems.map((item) => {
            const Icon = navIcons[item.label] ?? LayoutDashboard;
            const basePath = item.href.split("?")[0];
            const isActive = item.href === "/tutor-dashboard" ? pathname === item.href : pathname.startsWith(basePath);
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const groupOpen = openGroups.has(item.label);

            return (
              <li key={item.label}>
                <div className="flex items-center">
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-ensena-cta-from/10 text-ensena-cta-to"
                        : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    )}
                    {item.label === "Messages" && unreadMessages > 0 && (
                      <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">
                        {unreadMessages}
                      </span>
                    )}
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      aria-label={groupOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                      onClick={() =>
                        setOpenGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.label)) next.delete(item.label);
                          else next.add(item.label);
                          return next;
                        })
                      }
                      className="flex size-8 shrink-0 items-center justify-center text-ensena-muted hover:text-ensena-ink"
                    >
                      <ChevronDown className={cn("size-3.5 transition-transform", groupOpen && "rotate-180")} />
                    </button>
                  )}
                </div>
                {hasChildren && groupOpen && (
                  <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-ensena-border pl-4">
                    {item.children!.map((child) => {
                      const childBasePath = child.href.split("?")[0];
                      const childTab = tabParamOf(child.href);
                      const childIsActive =
                        pathname === childBasePath &&
                        (childTab === null ? currentTab === null : currentTab !== null && childTab.toLowerCase() === currentTab.toLowerCase());
                      return (
                        <li key={child.label}>
                          <Link
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                              childIsActive
                                ? "bg-ensena-cta-from/10 font-medium text-ensena-cta-to"
                                : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                            )}
                          >
                            <span className="flex-1 truncate">{child.label}</span>
                            {Boolean(child.badge) && (
                              <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-ensena-cta-to text-[10px] font-semibold text-white">
                                {child.badge}
                              </span>
                            )}
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

      <div className="m-4 rounded-2xl border border-ensena-border p-4 text-sm">
        <p className="font-semibold text-ensena-ink">Need help?</p>
        <p className="mt-0.5 text-xs text-ensena-muted">We&apos;re here for you</p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/tutor-dashboard/help" onClick={() => setMobileOpen(false)} />}
          className="mt-3 h-9 w-full rounded-full border-ensena-border text-xs font-medium"
        >
          Contact Support
        </Button>
        <SignOutLink
          onBeforeNavigate={() => setMobileOpen(false)}
          className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-medium text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="size-3.5" /> Log Out
        </SignOutLink>
      </div>
      </aside>
    </>
  );
}
