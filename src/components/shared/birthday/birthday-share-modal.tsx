"use client";

import { useState } from "react";
import {
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BirthdayCard } from "@/components/shared/birthday/birthday-card";
import { generateBirthdayCardImage } from "@/lib/birthday-image-generator";
import { defaultShareCaption, type BirthdayCardData } from "@/lib/birthday-data";
import { cn } from "@/lib/utils";

// lucide-react ships no brand/social-network glyphs, so these platform
// icons are small inline SVGs (same convention for all four below).
function XIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M12 0C8.74 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.058-1.28.072-1.687.072-4.947s-.014-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.014 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.36-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.06-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4 2.209 0 4 1.791 4 4 0 2.21-1.791 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.645-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  );
}

function LinkedinIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function BirthdayShareModal({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data: BirthdayCardData;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(defaultShareCaption);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2400);
  }

  if (!open) return null;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://ensena.co";

  async function withGeneratedImage(action: string, run: (blob: Blob) => Promise<void> | void) {
    setBusy(action);
    try {
      const blob = await generateBirthdayCardImage(data);
      await run(blob);
    } catch {
      flash("Something went wrong generating the card. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function handleDownload() {
    withGeneratedImage("download", (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ensena-birthday-card.png";
      a.click();
      URL.revokeObjectURL(url);
      flash("Card saved!");
    });
  }

  function handleNativeShare() {
    withGeneratedImage("native", async (blob) => {
      const file = new File([blob], "ensena-birthday-card.png", { type: "image/png" });
      const canShareFiles = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      if (navigator.share && canShareFiles) {
        try {
          await navigator.share({ files: [file], title: "My Ensena Birthday Card", text: caption });
        } catch (err) {
          if ((err as Error).name !== "AbortError") flash("Sharing was cancelled or failed.");
        }
      } else if (navigator.share) {
        try {
          await navigator.share({ title: "My Ensena Birthday Card", text: caption, url: siteUrl });
        } catch (err) {
          if ((err as Error).name !== "AbortError") flash("Sharing was cancelled or failed.");
        }
      } else {
        flash("Native sharing isn't supported on this browser. Try Download or one of the options below.");
      }
    });
  }

  function openIntent(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const socialTargets = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      onClick: () => openIntent(`https://wa.me/?text=${encodeURIComponent(`${caption} ${siteUrl}`)}`),
    },
    {
      label: "Facebook",
      icon: FacebookIcon,
      onClick: () => openIntent(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl)}&quote=${encodeURIComponent(caption)}`),
    },
    {
      label: "X",
      icon: XIcon,
      onClick: () => openIntent(`https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(siteUrl)}`),
    },
    {
      label: "LinkedIn",
      icon: LinkedinIcon,
      onClick: () => openIntent(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(siteUrl)}`),
    },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="birthday-share-title">
      <div className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ensena-border px-5 py-4">
          <h2 id="birthday-share-title" className="font-heading text-lg font-semibold text-ensena-ink">Share your birthday 🎉</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full text-ensena-muted hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary">
            <X className="size-4.5" />
          </button>
        </div>

        <div className="flex-1 p-5">
          <div className="mx-auto max-w-[280px]">
            <BirthdayCard {...data} variant="social" />
          </div>

          <label className="mt-5 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ensena-ink">Caption</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              aria-label="Edit share caption"
              className="rounded-xl border border-ensena-border p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
            />
          </label>

          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              onClick={handleNativeShare}
              disabled={busy !== null}
              className="mt-4 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
            >
              {busy === "native" ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />} Share
            </Button>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {socialTargets.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={t.onClick}
                aria-label={`Share to ${t.label}`}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-ensena-border p-2.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
              >
                <t.icon className="size-4.5" />
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => flash("Save the card, then share it from your Instagram app.")}
              aria-label="Instagram: save then share manually"
              className="flex flex-col items-center gap-1.5 rounded-xl border border-ensena-border p-2.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
            >
              <InstagramIcon className="size-4.5" />
              Instagram
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(siteUrl); flash("Link copied!"); }}
              className={cn("flex items-center justify-center gap-1.5 rounded-full border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary")}
            >
              <Copy className="size-4" /> Copy Link
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy !== null}
              className="flex items-center justify-center gap-1.5 rounded-full border border-ensena-border py-2.5 text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-ensena-primary"
            >
              {busy === "download" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Save Card
            </button>
          </div>

          <button type="button" onClick={onClose} className="mt-4 w-full text-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
            Cancel
          </button>
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
