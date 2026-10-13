"use client";

import { useEffect } from "react";
import Image from "next/image";
import { ChevronRight, X } from "lucide-react";

import type { ManageLessonAction, ManageLessonData } from "@/lib/manage-lesson-types";
import { cn } from "@/lib/utils";

export function ManageLessonSheet({
  open,
  data,
  actions,
  onClose,
}: {
  open: boolean;
  data: ManageLessonData | null;
  actions: ManageLessonAction[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-lesson-title"
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="manage-lesson-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {data.sheetTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
          >
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 py-4">
          {data.image && (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-full">
              <Image src={data.image} alt={data.subtitle ?? data.title} fill sizes="44px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ensena-ink">{data.title}</p>
            {data.subtitle && <p className="truncate text-xs text-ensena-muted">{data.subtitle}</p>}
          </div>
          <span className="shrink-0 text-xs font-medium text-ensena-muted">{data.statusLabel}</span>
        </div>

        <div className="flex flex-col px-2 pb-2">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                action.variant === "danger"
                  ? "text-rose-600 hover:bg-rose-50"
                  : action.variant === "primary"
                    ? "text-ensena-primary hover:bg-ensena-primary/5"
                    : "text-ensena-ink hover:bg-ensena-bg-soft"
              )}
            >
              <action.icon className="size-4.5 shrink-0" />
              <span className="flex-1">{action.label}</span>
              <ChevronRight className="size-4 shrink-0 text-ensena-border" />
            </button>
          ))}
        </div>

        <div className="border-t border-ensena-border px-5 py-4">
          <dl className="flex flex-col gap-2 text-sm">
            {data.infoRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <dt className="text-ensena-muted">{row.label}</dt>
                <dd className="text-right font-medium text-ensena-ink">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ensena-muted">Lesson ID</dt>
              <dd className="text-right font-medium text-ensena-ink">{data.bookingRef}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
