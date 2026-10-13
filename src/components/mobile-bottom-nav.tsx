"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, User, Users2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Public mobile app shell nav — distinct from
// student-dashboard/student-bottom-nav.tsx (the real logged-in student nav,
// mounted only inside /student-dashboard's own layout) and
// tutor-dashboard/tutor-bottom-nav.tsx. This component is only ever mounted
// on public marketing pages (landing, Find Teachers, Group Classes). The
// site has no real session/auth state (see src/lib/demo-auth.ts — it's
// demo-only), and every other dashboard page in this app already renders
// for the demo user regardless of a real login, so Wishlist/Profile link
// straight to the same existing student-dashboard screens
// studentMobileNavItems itself points at (saved-tutors, profile) rather
// than gating behind a sign-in prompt.
type NavAction = { kind: "link"; href: string };

interface NavItem {
  label: string;
  icon: typeof Home;
  action: NavAction;
}

const navItems: NavItem[] = [
  { label: "Home", icon: Home, action: { kind: "link", href: "/" } },
  { label: "Find Tutors", icon: Search, action: { kind: "link", href: "/find-teachers" } },
  { label: "Group Classes", icon: Users2, action: { kind: "link", href: "/group-classes" } },
  { label: "Wishlist", icon: Heart, action: { kind: "link", href: "/student-dashboard/saved-tutors" } },
  { label: "Profile", icon: User, action: { kind: "link", href: "/student-dashboard/profile" } },
];

function isActiveItem(pathname: string, item: NavItem): boolean {
  const { href } = item.action;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ensena-border bg-ensena-surface/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-[1240px] items-stretch justify-between">
        {navItems.map((item) => {
          const active = isActiveItem(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.action.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium",
                active ? "text-ensena-primary" : "text-ensena-muted"
              )}
            >
              <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
