"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronRight, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface QuickDrawerAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "danger";
}

export interface QuickDrawerInfoRow {
  label: string;
  value: React.ReactNode;
}

export interface QuickDrawerActivityItem {
  label: string;
  time: string;
}

const actionStyles: Record<NonNullable<QuickDrawerAction["variant"]>, string> = {
  default: "text-ensena-ink hover:bg-ensena-bg-soft",
  success: "text-ensena-success hover:bg-ensena-success/10",
  warning: "text-amber-600 hover:bg-amber-50",
  danger: "text-rose-600 hover:bg-rose-50",
};

export function QuickSummaryDrawer({
  open,
  onClose,
  image,
  name,
  idLabel,
  badges,
  keyInfo,
  recentActivity,
  actions,
  onViewFullDetails,
}: {
  open: boolean;
  onClose: () => void;
  image?: string;
  name: string;
  idLabel?: string;
  badges?: React.ReactNode;
  keyInfo?: QuickDrawerInfoRow[];
  recentActivity?: QuickDrawerActivityItem[];
  actions: QuickDrawerAction[];
  onViewFullDetails: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ensena-ink/40 backdrop-blur-sm"
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ensena-border bg-ensena-surface shadow-xl">
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-ensena-border bg-ensena-surface p-5">
          <div className="flex items-center gap-3">
            {image && (
              <div className="relative size-12 shrink-0 overflow-hidden rounded-full">
                <Image src={image} alt={name} fill sizes="48px" className="object-cover" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ensena-ink">{name}</p>
              {idLabel && <p className="truncate text-xs text-ensena-muted">{idLabel}</p>}
              {badges && <div className="mt-1 flex flex-wrap gap-1">{badges}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 p-5">
          {keyInfo && keyInfo.length > 0 && (
            <div className="rounded-xl border border-ensena-border p-3.5">
              <p className="text-xs font-semibold text-ensena-ink">Key Information</p>
              <dl className="mt-2 flex flex-col gap-1.5 text-xs">
                {keyInfo.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-ensena-muted">{row.label}</dt>
                    <dd className="truncate text-right font-medium text-ensena-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {recentActivity && recentActivity.length > 0 && (
            <div className="mt-4 rounded-xl border border-ensena-border p-3.5">
              <p className="text-xs font-semibold text-ensena-ink">Recent Activity</p>
              <ul className="mt-2 flex flex-col gap-1.5 text-xs">
                {recentActivity.map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="text-ensena-ink">{item.label}</span>
                    <span className="shrink-0 text-ensena-muted">{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-semibold text-ensena-ink">Quick Actions</p>
            <div className="mt-2 flex flex-col gap-1">
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium",
                    actionStyles[action.variant ?? "default"]
                  )}
                >
                  <action.icon className="size-4 shrink-0" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-ensena-border bg-ensena-surface p-5">
          <button
            type="button"
            onClick={onViewFullDetails}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-ensena-primary py-2.5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            View Full Details <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
