"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { setCurrentAdminSession } from "@/lib/admin-session";
import { allSections, type AdminRole } from "@/lib/admin-permissions-data";
import {
  acceptInvitation,
  effectiveInvitationStatus,
  getInvitations,
  type PlatformInvitation,
} from "@/lib/admin-platform-users-store";

export function AcceptInvitationClient({ token }: { token: string }) {
  const router = useRouter();
  // The invitation only exists in the client's localStorage — the server
  // can never see it, so this is deliberately loaded in an effect (not read
  // during render) to avoid an SSR/client hydration mismatch: server and
  // first client render both show the loading state, then the real
  // invitation is looked up once mounted.
  const [invitation, setInvitation] = useState<PlatformInvitation | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const found = getInvitations().find((i) => i.token === token) ?? null;
    setInvitation(found);
    if (found) setName(found.name);
  }, [token]);

  if (invitation === undefined) {
    return <div className="flex min-h-screen items-center justify-center bg-ensena-bg-soft"><Logo size={48} /></div>;
  }

  const status = invitation ? effectiveInvitationStatus(invitation) : null;

  if (!invitation || status !== "Pending") {
    const message =
      !invitation ? "This invitation link isn't valid."
      : status === "Expired" ? "This invitation has expired. Ask your Super Admin to resend it."
      : status === "Revoked" ? "This invitation has been revoked."
      : "This invitation has already been accepted.";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ensena-bg-soft px-6 text-center">
        <Logo size={48} />
        <AlertCircle className="size-10 text-rose-500" />
        <p className="max-w-sm text-sm text-ensena-muted">{message}</p>
        <Link href="/sign-in" className="text-sm font-semibold text-ensena-primary hover:underline">Back to Sign In</Link>
      </div>
    );
  }

  const grantedLabels = (invitation.customSections ?? []).filter((s) => s !== "Dashboard").map((k) => allSections.find((s) => s.key === k)?.label ?? k);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invitation) return;
    if (!name.trim()) { setError("Please confirm your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords don't match."); return; }

    const result = acceptInvitation(token, password);
    if (!result.ok) {
      setError(result.reason === "expired" ? "This invitation has expired." : "This invitation has already been used.");
      return;
    }
    setError(null);
    const a = result.account;
    setCurrentAdminSession({ userId: a.id, name: a.name, email: a.email, image: a.image, role: a.role, customSections: a.customSections, customPermissions: a.customPermissions });
    // /admin's workspace picker is a dev convenience for the Super Admin
    // persona ("running Ensena solo") and doesn't reflect a Platform User's
    // actual restricted access — land them on their real dashboard instead.
    router.push("/admin/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ensena-bg-soft px-6 py-14">
      <div className="w-full max-w-md">
        <div className="flex justify-center"><Logo size={48} /></div>

        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><ShieldCheck className="size-4.5" /></span>
            <h1 className="font-heading text-lg font-semibold text-ensena-ink">You&apos;ve been invited to join the Ensena Platform Team</h1>
          </div>

          <dl className="mt-4 flex flex-col gap-1.5 rounded-xl bg-ensena-bg-soft p-3.5 text-sm">
            <div className="flex justify-between"><dt className="text-ensena-muted">Invited by</dt><dd className="font-medium text-ensena-ink">{invitation.invitedBy}</dd></div>
            <div className="flex justify-between"><dt className="text-ensena-muted">Role</dt><dd className="font-medium text-ensena-ink">{invitation.role === ("Custom" as AdminRole) ? "Custom Access" : invitation.role}</dd></div>
            <div className="flex justify-between gap-3"><dt className="shrink-0 text-ensena-muted">Access</dt><dd className="text-right font-medium text-ensena-ink">{grantedLabels.join(", ") || "Dashboard"}</dd></div>
          </dl>

          <form className="mt-5 flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Confirm your name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Email</span>
              <Input value={invitation.email} disabled className="h-11 rounded-xl border-ensena-border bg-ensena-bg-soft text-ensena-muted" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Create Password</span>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl border-ensena-border pr-9" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ensena-muted hover:text-ensena-ink">
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ensena-ink">Confirm Password</span>
              <Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11 rounded-xl border-ensena-border" />
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
              </div>
            )}

            <Button type="submit" className="mt-1 h-12 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">
              <CheckCircle2 className="size-4" /> Accept Invitation &amp; Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
