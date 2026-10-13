"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Calendar, ChevronDown, LogOut, Search, Settings, User } from "lucide-react";

import { SignOutLink } from "@/components/auth/sign-out-link";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useTodayISO } from "@/hooks/use-today-iso";
import { clearAdminSession } from "@/lib/admin-session";
import { counsellor } from "@/lib/counsellor-data";
import { cn } from "@/lib/utils";


const notifications = [
  { id: "n-1", title: "18 tutors pending verification", time: "2m ago" },
  { id: "n-2", title: "New support ticket: Issue with lesson playback", time: "2h ago" },
  { id: "n-3", title: "3 open disputes require your attention", time: "3h ago" },
  { id: "n-4", title: "Group class approved: WAEC Mathematics Intensive", time: "1h ago" },
  { id: "n-5", title: "Discovery Session dispute opened by Tunde Fashola", time: "20m ago" },
  { id: "n-6", title: "Discovery Session escrow released to Michael Adewale", time: "1h ago" },
  { id: "n-7", title: "Discovery Session conversion analytics updated", time: "4h ago" },
];

// today's date, formatted "24 Aug, 2026" — hydration-safe like useTodayISO's
// other consumers (server and first client render agree, then the real date
// applies post-mount).
function formatDatePill(todayISO: string): string {
  const [y, m, d] = todayISO.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminTopbar() {
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const todayISO = useTodayISO();
  const pathname = usePathname();
  // The signed-in admin (real account once Supabase is configured).
  const admin = useAdminSession();
  // Only the Dashboard home puts its page title on the same row as
  // search/bell/date, per the approved control-centre layout — every other
  // admin page keeps its own <h1> as page content below this bar, unchanged.
  const isDashboardHome = pathname === "/admin/dashboard";
  // The Counselling workspace is Benny's own operating view, so the profile
  // badge shows Benny's identity here instead of the generic Super Admin.
  const isCounselling = pathname.startsWith("/admin/counsellors");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      {isDashboardHome && (
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Dashboard</h1>
        </div>
      )}

      <div className={isDashboardHome ? "flex shrink-0 items-center gap-3" : "flex w-full items-center justify-end gap-3"}>
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything…"
            className="h-10 w-64 rounded-full border border-ensena-border bg-ensena-surface pl-10 pr-4 text-sm focus:border-ensena-primary focus:outline-none lg:w-80"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            className="relative flex size-10 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink hover:bg-ensena-bg-soft"
          >
            <Bell className="size-4.5" />
            <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">
              {notifications.length}
            </span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 z-30 w-80 rounded-2xl border border-ensena-border bg-ensena-surface p-2 shadow-lg">
              <div className="flex items-center justify-between px-2.5 py-1.5">
                <p className="text-xs font-semibold text-ensena-ink">Notifications</p>
                <Link href="/admin/audit-logs" onClick={() => setNotifOpen(false)} className="text-xs font-medium text-ensena-primary hover:underline">View all</Link>
              </div>
              <ul className="flex flex-col gap-0.5">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-xl px-2.5 py-2 text-xs hover:bg-ensena-bg-soft">
                    <p className="font-medium text-ensena-ink">{n.title}</p>
                    <p className="mt-0.5 text-ensena-muted">{n.time}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {isDashboardHome ? (
          <div className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-ensena-border bg-ensena-surface px-4 text-sm font-medium text-ensena-ink">
            <Calendar className="size-4 text-ensena-muted" /> {formatDatePill(todayISO)}
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
              className="flex h-10 items-center gap-2 rounded-full border border-ensena-border bg-ensena-surface py-1 pl-1 pr-3"
            >
              <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
                <Image src={isCounselling ? counsellor.image : admin.image ?? "/teacher-4.jpg.png"} alt={isCounselling ? counsellor.name : admin.name} fill sizes="32px" className="object-cover" />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-ensena-ink">{isCounselling ? counsellor.name : admin.name}</span>
                <span className="block text-[11px] leading-tight text-ensena-muted">{isCounselling ? "Academic Counsellor" : admin.role}</span>
              </span>
              <ChevronDown className={cn("size-3.5 shrink-0 text-ensena-muted transition-transform", profileOpen && "rotate-180")} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
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
          </div>
        )}
      </div>
    </div>
  );
}
