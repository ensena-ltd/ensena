"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Check, Clock, Copy, MoreVertical, Users, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ClassKind = "Private Lesson" | "Group Class" | "Discovery Session";

const kindStyles: Record<ClassKind, string> = {
  "Private Lesson": "bg-rose-50 text-rose-700",
  "Group Class": "bg-[#CBEFFF] text-[#1E7BA6]",
  "Discovery Session": "bg-violet-50 text-violet-700",
};

export interface ClassListItem {
  id: string;
  kind: ClassKind;
  title: string;
  tutor: string;
  /** null falls back to the tutor's initial. */
  tutorImage: string | null;
  /** Real "Class Details" route for this row — clicking the title/subject/tutor block navigates here, distinct from the row's own action button (Enter Classroom/View Class/etc.) and its kebab menu. Omit only when there's genuinely nowhere else to send it. */
  detailsHref?: string;
  dateLabel: string;
  timeLabel: string;
  sortTime: number;
  startsInLabel?: string;
  /** Defaults to "Online". */
  modeLabel?: string;
  extraLine?: string;
  bookingIdLabel: "Booking ID" | "Class ID";
  bookingId: string;
  statusPill?: { label: string; tint: string };
  /** Never set for a Discovery Session — reviews don't apply to those. Purely informational; the actual "Leave a Review" flow lives on the details page this row's action already links to. */
  reviewBadge?: { label: string; tint: string };
  /** Real attendance evidence (class-attendance-store.ts) — omitted for the common "both showed up" case, since that's not worth calling out in a list row. */
  attendanceBadge?: { label: string; tint: string };
  actionLabel: string;
  actionHref?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  onKebab: () => void;
}

function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy ID"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="text-ensena-muted hover:text-ensena-primary"
    >
      {copied ? <Check className="size-3.5 text-ensena-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

// Shared row used by the Upcoming / Active / Completed "view all" pages —
// same card design, tutor photos, ID treatment and buttons everywhere, only
// the content and action per row changes, per the approved spec.
export function ClassListRow({ item }: { item: ClassListItem }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-4 sm:flex-row sm:items-center">
      <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ensena-primary/10 text-lg font-semibold text-ensena-primary">
        {item.tutorImage ? <Image src={item.tutorImage} alt={item.tutor} fill sizes="56px" className="object-cover" /> : (item.tutor.trim()[0] ?? "?").toUpperCase()}
      </div>

      <div className="min-w-[170px] flex-1">
        <span className={cn("mb-1 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold", kindStyles[item.kind])}>{item.kind}</span>
        {item.detailsHref ? (
          <Link href={item.detailsHref} className="block hover:underline">
            <p className="font-heading text-base font-semibold text-ensena-ink">{item.title}</p>
            <p className="text-sm text-ensena-muted">with {item.tutor}</p>
          </Link>
        ) : (
          <>
            <p className="font-heading text-base font-semibold text-ensena-ink">{item.title}</p>
            <p className="text-sm text-ensena-muted">with {item.tutor}</p>
          </>
        )}
        {item.extraLine && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ensena-muted">
            <Users className="size-3.5" /> {item.extraLine}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm text-ensena-ink sm:min-w-[170px]">
        <span className="flex items-center gap-1.5">
          <Calendar className="size-3.5 text-ensena-muted" /> {item.dateLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-ensena-muted" /> {item.timeLabel}
        </span>
        {item.startsInLabel && <span className="text-xs font-semibold text-ensena-primary">{item.startsInLabel}</span>}
        {!item.startsInLabel && item.kind !== "Group Class" && (
          <span className="flex items-center gap-1.5 text-xs text-ensena-muted">
            <Video className="size-3.5" /> {item.modeLabel ?? "Online"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm sm:min-w-[150px]">
        {item.statusPill ? (
          <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", item.statusPill.tint)}>{item.statusPill.label}</span>
        ) : (
          <>
            <span className="text-xs text-ensena-muted">{item.bookingIdLabel}</span>
            <span className="flex items-center gap-1.5 font-mono text-sm font-medium text-ensena-ink">
              {item.bookingId}
              <CopyId value={item.bookingId} />
            </span>
          </>
        )}
        {item.reviewBadge && <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", item.reviewBadge.tint)}>{item.reviewBadge.label}</span>}
        {item.attendanceBadge && <span className={cn("w-fit rounded-full px-2.5 py-1 text-xs font-semibold", item.attendanceBadge.tint)}>{item.attendanceBadge.label}</span>}
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        {item.actionHref ? (
          <Button
            variant="outline"
            nativeButton={false}
            disabled={item.actionDisabled}
            render={<Link href={item.actionHref} />}
            className="h-10 flex-1 rounded-full border-ensena-primary px-4 text-sm font-medium text-ensena-primary hover:bg-ensena-primary/5 sm:flex-initial"
          >
            {item.actionLabel}
          </Button>
        ) : (
          <Button
            onClick={item.onAction}
            disabled={item.actionDisabled}
            className={cn(
              "h-10 flex-1 rounded-full px-4 text-sm font-semibold sm:flex-initial",
              item.actionLabel === "Confirm Lesson" ? "bg-ensena-primary text-white" : "border border-ensena-border bg-ensena-surface text-ensena-ink hover:bg-ensena-bg-soft"
            )}
          >
            {item.actionLabel}
          </Button>
        )}
        <button type="button" aria-label="More options" onClick={item.onKebab} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft">
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}
