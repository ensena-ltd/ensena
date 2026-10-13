"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

// Shared by both directions — a student reviewing a tutor and a tutor
// reviewing a student use the exact same form; only the copy and the
// eventual submitReview() direction differ at the call site.
export function WriteReviewModal({
  open,
  onClose,
  recipientName,
  title,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  recipientName: string;
  title: string;
  onSubmit: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  function handleSubmit() {
    if (rating < 1) return;
    onSubmit(rating, comment.trim());
    setRating(0);
    setComment("");
  }

  function handleClose() {
    setRating(0);
    setComment("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ensena-muted">Your review of {recipientName} is permanent once submitted and cannot be edited or deleted afterward.</p>
        <div className="flex items-center justify-center gap-1.5 py-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const value = i + 1;
            const filled = value <= (hoverRating || rating);
            return (
              <button
                key={value}
                type="button"
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1"
              >
                <Star className={cn("size-8", filled ? "fill-amber-400 text-amber-400" : "text-ensena-border")} />
              </button>
            );
          })}
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Write your review</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Share how the lesson went…" className="rounded-lg border border-ensena-border p-2.5 text-sm" />
        </label>
        <Button disabled={rating < 1} onClick={handleSubmit} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:cursor-not-allowed disabled:opacity-40">
          Submit Review
        </Button>
      </div>
    </Modal>
  );
}
