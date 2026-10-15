"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, MonitorSmartphone, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmSignInDevice, denySignInDevice } from "@/lib/actions/device-security";
import { cn } from "@/lib/utils";

export function DeviceReviewClient({
  token,
  initialAnswer,
  device,
}: {
  token: string;
  initialAnswer: "yes" | "no" | null;
  device: { name: string; when: string; location: string | null; ip: string | null };
}) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [done, setDone] = useState<{ ok: boolean; answer: "yes" | "no"; message: string } | null>(null);

  async function answer(choice: "yes" | "no") {
    setBusy(choice);
    const result = choice === "yes" ? await confirmSignInDevice(token) : await denySignInDevice(token);
    setBusy(null);
    setDone({ ...result, answer: choice });
  }

  if (done) {
    const secured = done.ok && done.answer === "no";
    return (
      <div className="text-center">
        {secured ? <ShieldAlert className="mx-auto size-12 text-rose-500" /> : <CheckCircle2 className={cn("mx-auto size-12", done.ok ? "text-ensena-success" : "text-ensena-muted")} />}
        <h1 className="mt-3 font-heading text-xl font-semibold text-ensena-ink">{!done.ok ? "Nothing to do" : secured ? "Your account is secured" : "Thanks for confirming"}</h1>
        <p className="mt-2 text-sm text-ensena-muted">{done.message}</p>
        <Link href={secured ? "/forgot-password" : "/sign-in"} className="mt-6 inline-flex rounded-full bg-ensena-primary px-5 py-2.5 text-sm font-semibold text-white">
          {secured ? "Reset my password" : "Go to Ensena"}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-center font-heading text-xl font-semibold text-ensena-ink">Was this you?</h1>
      <p className="mt-2 text-center text-sm text-ensena-muted">Someone signed in to your Ensena account from a device we don&apos;t recognise.</p>

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-ensena-bg-soft p-4">
        <MonitorSmartphone className="mt-0.5 size-5 shrink-0 text-ensena-primary" />
        <dl className="flex flex-col gap-1 text-sm">
          <dt className="sr-only">Device</dt>
          <dd className="font-semibold text-ensena-ink">{device.name}</dd>
          <dt className="sr-only">When</dt>
          <dd className="text-ensena-muted">{device.when}</dd>
          {device.location && (
            <>
              <dt className="sr-only">Location</dt>
              <dd className="text-ensena-muted">Near {device.location}</dd>
            </>
          )}
          {device.ip && (
            <>
              <dt className="sr-only">IP address</dt>
              <dd className="text-ensena-muted">IP {device.ip}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-2.5">
        <Button
          onClick={() => answer("yes")}
          loading={busy === "yes"}
          disabled={busy !== null}
          className={cn("h-11 rounded-full text-sm font-semibold", initialAnswer === "no" ? "border border-ensena-border bg-ensena-surface text-ensena-ink hover:bg-ensena-bg-soft" : "bg-ensena-primary text-white hover:bg-ensena-primary-hover")}
        >
          Yes, it was me
        </Button>
        <Button
          onClick={() => answer("no")}
          loading={busy === "no"}
          disabled={busy !== null}
          className={cn("h-11 rounded-full text-sm font-semibold", initialAnswer === "no" ? "bg-rose-600 text-white hover:bg-rose-700" : "border border-rose-300 bg-ensena-surface text-rose-600 hover:bg-rose-50")}
        >
          No, secure my account
        </Button>
      </div>
      <p className="mt-4 text-center text-xs text-ensena-muted">
        Choosing &ldquo;No&rdquo; signs your account out everywhere and emails you a link to set a new password.
      </p>
    </div>
  );
}
