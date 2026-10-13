"use client";

import { useState } from "react";
import { Calendar, Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { RequiredLabel } from "@/components/sign-up/required-label";
import type { TutorSignupForm } from "@/lib/tutor-signup-data";
import { isAtLeastAge, latestDobForAge, TUTOR_AGE_MESSAGE, TUTOR_MIN_AGE } from "@/lib/age";

export function StepPersonalInfo({
  form,
  update,
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password !== form.confirmPassword;

  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">Step 1 of 4</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Basic Information
      </h2>
      <p className="mt-1 text-ensena-muted">
        Let&apos;s start with the basics. Create your Ensena tutor account.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <RequiredLabel>First name</RequiredLabel>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              placeholder="Enter your first name"
              className="h-11 rounded-xl border-ensena-border pl-9"
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <RequiredLabel>Last name</RequiredLabel>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              value={form.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              placeholder="Enter your last name"
              className="h-11 rounded-xl border-ensena-border pl-9"
            />
          </div>
        </label>
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <RequiredLabel>Date of birth</RequiredLabel>
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <Input
            type="date"
            value={form.dob}
            max={latestDobForAge(TUTOR_MIN_AGE)}
            onChange={(e) => update({ dob: e.target.value })}
            className="h-11 rounded-xl border-ensena-border pl-9"
          />
        </div>
        {form.dob && !isAtLeastAge(form.dob, TUTOR_MIN_AGE) ? (
          <span className="text-xs font-medium text-rose-600">{TUTOR_AGE_MESSAGE}</span>
        ) : (
          <span className="text-xs text-ensena-muted">Tutors must be {TUTOR_MIN_AGE} or older.</span>
        )}
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <RequiredLabel>Email address</RequiredLabel>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="Enter your email address"
            className="h-11 rounded-xl border-ensena-border pl-9"
          />
        </div>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <RequiredLabel>Phone number</RequiredLabel>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
          <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 text-sm text-ensena-muted">
            +234
          </span>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => update({ phone: e.target.value })}
            placeholder="080 1234 5678"
            className="h-11 rounded-xl border-ensena-border pl-[4.5rem]"
          />
        </div>
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <RequiredLabel>Password</RequiredLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update({ password: e.target.value })}
              placeholder="Create a strong password"
              className="h-11 rounded-xl border-ensena-border px-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ensena-muted hover:text-ensena-ink"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <RequiredLabel>Confirm password</RequiredLabel>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ensena-muted" />
            <Input
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update({ confirmPassword: e.target.value })}
              placeholder="Confirm your password"
              className="h-11 rounded-xl border-ensena-border px-9"
              aria-invalid={passwordsMismatch}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ensena-muted hover:text-ensena-ink"
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {passwordsMismatch && (
            <span className="text-xs font-medium text-red-600">Passwords do not match</span>
          )}
        </label>
      </div>
    </div>
  );
}
