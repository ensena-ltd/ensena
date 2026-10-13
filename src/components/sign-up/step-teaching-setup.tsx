"use client";

import { AvailabilityBuilder } from "@/components/sign-up/availability-builder";
import { RequiredLabel } from "@/components/sign-up/required-label";
import { formatNaira } from "@/lib/format";
import type { TutorSignupForm } from "@/lib/tutor-signup-data";

export function StepTeachingSetup({
  form,
  update,
  stepLabel = "Step 4 of 4",
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
  stepLabel?: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">{stepLabel}</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Teaching Setup
      </h2>
      <p className="mt-1 text-ensena-muted">Set your rate, your availability and a short bio.</p>

      <label className="mt-6 flex max-w-xs flex-col gap-1.5">
        <RequiredLabel>Hourly rate</RequiredLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ensena-muted">₦</span>
          <input
            type="number"
            value={form.oneOnOnePrice}
            onChange={(e) => update({ oneOnOnePrice: e.target.value })}
            placeholder="3,000"
            className="h-11 w-full rounded-xl border border-ensena-border bg-transparent pl-7 pr-16 text-sm outline-none focus-visible:border-ensena-primary"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ensena-muted">/ hour</span>
        </div>
        <span className="text-xs text-ensena-muted">
          Recommended: {formatNaira(800)} – {formatNaira(3000)}
        </span>
      </label>

      <div className="mt-6">
        <RequiredLabel>Availability (WAT · Africa/Lagos)</RequiredLabel>
        <p className="text-xs text-ensena-muted">Set your regular weekly availability</p>
        <div className="mt-2">
          <AvailabilityBuilder availability={form.availability} onChange={(availability) => update({ availability })} />
        </div>
      </div>

      <label className="mt-6 flex flex-col gap-1.5">
        <RequiredLabel>Short tutor bio</RequiredLabel>
        <textarea
          value={form.bio}
          onChange={(e) => update({ bio: e.target.value.slice(0, 240) })}
          placeholder="In 2-3 sentences, tell students about your teaching style and experience."
          rows={3}
          className="w-full rounded-xl border border-ensena-border bg-transparent p-3 text-sm outline-none focus-visible:border-ensena-primary"
        />
        <span className="self-end text-xs text-ensena-muted">{form.bio.length}/240</span>
      </label>

      <p className="mt-6 text-xs text-ensena-muted">
        You can add an intro video, teaching materials, certifications, detailed experience and social
        links from your dashboard once you&apos;re set up.
      </p>
    </div>
  );
}
