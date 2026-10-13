"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Settings,
  Star,
  Target,
  User,
  Users,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { counsellorProfile, counsellorSidebarNavItems } from "@/lib/counsellor-dashboard-data";
import { cn } from "@/lib/utils";

const navIcons: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Appointments: Calendar,
  Students: Users,
  "Intake Forms": ClipboardList,
  "Action Plans": Target,
  Messages: MessageSquare,
  Resources: FileText,
  Reports: BarChart3,
  Feedback: Star,
  Profile: User,
  Settings: Settings,
  "Help Center": HelpCircle,
};

export function CounsellorDashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
              <HeartHandshake className="size-3.5" /> Counsellor Dashboard
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
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
          <Image src={counsellorProfile.image} alt={counsellorProfile.name} fill sizes="40px" className="object-cover" />
        </div>
        <p className="truncate text-sm font-semibold text-ensena-ink">{counsellorProfile.name}</p>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {counsellorSidebarNavItems.map((item) => {
            const Icon = navIcons[item.label] ?? LayoutDashboard;
            const isActive = item.href === "/counsellor-dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </aside>
    </>
  );
}
