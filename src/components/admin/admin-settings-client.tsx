"use client";

import { useState } from "react";
import Image from "next/image";
import { Copy, Eye, EyeOff, History, Lock, RefreshCcw, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AdminPlatformUsersTab } from "@/components/admin/admin-platform-users-tab";
import { useLessonConfirmations } from "@/hooks/use-lesson-confirmations";
import { useAdminAuditLog } from "@/hooks/use-admin-audit-log";
import { useAdminSession } from "@/hooks/use-admin-session";
import { ENSENA_COMMISSION_PCT } from "@/lib/commission";
import { relativeTimeFromNow } from "@/lib/escrow-release";
import {
  adminRoles,
  initialPermissionMatrix,
  permissionModules,
  roleDescriptions,
  type AdminRole,
  type PermissionMatrix,
} from "@/lib/admin-permissions-data";
import { cn } from "@/lib/utils";

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-ensena-border p-3.5">
      <div>
        <p className="text-sm font-medium text-ensena-ink">{label}</p>
        {description && <p className="text-xs text-ensena-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-ensena-primary" : "bg-ensena-border")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

const tabs = ["Admin Profile", "Platform Users", "Permissions", "Notifications", "Platform Settings", "Audit Log"] as const;
type Tab = (typeof tabs)[number];

const platformTabs = ["Branding", "Payments & Escrow", "Domain", "Email", "Integrations"] as const;
type PlatformTab = (typeof platformTabs)[number];

const brandColors = [
  { label: "Primary", value: "#F80248" },
  { label: "Secondary", value: "#CBEFFF" },
  { label: "Ink", value: "#2E2E3A" },
];

const apiKeys = [
  { id: "key-1", label: "Live Secret Key", value: "sk_live_51J•••••••••••••wZq" },
  { id: "key-2", label: "Public Key", value: "pk_live_51J•••••••••••••8fA" },
  { id: "key-3", label: "Webhook Signing Secret", value: "whsec_•••••••••••••••3kM" },
];

const emailNotificationEvents = [
  { key: "tutor-verification", label: "New tutor verification" },
  { key: "group-class-submission", label: "New group class submission" },
  { key: "new-report", label: "New report" },
  { key: "withdrawal-request", label: "New withdrawal request" },
  { key: "payment-failure", label: "Payment failure" },
  { key: "booking-dispute", label: "Booking dispute" },
  { key: "counselling-booking", label: "Counselling booking" },
];

const inAppNotificationEvents = [
  { key: "new-report-inapp", label: "New report" },
  { key: "tutor-verification-inapp", label: "Tutor verification" },
  { key: "payout-request-inapp", label: "Payout request" },
  { key: "group-class-approval-inapp", label: "Group class approval" },
];

export function AdminSettingsClient() {
  const session = useAdminSession();
  const [tab, setTab] = useState<Tab>("Admin Profile");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("Branding");
  const visibleTabs = tabs.filter((t) => session.role === "Super Admin" || (t !== "Platform Users" && t !== "Permissions"));

  // Admin Profile
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(session.email);
  const [phone, setPhone] = useState("+234 801 234 5678");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Notifications
  const [emailEvents, setEmailEvents] = useState<Record<string, boolean>>(() => Object.fromEntries(emailNotificationEvents.map((e) => [e.key, true])));
  const [inAppEvents, setInAppEvents] = useState<Record<string, boolean>>(() => Object.fromEntries(inAppNotificationEvents.map((e) => [e.key, true])));

  // Permissions
  const [selectedRole, setSelectedRole] = useState<AdminRole>("Platform Admin");
  const [matrix, setMatrix] = useState<PermissionMatrix>(initialPermissionMatrix);

  // Platform Settings (existing fields, unchanged behavior)
  const [commissionPct, setCommissionPct] = useState(ENSENA_COMMISSION_PCT);
  const [autoReleaseHours, setAutoReleaseHours] = useState(24);
  const [attendanceThreshold, setAttendanceThreshold] = useState(75);
  const [minWithdrawal, setMinWithdrawal] = useState(5000);
  const [withdrawalProcessingDays, setWithdrawalProcessingDays] = useState(3);
  const [paystackEnabled, setPaystackEnabled] = useState(true);
  const [flutterwaveEnabled, setFlutterwaveEnabled] = useState(true);
  const [liveKitEnabled, setLiveKitEnabled] = useState(true);
  const [supabaseEnabled, setSupabaseEnabled] = useState(true);
  const [wwwRedirectEnabled, setWwwRedirectEnabled] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const escrowAudit = useLessonConfirmations().auditLog;
  const adminAudit = useAdminAuditLog();

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2000);
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleReveal(id: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePermission(role: AdminRole, key: string) {
    if (role === "Super Admin") return;
    setMatrix((prev) => ({ ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } }));
  }

  function submitPasswordChange() {
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError("Fill in all fields."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("New password and confirmation don't match."); return; }
    setPasswordError(null);
    setPasswordOpen(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    flash("Password updated.");
  }

  const roleInfo = roleDescriptions[selectedRole];
  const isSuperAdmin = selectedRole === "Super Admin";

  const combinedAudit = [
    ...adminAudit.map((a) => ({ id: a.id, atMs: a.atMs, action: a.action, actor: a.actor, detail: a.detail })),
    ...escrowAudit.map((a) => ({ id: a.id, atMs: a.atMs, action: a.action, actor: a.actor, detail: a.reason ?? "" })),
  ].sort((a, b) => b.atMs - a.atMs);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Settings</h1>
        <p className="mt-1 text-sm text-ensena-muted">Admin profile, platform users, permissions, notifications, platform-wide rules, and the activity log.</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 rounded-full border border-ensena-border bg-ensena-surface p-1 text-sm w-fit">
        {visibleTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium", tab === t ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink")}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5">
        {tab === "Admin Profile" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-full"><Image src={session.image ?? "/teacher-4.jpg.png"} alt={name} fill sizes="64px" className="object-cover" /></span>
              <div>
                <p className="font-heading text-base font-semibold text-ensena-ink">{name}</p>
                <p className="text-xs text-ensena-muted">{session.role}</p>
                <button type="button" onClick={() => flash("Uploading a profile photo isn't available in this demo yet.")} className="mt-1.5 rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Change Profile Photo</button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Admin Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Phone</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
            </div>

            <button type="button" onClick={() => setPasswordOpen(true)} className="flex w-fit items-center gap-1.5 rounded-full border border-ensena-border px-3.5 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
              <Lock className="size-3.5" /> Change Password
            </button>
          </div>
        )}

        {tab === "Platform Users" && session.role === "Super Admin" && <AdminPlatformUsersTab />}

        {tab === "Notifications" && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">Email Notifications</h2>
              <div className="mt-2 flex flex-col gap-2">
                {emailNotificationEvents.map((e) => (
                  <Toggle key={e.key} checked={emailEvents[e.key]} onChange={(v) => setEmailEvents((prev) => ({ ...prev, [e.key]: v }))} label={e.label} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-heading text-sm font-semibold text-ensena-ink">In-App Notifications</h2>
              <div className="mt-2 flex flex-col gap-2">
                {inAppNotificationEvents.map((e) => (
                  <Toggle key={e.key} checked={inAppEvents[e.key]} onChange={(v) => setInAppEvents((prev) => ({ ...prev, [e.key]: v }))} label={e.label} />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Permissions" && session.role === "Super Admin" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              {adminRoles.map((r) => (
                <button key={r} type="button" onClick={() => setSelectedRole(r)} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", selectedRole === r ? "bg-ensena-primary text-white" : "border border-ensena-border text-ensena-ink hover:bg-ensena-bg-soft")}>{r}</button>
              ))}
            </div>

            <div className="rounded-xl bg-ensena-bg-soft p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-ink">
                {isSuperAdmin && <ShieldCheck className="size-4 text-ensena-primary" />} {selectedRole}
              </p>
              <p className="mt-0.5 text-xs text-ensena-muted">{roleInfo.summary}</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ensena-success">Can</p>
                  <ul className="mt-1 flex flex-col gap-0.5 text-xs text-ensena-ink">{roleInfo.can.map((c) => <li key={c}>• {c}</li>)}</ul>
                </div>
                {roleInfo.cannot.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Cannot</p>
                    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-ensena-ink">{roleInfo.cannot.map((c) => <li key={c}>• {c}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>

            {isSuperAdmin ? (
              <p className="rounded-xl border border-ensena-border p-3.5 text-sm text-ensena-muted">Super Admin always has full access to every permission below. This role can&apos;t be restricted.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {permissionModules.map((m) => (
                  <div key={m.module} className="rounded-xl border border-ensena-border p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">{m.module}</p>
                    <div className="mt-1.5 flex flex-col divide-y divide-ensena-border">
                      {m.permissions.map((p) => {
                        const key = `${m.module}::${p}`;
                        const granted = matrix[selectedRole][key];
                        return (
                          <div key={key} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-ensena-ink">{p}</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(selectedRole, key)}
                              className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", granted ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}
                            >
                              {granted ? "✓ Access" : "✕ No access"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "Platform Settings" && (
          <div>
            <div className="flex flex-wrap gap-1 rounded-full bg-ensena-bg-soft p-1 text-sm w-fit">
              {platformTabs.map((t) => (
                <button key={t} type="button" onClick={() => setPlatformTab(t)} className={cn("shrink-0 rounded-full px-3.5 py-1.5 font-medium", platformTab === t ? "bg-white text-ensena-primary shadow-sm" : "text-ensena-muted hover:text-ensena-ink")}>{t}</button>
              ))}
            </div>

            <div className="mt-4">
              {platformTab === "Branding" && (
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Platform Name</span>
                    <input defaultValue="Ensena" className="h-10 w-64 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>

                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Logo</span>
                    <div className="flex items-center gap-3">
                      <div className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-ensena-primary text-lg font-bold text-white">e</div>
                      <button type="button" onClick={() => flash("Uploading a logo isn't available in this demo yet.")} className="rounded-full border border-ensena-border px-3 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Upload New Logo</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Brand Colors</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {brandColors.map((c) => (
                        <div key={c.label} className="flex items-center gap-2 rounded-xl border border-ensena-border p-2.5">
                          <span className="size-8 shrink-0 rounded-full border border-ensena-border" style={{ backgroundColor: c.value }} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-ensena-ink">{c.label}</p>
                            <p className="truncate text-[11px] text-ensena-muted">{c.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Support Email</span>
                    <input defaultValue="support@ensena.co" className="h-10 w-64 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Primary Currency</span>
                    <select defaultValue="NGN" className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm">
                      <option value="NGN">NGN (₦)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Timezone</span>
                    <select defaultValue="WAT" className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm">
                      <option value="WAT">WAT (UTC+1)</option>
                      <option value="GMT">GMT (UTC+0)</option>
                    </select>
                  </label>
                </div>
              )}

              {platformTab === "Payments & Escrow" && (
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Ensena Commission (%): currently used everywhere via commission.ts</span>
                    <input type="number" min={0} max={100} value={commissionPct} onChange={(e) => setCommissionPct(Number(e.target.value))} className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Student confirmation window / auto-release (hours)</span>
                    <input type="number" min={1} value={autoReleaseHours} onChange={(e) => setAutoReleaseHours(Number(e.target.value))} className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Group class attendance threshold to be marked Present (%)</span>
                    <input type="number" min={0} max={100} value={attendanceThreshold} onChange={(e) => setAttendanceThreshold(Number(e.target.value))} className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Minimum cancellation period (hours before lesson)</span>
                    <input type="number" min={0} defaultValue={12} className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">Minimum Withdrawal Amount (₦)</span>
                      <input type="number" min={0} value={minWithdrawal} onChange={(e) => setMinWithdrawal(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">Withdrawal Processing Time (business days)</span>
                      <input type="number" min={0} value={withdrawalProcessingDays} onChange={(e) => setWithdrawalProcessingDays(Number(e.target.value))} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Payout approval</span>
                    <select defaultValue="Manual" className="h-10 w-40 rounded-lg border border-ensena-border px-3 text-sm">
                      <option value="Manual">Manual</option>
                      <option value="Automatic" disabled>Automatic (not available yet)</option>
                    </select>
                  </label>
                  <Toggle checked={paystackEnabled} onChange={setPaystackEnabled} label="Paystack" description="Accept payments via Paystack." />
                  <Toggle checked={flutterwaveEnabled} onChange={setFlutterwaveEnabled} label="Flutterwave" description="Accept payments via Flutterwave." />
                </div>
              )}

              {platformTab === "Domain" && (
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Primary Domain</span>
                    <input defaultValue="ensena.co" className="h-10 w-64 rounded-lg border border-ensena-border px-3 text-sm" />
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-ensena-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-ensena-ink">SSL Certificate</p>
                      <p className="text-xs text-ensena-muted">Auto-renews via Let&apos;s Encrypt.</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
                  </div>
                  <Toggle
                    checked={wwwRedirectEnabled}
                    onChange={() => {
                      setWwwRedirectEnabled((v) => !v);
                      flash(wwwRedirectEnabled ? "Redirect disabled." : "Redirect enabled.");
                    }}
                    label="www → ensena.co"
                    description="Redirect www.ensena.co to ensena.co."
                  />
                </div>
              )}

              {platformTab === "Email" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">SMTP Host</span>
                      <input defaultValue="smtp.sendgrid.net" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">SMTP Port</span>
                      <input defaultValue="587" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">Sender Name</span>
                      <input defaultValue="Ensena" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-xs font-medium text-ensena-muted">Sender Email</span>
                      <input defaultValue="no-reply@ensena.co" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
                    </label>
                  </div>
                  <button type="button" onClick={() => flash("Sending test emails isn't available in this demo yet. No real email service is connected.")} className="w-fit rounded-full border border-ensena-border px-3.5 py-1.5 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Send Test Email</button>
                </div>
              )}

              {platformTab === "Integrations" && (
                <div className="flex flex-col gap-4">
                  <Toggle checked={liveKitEnabled} onChange={setLiveKitEnabled} label="LiveKit" description="Powers the virtual classroom (video, audio, screen share)." />
                  <Toggle checked={supabaseEnabled} onChange={setSupabaseEnabled} label="Supabase" description="Database, auth, storage, and realtime backend." />

                  <div>
                    <p className="text-sm font-semibold text-ensena-ink">API Keys</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {apiKeys.map((k) => {
                        const revealed = revealedKeys.has(k.id);
                        return (
                          <div key={k.id} className="flex items-center justify-between gap-3 rounded-xl border border-ensena-border p-3">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-ensena-ink">{k.label}</p>
                              <p className="truncate font-mono text-xs text-ensena-muted">{revealed ? k.value.replace(/•/g, "9") : k.value}</p>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              <button type="button" onClick={() => toggleReveal(k.id)} aria-label="Toggle visibility" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
                                {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(k.value);
                                  flash(`${k.label} copied.`);
                                }}
                                aria-label="Copy"
                                className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft"
                              >
                                <Copy className="size-3.5" />
                              </button>
                              <button type="button" onClick={() => flash("Regenerating API keys isn't available in this demo yet.")} aria-label="Regenerate" className="flex size-8 items-center justify-center rounded-full border border-ensena-border text-ensena-muted hover:bg-ensena-bg-soft">
                                <RefreshCcw className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "Audit Log" && (
          <div>
            <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><History className="size-3.5" /> Every important administrative action, most recent first.</p>
            <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
              {combinedAudit.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-ensena-ink">{entry.action}</p>
                    <p className="truncate text-xs text-ensena-muted">{entry.detail} · {entry.actor}</p>
                  </div>
                  <span className="shrink-0 text-xs text-ensena-muted">{relativeTimeFromNow(entry.atMs)}</span>
                </li>
              ))}
              {combinedAudit.length === 0 && <p className="py-6 text-center text-sm text-ensena-muted">No activity recorded yet.</p>}
            </ul>
          </div>
        )}

        {tab !== "Audit Log" && (
          <Button onClick={save} className="mt-5 h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        )}
      </div>

      <Modal open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Current Password</span>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New Password</span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Confirm New Password</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
          </label>
          {passwordError && <p className="text-xs font-medium text-rose-600">{passwordError}</p>}
          <Button onClick={submitPasswordChange} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-ensena-primary-hover">Update Password</Button>
        </div>
      </Modal>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}
