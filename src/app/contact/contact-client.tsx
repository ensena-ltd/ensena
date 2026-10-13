"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicPageHero } from "@/components/public-pages/public-page-hero";
import { ContentSection } from "@/components/public-pages/content-section";
import { contactCategories } from "@/lib/contact-data";
import { submitContactMessage, type ContactFormState } from "@/lib/actions/contact";
import { cn } from "@/lib/utils";

const roleOptions = ["Student", "Parent / Guardian", "Tutor", "Other"] as const;

const initialState: ContactFormState = { status: "idle" };

export function ContactClient() {
  const [state, formAction, pending] = useActionState(submitContactMessage, initialState);

  return (
    <div>
      <PublicPageHero title="How can we help?" subtitle="Choose a category below and send us a message. Our team will get back to you." />

      <ContentSection>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {contactCategories.map((category) => (
            <div key={category} className="rounded-2xl border border-ensena-border p-4 text-center text-sm font-medium text-ensena-ink">
              {category}
            </div>
          ))}
        </div>

        {state.status === "success" ? (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-bg-soft px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-ensena-success/10 text-ensena-success">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="font-heading text-base font-semibold text-ensena-ink">
              Thanks for contacting Ensena. We&apos;ve received your message.
            </p>
            <p className="max-w-sm text-sm text-ensena-muted">We&apos;ll get back to you as soon as we can.</p>
          </div>
        ) : (
          <form action={formAction} className="mt-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-ensena-ink">Name</span>
                <Input name="name" type="text" required className="h-11 rounded-lg" />
                {state.fieldErrors?.name && <span className="text-xs text-rose-600">{state.fieldErrors.name}</span>}
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-ensena-ink">Email</span>
                <Input name="email" type="email" required className="h-11 rounded-lg" />
                {state.fieldErrors?.email && <span className="text-xs text-rose-600">{state.fieldErrors.email}</span>}
              </label>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">I am a...</span>
              <select name="role" required defaultValue="" className="h-11 rounded-lg border border-ensena-border px-3 text-sm">
                <option value="" disabled>Select one</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {state.fieldErrors?.role && <span className="text-xs text-rose-600">{state.fieldErrors.role}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Reason for contacting</span>
              <select name="category" required defaultValue="" className="h-11 rounded-lg border border-ensena-border px-3 text-sm">
                <option value="" disabled>Select a category</option>
                {contactCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {state.fieldErrors?.category && <span className="text-xs text-rose-600">{state.fieldErrors.category}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Subject</span>
              <Input name="subject" type="text" required className="h-11 rounded-lg" />
              {state.fieldErrors?.subject && <span className="text-xs text-rose-600">{state.fieldErrors.subject}</span>}
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ensena-ink">Message</span>
              <textarea
                name="message"
                required
                rows={5}
                className={cn(
                  "rounded-lg border border-ensena-border p-3 text-sm outline-none focus-visible:border-ensena-primary"
                )}
              />
              {state.fieldErrors?.message && <span className="text-xs text-rose-600">{state.fieldErrors.message}</span>}
            </label>

            {state.status === "error" && state.message && !state.fieldErrors && (
              <p className="text-sm text-rose-600">{state.message}</p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-2 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)] disabled:opacity-60 sm:w-fit sm:px-8"
            >
              {pending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        )}
      </ContentSection>
    </div>
  );
}
