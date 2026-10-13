"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Calendar, Compass, FileText, MessageCircle, MessageSquare, Star, Wallet } from "lucide-react";

import { useStudentNotifications } from "@/hooks/use-student-notifications";
import { notificationCategoryHref, type StudentNotification } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const categoryFilters = ["All", "Booking", "Assignment", "Message", "Payment", "Review", "Announcement", "Discovery", "Counselling"] as const;

const categoryIcons: Record<StudentNotification["category"], typeof Bell> = {
  Booking: Calendar,
  Assignment: FileText,
  Message: MessageSquare,
  Payment: Wallet,
  Review: Star,
  Announcement: Bell,
  Discovery: Compass,
  Counselling: MessageCircle,
};

export function StudentNotificationsClient() {
  const router = useRouter();
  const { notifications, markRead, markAllRead } = useStudentNotifications();
  const [filter, setFilter] = useState<(typeof categoryFilters)[number]>("All");

  const filtered = useMemo(() => {
    return notifications.filter((n) => filter === "All" || n.category === filter);
  }, [notifications, filter]);

  function openNotification(n: StudentNotification) {
    markRead(n.id);
    const href = n.actionUrl ?? notificationCategoryHref[n.category];
    if (href) router.push(href);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ensena-muted">{notifications.filter((n) => n.unread).length} unread notifications.</p>
        </div>
        <button type="button" onClick={markAllRead} className="text-sm font-semibold text-ensena-primary hover:underline">
          Mark all as read
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <div className="flex flex-wrap gap-2">
          {categoryFilters.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium",
                filter === tab ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex flex-col divide-y divide-ensena-border">
          {filtered.map((n) => {
            const Icon = categoryIcons[n.category];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={cn("flex w-full items-start gap-3 py-3 text-left", n.unread && "bg-ensena-primary/5 -mx-2 px-2 rounded-lg")}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ensena-ink">{n.text}</p>
                    <p className="mt-0.5 text-xs text-ensena-muted">{n.category} · {n.time}</p>
                  </div>
                  {n.unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ensena-primary" />}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No notifications in this category.</p>}
        </ul>
      </div>
    </div>
  );
}
