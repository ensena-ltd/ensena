"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { SignOutLink } from "@/components/auth/sign-out-link";
import { initialsOf, useGuardianIdentity } from "@/components/guardian-dashboard/guardian-identity";
import { guardianSidebarNavItems } from "@/lib/guardian-dashboard-data";
import { cn } from "@/lib/utils";

export function GuardianDashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = useGuardianIdentity();

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
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ensena-primary">
              <HeartHandshake className="size-3.5" /> Guardian Dashboard
            </p>
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

        <div className="mx-4 flex items-center gap-3 rounded-2xl bg-ensena-bg-soft p-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
            {me.image ? <Image src={me.image} alt={me.name} fill sizes="40px" className="object-cover" /> : initialsOf(me.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ensena-ink">{me.name}</p>
            {me.email && <p className="truncate text-xs text-ensena-muted">{me.email}</p>}
          </div>
        </div>

        <nav className="mt-3 flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {guardianSidebarNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                      isActive ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
                    )}
                  >
                    <LayoutDashboard className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-ensena-border p-3">
          <SignOutLink
            onBeforeNavigate={() => setMobileOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="size-4 shrink-0" /> Log out
          </SignOutLink>
        </div>
      </aside>
    </>
  );
}
