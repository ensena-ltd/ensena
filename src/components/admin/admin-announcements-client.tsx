"use client";

import { useState } from "react";
import { Plus, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  announcementStatusStyles,
  initialAdminAnnouncements,
  type AdminAnnouncement,
  type AnnouncementChannel,
} from "@/lib/admin-data";
import { cn } from "@/lib/utils";

const channels: AnnouncementChannel[] = ["Push Notification", "Email", "Banner"];
const audiences = ["All Students", "All Tutors", "All Counsellors", "Everyone"];

export function AdminAnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>(initialAdminAnnouncements);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<AnnouncementChannel>("Push Notification");
  const [audience, setAudience] = useState(audiences[0]);
  const [scheduledFor, setScheduledFor] = useState("");

  function create() {
    if (!title.trim()) return;
    setAnnouncements((prev) => [
      { id: `an-${Date.now()}`, title, channel, audience, scheduledFor: scheduledFor || "Not scheduled", status: scheduledFor ? "Scheduled" : "Draft" },
      ...prev,
    ]);
    setCreating(false);
    setTitle("");
    setScheduledFor("");
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Announcements</h1>
          <p className="mt-1 text-sm text-ensena-muted">Create and schedule push notifications, emails, and banners.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="h-10 rounded-full bg-gradient-to-r from-ensena-cta-from to-ensena-cta-to px-5 text-sm font-semibold text-white">
          <Plus className="size-4" /> New Announcement
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        <ul className="flex flex-col gap-2.5">
          {announcements.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ensena-border p-3.5 text-sm">
              <div>
                <p className="font-medium text-ensena-ink">{a.title}</p>
                <p className="text-xs text-ensena-muted">{a.channel} · {a.audience} · {a.scheduledFor}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", announcementStatusStyles[a.status])}>{a.status}</span>
            </li>
          ))}
        </ul>
        {announcements.length === 0 && <p className="py-10 text-center text-sm text-ensena-muted">No announcements yet.</p>}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New Announcement">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" placeholder="e.g. WAEC Bootcamp: 20% off this week" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Channel</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value as AnnouncementChannel)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {channels.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm">
              {audiences.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Schedule for (optional)</span>
            <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <Button onClick={create} className="mt-2 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
            <Send className="size-4" /> {scheduledFor ? "Schedule" : "Save as Draft"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
