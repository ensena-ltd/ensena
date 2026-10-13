"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitSupportTicket } from "@/lib/actions/support";
import { submitSupportRequest } from "@/lib/support-store";
import { uploadSupportFiles } from "@/lib/support-uploads";
import { SUPPORT_CONTEXT_CONFIG, SUPPORT_EMAIL, type RelatedRecordType, type SupportAttachment, type SupportContext, type SupportSource, type SupportUserRole } from "@/lib/support-data";

export interface RelatedRecordSummary {
  type: RelatedRecordType;
  id: string;
  label: string;
  lines: { label: string; value: string }[];
}

// The one reusable "Contact Support" form — every context (public,
// tutor-signup, student, tutor, booking, group-class, payment, payout,
// counselling, account, technical) renders through this same component,
// just with a different context config and (optionally) a real related
// record already attached, so the user never has to re-explain what they're
// asking about.
export function SupportRequestForm({
  context,
  userRole,
  userName,
  related,
  presetCategory,
  source = "Ticket",
  live = false,
  onSubmitted,
}: {
  context: SupportContext;
  userRole: SupportUserRole;
  userName: string;
  related?: RelatedRecordSummary;
  presetCategory?: string;
  source?: SupportSource;
  /** Save to the real database (the requester comes from the session; a guest types a name + email). */
  live?: boolean;
  onSubmitted: (id: string) => void;
}) {
  const router = useRouter();
  const config = SUPPORT_CONTEXT_CONFIG[context];
  const [category, setCategory] = useState(presetCategory && config.categories.includes(presetCategory) ? presetCategory : "");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<(SupportAttachment & { file: File })[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined));
  const isGuest = live && userRole === "Guest";
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = category !== "" && message.trim() !== "" && (!isGuest || (guestName.trim() !== "" && guestEmail.trim() !== "")) && !submitting;
  const showEmailHint = context === "technical" || category.toLowerCase().startsWith("technical");

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Attachments must be 5MB or smaller.");
      return;
    }
    if (attachments.length >= 5) {
      setError("You can attach up to 5 files.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAttachments((prev) => [...prev, { name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB`, dataUrl: reader.result as string, file }]);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    if (live) {
      try {
        const files = attachments.length ? await uploadSupportFiles(attachments.map((a) => a.file), guestKey) : [];
        const result = await submitSupportTicket({
          context,
          category,
          message: message.trim(),
          source,
          relatedRecordType: related?.type,
          relatedRecordId: related?.id,
          relatedRecordLabel: related?.label,
          attachments: files,
          guest: isGuest ? { name: guestName.trim(), email: guestEmail.trim(), key: guestKey } : undefined,
        });
        if (!result.ok) {
          setError(result.message);
          setSubmitting(false);
          return;
        }
        onSubmitted(result.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "We couldn't submit your request. Please try again.");
        setSubmitting(false);
      }
      return;
    }
    try {
      const request = await submitSupportRequest({
        userName,
        userRole,
        context,
        category,
        message: message.trim(),
        source,
        relatedRecordType: related?.type,
        relatedRecordId: related?.id,
        relatedRecordLabel: related?.label,
        attachments: attachments.length ? attachments.map(({ name, size, dataUrl }) => ({ name, size, dataUrl })) : undefined,
      });
      onSubmitted(request.id);
    } catch {
      setError("We couldn't submit your request. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-heading text-xl font-semibold text-ensena-ink sm:text-2xl">{config.title}</h1>
      <p className="mt-1 text-sm text-ensena-muted">{config.subtitle}</p>

      {related && (
        <div className="mt-5 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4">
          <p className="text-sm font-semibold text-ensena-ink">{related.label}</p>
          <dl className="mt-2 flex flex-col gap-1">
            {related.lines.map((line) => (
              <div key={line.label} className="flex justify-between text-xs">
                <dt className="text-ensena-muted">{line.label}</dt>
                <dd className="font-medium text-ensena-ink">{line.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-ensena-ink">
          {context === "booking" || context === "group-class" || context === "payment" || context === "payout" || context === "counselling"
            ? "What do you need help with?"
            : "What are you having trouble with?"}
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          {config.categories.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              aria-pressed={category === option}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                category === option
                  ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink"
                  : "border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft"
              }`}
            >
              {option}
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  category === option ? "border-ensena-primary bg-ensena-primary" : "border-ensena-border"
                }`}
              >
                {category === option && <span className="size-1.5 rounded-full bg-white" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isGuest && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ensena-ink">Your name</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} autoComplete="name" className="h-11 rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ensena-ink">Email for our reply</span>
            <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} autoComplete="email" className="h-11 rounded-xl border border-ensena-border px-3 text-sm outline-none focus-visible:border-ensena-primary" />
          </label>
        </div>
      )}

      <label className="mt-6 flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ensena-ink">Describe your issue</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Tell us what's going on…"
          className="rounded-xl border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
      </label>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt" onChange={handleFileSelected} className="hidden" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-xs font-medium text-ensena-muted hover:text-ensena-ink">
          <Paperclip className="size-3.5" /> Attach a screenshot or file
        </button>
        {attachments.map((a) => (
          <span key={a.name} className="flex items-center gap-1.5 rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs text-ensena-ink">
            {a.name}
            <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setAttachments((prev) => prev.filter((x) => x.name !== a.name))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>

      {showEmailHint && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-ensena-bg-soft px-4 py-3 text-xs text-ensena-muted">
          <Mail className="mt-0.5 size-3.5 shrink-0 text-ensena-primary" />
          <span>
            For technical problems you can also email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-ensena-primary hover:underline">{SUPPORT_EMAIL}</a>. A screenshot of the error and the page you were on helps us fix it faster.
          </span>
        </p>
      )}

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-6 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover disabled:pointer-events-none disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send Request"}
      </Button>
      <button type="button" onClick={() => router.back()} className="mt-3 flex h-9 w-full items-center justify-center text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        Cancel
      </button>
    </div>
  );
}

export function SupportSubmittedConfirmation({ supportId, viewHref }: { supportId: string; viewHref?: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
        <CheckCircle2 className="size-7" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold text-ensena-ink">Your support request has been submitted</h1>
      <p className="mt-1 text-sm text-ensena-muted">We&apos;ll get back to you as soon as possible. Keep this reference for your records.</p>
      <span className="mt-4 rounded-full bg-ensena-bg-soft px-4 py-1.5 font-mono text-sm font-semibold tracking-wide text-ensena-ink">{supportId}</span>
      {viewHref && (
        <Button nativeButton={false} render={<Link href={viewHref} />} className="mt-6 h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-ensena-primary-hover">
          View Request
        </Button>
      )}
    </div>
  );
}
