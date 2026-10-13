"use client";

import { CheckCircle2, Clock, Landmark, Lock, ShieldCheck } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckboxRow } from "@/components/sign-up/option-card";
import { ProgressRing } from "@/components/sign-up/progress-ring";
import {
  communityGuidelines,
  notificationPreferenceOptions,
  relationshipOptions,
  whatHappensNext,
  type TutorSignupForm,
} from "@/lib/tutor-signup-data";

const nigerianBanks = [
  "Access Bank",
  "GTBank",
  "Zenith Bank",
  "First Bank",
  "UBA",
  "Kuda",
  "Opay",
  "Moniepoint",
];

function completionSummary(form: TutorSignupForm) {
  const items = [
    { label: "Personal Information", done: !!(form.firstName && form.email && form.password) },
    { label: "Tutor Profile", done: !!(form.headline && form.bio) },
    { label: "Teaching Details & Pricing", done: form.levels.length > 0 && form.levelExpertise.length > 0 },
    { label: "Verification Documents", done: !!(form.idFileName && form.selfieFileName) },
    { label: "Payment Details", done: !!form.accountNumber },
  ];
  const percent = (items.filter((i) => i.done).length / items.length) * 100;
  return { items, percent };
}

export function StepPayments({
  form,
  update,
  onSubmit,
}: {
  form: TutorSignupForm;
  update: (patch: Partial<TutorSignupForm>) => void;
  onSubmit: () => void;
}) {
  const { items, percent } = completionSummary(form);
  const accountVerified = form.accountNumber.replace(/\D/g, "").length >= 10;
  const allGuidelinesAccepted = communityGuidelines.every((g) => form.guidelinesAccepted[g.key]);

  return (
    <div>
      <p className="text-sm font-semibold text-ensena-primary">Step 5 of 5</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold text-ensena-ink">
        Payments &amp; Publish Profile
      </h2>
      <p className="mt-1 text-ensena-muted">
        You&apos;re almost there! Set up your payout details and submit your profile for
        verification.
      </p>

      <section className="mt-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ensena-ink">
          <Landmark className="size-4 text-ensena-primary" /> 1. Payout Method
        </h3>
        <p className="text-xs text-ensena-muted">Payments are paid out directly to your Nigerian bank account</p>

        <section className="mt-3 rounded-xl bg-ensena-bg-soft p-4">
          <h4 className="text-sm font-semibold text-ensena-ink">Bank Details</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ensena-muted">Bank</span>
              <Select value={form.bankName} onValueChange={(v) => v && update({ bankName: v })}>
                <SelectTrigger className="h-10 w-full rounded-xl border-ensena-border">
                  <SelectValue placeholder="Select your bank" />
                </SelectTrigger>
                <SelectContent>
                  {nigerianBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ensena-muted">Account Number</span>
              <Input
                value={form.accountNumber}
                onChange={(e) => update({ accountNumber: e.target.value })}
                placeholder="Enter account number"
                className="h-10 rounded-xl border-ensena-border"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1.5">
            <span className="text-xs text-ensena-muted">Account Name</span>
            <div className="relative">
              <Input
                value={accountVerified ? form.accountName || `${form.firstName} ${form.lastName}`.trim() : ""}
                onChange={(e) => update({ accountName: e.target.value })}
                placeholder="Account name will appear here"
                disabled={!accountVerified}
                className="h-10 rounded-xl border-ensena-border pr-24"
              />
              {accountVerified && (
                <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-ensena-success/10 px-2 py-1 text-xs font-semibold text-ensena-success">
                  Verified <CheckCircle2 className="size-3.5" />
                </span>
              )}
            </div>
          </label>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ensena-muted">
            <Lock className="size-3.5" /> Your bank details are encrypted and secure.
          </p>
        </section>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-ensena-ink">2. Tax Information</h3>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ensena-muted">Country</span>
              <Select value={form.taxCountry} onValueChange={(v) => v && update({ taxCountry: v })}>
                <SelectTrigger className="h-10 w-full rounded-xl border-ensena-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nigeria">Nigeria</SelectItem>
                  <SelectItem value="Ghana">Ghana</SelectItem>
                  <SelectItem value="Kenya">Kenya</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-ensena-muted">Tax Identification Number (Optional)</span>
              <Input
                value={form.tin}
                onChange={(e) => update({ tin: e.target.value })}
                placeholder="Enter TIN (if available)"
                className="h-10 rounded-xl border-ensena-border"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">3. Emergency Contact</h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ensena-muted">Full Name</span>
            <Input
              value={form.emergencyName}
              onChange={(e) => update({ emergencyName: e.target.value })}
              placeholder="Enter full name"
              className="h-10 rounded-xl border-ensena-border"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ensena-muted">Relationship</span>
            <Select
              value={form.emergencyRelationship}
              onValueChange={(v) => v && update({ emergencyRelationship: v })}
            >
              <SelectTrigger className="h-10 w-full rounded-xl border-ensena-border">
                <SelectValue placeholder="e.g. Parent, Sibling, Spouse" />
              </SelectTrigger>
              <SelectContent>
                {relationshipOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ensena-muted">Phone Number</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ensena-muted">
                +234
              </span>
              <Input
                type="tel"
                value={form.emergencyPhone}
                onChange={(e) => update({ emergencyPhone: e.target.value })}
                placeholder="Enter phone number"
                className="h-10 rounded-xl border-ensena-border pl-14"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">4. Notification Preferences</h3>
        <p className="text-xs text-ensena-muted">Choose what you&apos;d like to be notified about</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {notificationPreferenceOptions.map((pref) => (
            <label
              key={pref}
              className="flex flex-col items-center gap-2 rounded-xl border border-ensena-border p-3 text-center text-xs font-medium text-ensena-ink"
            >
              {pref}
              <input
                type="checkbox"
                checked={form.notificationPreferences.includes(pref)}
                onChange={() =>
                  update({
                    notificationPreferences: form.notificationPreferences.includes(pref)
                      ? form.notificationPreferences.filter((p) => p !== pref)
                      : [...form.notificationPreferences, pref],
                  })
                }
                className="size-4 accent-ensena-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold text-ensena-ink">5. Community Guidelines</h3>
        <p className="text-xs text-ensena-muted">Please read and agree to the following</p>
        <div className="mt-2 flex flex-col gap-2">
          {communityGuidelines.map((item) => (
            <CheckboxRow
              key={item.key}
              label={item.label}
              checked={!!form.guidelinesAccepted[item.key]}
              onChange={() =>
                update({
                  guidelinesAccepted: {
                    ...form.guidelinesAccepted,
                    [item.key]: !form.guidelinesAccepted[item.key],
                  },
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <h3 className="text-sm font-semibold text-ensena-ink">6. Final Review</h3>
          <p className="text-xs text-ensena-muted">Review your progress before submitting</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {items.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5 text-sm text-ensena-ink">
                <CheckCircle2
                  className={`size-4 shrink-0 ${item.done ? "text-ensena-success" : "text-ensena-border"}`}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-ensena-border p-4 text-center">
          <ProgressRing percent={percent} size={88} />
          <p className="text-xs font-medium text-ensena-ink">Profile Completion</p>
          <p className="text-xs text-ensena-muted">
            {percent === 100 ? "Great job! You're all set." : "Complete the steps above."}
          </p>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <h3 className="text-sm font-semibold text-ensena-ink">7. What happens next?</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {whatHappensNext.map((step, i) => (
              <li key={step} className="flex items-start gap-2 text-sm text-ensena-muted">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-ensena-primary text-xs font-semibold text-ensena-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="w-full rounded-xl border border-ensena-border p-4 sm:w-56">
          <p className="text-xs font-semibold text-ensena-muted">Status Preview</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600">
            <Clock className="size-4" /> Pending Verification
          </p>
          <p className="mt-1 text-xs text-ensena-muted">Your profile is currently under review.</p>
          <p className="mt-2 text-xs text-ensena-muted">Average review time</p>
          <p className="text-sm font-semibold text-ensena-ink">24 – 48 hours</p>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-ensena-primary bg-ensena-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
          <div>
            <p className="text-sm font-semibold text-ensena-ink">Submit for Verification</p>
            <p className="text-xs text-ensena-muted">
              Your profile will be reviewed before it becomes visible to students.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!allGuidelinesAccepted}
          onClick={onSubmit}
          className="h-10 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit for Verification →
        </button>
      </div>
      {!allGuidelinesAccepted && (
        <p className="mt-2 text-xs text-red-600">
          Please agree to all community guidelines above before submitting.
        </p>
      )}
    </div>
  );
}
