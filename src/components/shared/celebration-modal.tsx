"use client";

import { Button } from "@/components/ui/button";
import type { CelebrationContent } from "@/lib/milestones-data";

const confettiColors = ["#F80248", "#CBEFFF", "#FFC857", "#1FA971"];

function ConfettiPiece({ i }: { i: number }) {
  const left = (i * 37) % 100;
  const delay = (i % 6) * 0.15;
  const duration = 2.2 + (i % 5) * 0.3;
  const color = confettiColors[i % confettiColors.length];
  const size = 6 + (i % 3) * 3;
  return (
    <span
      className="absolute top-0 rounded-sm opacity-90"
      style={{
        left: `${left}%`,
        width: size,
        height: size * 1.6,
        backgroundColor: color,
        animation: `celebration-fall ${duration}s ease-in ${delay}s 1 forwards`,
      }}
    />
  );
}

export function CelebrationModal({
  open,
  content,
  onClose,
  ctaLabel = "Continue to Dashboard",
}: {
  open: boolean;
  content: CelebrationContent;
  onClose: () => void;
  ctaLabel?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-6">
      <style>{`
        @keyframes celebration-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(420px) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ensena-border bg-ensena-surface p-8 text-center shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
          {Array.from({ length: 24 }, (_, i) => <ConfettiPiece key={i} i={i} />)}
        </div>

        <h2 className="font-heading text-2xl font-semibold text-ensena-ink">{content.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-ensena-muted">{content.message}</p>
        {content.signature && <p className="mt-3 text-sm font-medium text-ensena-primary">{content.signature}</p>}

        <Button onClick={onClose} className="mt-7 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
