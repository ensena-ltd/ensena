"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, X } from "lucide-react";

import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { buildContactSupportHref } from "@/lib/support-links";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Find Teachers", href: "/find-teachers", hasChevron: true },
  { label: "Group Classes", href: "/group-classes" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Become a Tutor", href: "/become-a-tutor" },
];

interface HeaderProps {
  // "menu" (default) keeps the hamburger + nav-link panel used across the
  // site. "icons" is the compact notification/messages header used on the
  // mobile-optimized landing page only — every other page keeps "menu" so
  // their mobile navigation is unaffected.
  mobileNav?: "menu" | "icons";
  // A larger, more prominent mark matching the landing page's own logo
  // size — passed explicitly by the landing page and by the booking-flow
  // pages (find-teachers/[slug]/book*, group-classes/[slug]/review &
  // confirmation), per "the landing page is the source of truth for logo
  // size". Every other page keeps Logo's own default (32) by leaving this
  // unset.
  logoSize?: number;
}

export function Header({ mobileNav = "menu", logoSize }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ensena-border/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Ensena home" className="flex items-center">
          {/* mobileNav="icons" only ever means the landing page's own
              mobile-optimized header (the one real usage site) — showing
              the full icon+wordmark lockup there even on a narrow phone,
              rather than Logo's own default icon-only-below-sm behavior,
              which is what every other page's header still keeps. Below
              `lg:` (where the Bell/menu icon controls this header shows
              instead of the desktop nav/buttons) it renders ~17% smaller
              than the desktop mark — sized independently via two Logo
              instances swapped by breakpoint, so this mobile-only sizing
              can never affect the desktop `logoSize` below. */}
          {mobileNav === "icons" ? (
            <>
              <Logo horizontal size={logoSize ? Math.round(logoSize * 0.83) : 32} className="lg:hidden" />
              <Logo horizontal size={logoSize} className="hidden lg:block" />
            </>
          ) : (
            <Logo size={logoSize} />
          )}
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 lg:flex"
        >
          {navLinks.map((link) => {
            const isActive =
              link.href.startsWith("/#") ? false : pathname.startsWith(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1 text-sm font-medium transition-colors hover:text-ensena-primary",
                  isActive
                    ? "text-ensena-primary underline decoration-2 underline-offset-8"
                    : "text-ensena-ink"
                )}
              >
                {link.label}
                {link.hasChevron && (
                  <ChevronDown className="size-3.5 text-ensena-muted" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            variant="outline"
            nativeButton={false}
            className="h-10 rounded-full border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            render={<Link href="/counsellor" />}
          >
            Speak to a Counsellor
          </Button>
          <Button
            variant="ghost"
            nativeButton={false}
            className="h-10 rounded-full px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
            render={<Link href="/sign-in" />}
          >
            Log in
          </Button>
          <Button
            nativeButton={false}
            className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-medium text-white transition-transform hover:bg-ensena-primary/90 hover:-translate-y-0.5 active:translate-y-0"
            render={<Link href="/sign-up" />}
          >
            Sign up
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {mobileNav === "icons" && (
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => setAuthPrompt(true)}
              className="relative flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
            >
              <Bell className="size-5" />
            </button>
          )}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex size-11 items-center justify-center rounded-full text-ensena-ink hover:bg-ensena-bg-soft"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-ensena-border bg-white px-6 py-4 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-ensena-ink"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              variant="outline"
              nativeButton={false}
              className="h-10 w-full rounded-full border-ensena-border text-sm font-medium"
              render={<Link href="/counsellor" onClick={() => setMenuOpen(false)} />}
            >
              Speak to a Counsellor
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              className="h-10 w-full rounded-full text-sm font-medium"
              render={<Link href="/sign-in" onClick={() => setMenuOpen(false)} />}
            >
              Sign In
            </Button>
            <Button
              nativeButton={false}
              className="h-10 w-full rounded-full bg-ensena-primary text-sm font-medium text-white"
              render={<Link href="/sign-up" onClick={() => setMenuOpen(false)} />}
            >
              Create Account
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              className="h-10 w-full rounded-full text-sm font-medium text-ensena-muted"
              render={<Link href={buildContactSupportHref({ role: "Guest", context: "public" })} onClick={() => setMenuOpen(false)} />}
            >
              Contact Support
            </Button>
          </div>
        </div>
      )}

      {authPrompt && <AuthPromptModal message="Sign in to view your notifications" onClose={() => setAuthPrompt(false)} />}
    </header>
  );
}
