"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FullDetailsTab {
  key: string;
  label: string;
  content: React.ReactNode;
}

export interface FullDetailsAction {
  key: string;
  label: string;
  onClick: () => void;
  variant?: "default" | "success" | "warning" | "danger" | "primary";
}

const actionStyles: Record<NonNullable<FullDetailsAction["variant"]>, string> = {
  default: "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft",
  primary: "border-transparent bg-ensena-primary text-white hover:bg-[var(--ensena-primary-hover)]",
  success: "border-ensena-border text-ensena-success hover:bg-ensena-success/10",
  warning: "border-ensena-border text-amber-600 hover:bg-amber-50",
  danger: "border-ensena-border text-rose-600 hover:bg-rose-50",
};

export function FullDetailsPageLayout({
  backHref,
  backLabel = "Back",
  image,
  name,
  subtitle,
  badges,
  actions = [],
  tabs,
  defaultTab,
}: {
  backHref: string;
  backLabel?: string;
  image?: string;
  name: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: FullDetailsAction[];
  tabs: FullDetailsTab[];
  defaultTab?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  return (
    <div>
      <Link href={backHref} className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> {backLabel}
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {image && (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full">
              <Image src={image} alt={name} fill sizes="64px" className="object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate font-heading text-xl font-semibold text-ensena-ink">{name}</h1>
            {subtitle && <p className="truncate text-sm text-ensena-muted">{subtitle}</p>}
            {badges && <div className="mt-1.5 flex flex-wrap gap-1.5">{badges}</div>}
          </div>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className={cn(
                  "h-9 rounded-full border px-4 text-xs font-semibold",
                  actionStyles[action.variant ?? "default"]
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-1.5 overflow-x-auto rounded-full bg-ensena-bg-soft p-1 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 font-medium",
              activeTab === tab.key ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5">{active?.content}</div>
    </div>
  );
}
