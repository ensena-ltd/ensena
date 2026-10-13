"use client";

import Link from "next/link";
import { X } from "lucide-react";

// Shared "you need an account for this" prompt for a logged-out visitor
// tapping something that only makes sense with a real account (wishlist,
// profile, notifications) — reused by mobile-bottom-nav.tsx and header.tsx
// rather than duplicated, since both need the exact same experience.
export function AuthPromptModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-prompt-title"
    >
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-default" />
      <div className="relative w-full rounded-t-3xl bg-white p-5 sm:max-w-sm sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 id="auth-prompt-title" className="font-heading text-lg font-semibold text-ensena-ink">
            {message}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft"
          >
            <X className="size-4.5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-ensena-muted">You need an Enseña account to continue.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/sign-in"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full border border-ensena-border text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
