"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { SearchableTagField } from "@/components/sign-up/searchable-tag-field";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { saveTutorInformation, useTutorIdentity } from "@/components/tutor-dashboard/tutor-identity";
import { changeMyPassword, disableMyCalendarFeed, getMyCalendarFeed, updateMyLoginAlerts, updateMyTheme } from "@/lib/actions/account-settings";
import { sendTestNotification, updateMyAccount, updateMyNotificationPreferences } from "@/lib/actions/notifications";
import { updateDefaultLessonDuration, updateTutorPrivacy } from "@/lib/actions/tutor-settings";
import { currentPushSubscription, disablePush, enablePush, pushSupport } from "@/lib/push-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { applyTheme, readThemeCookie, writeThemeCookie, type ThemePreference } from "@/lib/theme";
import type { TutorSettingsSnapshot } from "@/lib/tutor-settings-server";
import { languageSubjectOptions } from "@/lib/tutors";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/site-url";

const tabs = ["Account", "Notifications", "Privacy", "Payments", "Security", "Calendar", "Language", "Theme", "Delete Account"] as const;
type Tab = (typeof tabs)[number];

function resolveTab(raw: string | null): Tab {
  const normalized = raw?.trim().toLowerCase();
  return tabs.find((t) => t.toLowerCase() === normalized) ?? "Account";
}

const themeLabels: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
  { value: "system", label: "System", hint: "Match your device" },
];

const DURATIONS = [30, 45, 60, 90] as const;
const LANGUAGE_SUGGESTIONS = Array.from(new Set(["English", ...languageSubjectOptions]));
const DISPLAY_LANGUAGES = ["English", "French", "Igbo", "Yoruba", "Hausa"];
const noopSubscribe = () => () => {};

function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
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
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60", checked ? "bg-ensena-primary" : "bg-ensena-border")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

// `initial` is the signed-in tutor's saved settings (null in demo mode,
// where every change stays on this page only).
export function SettingsClient({ initial = null }: { initial?: TutorSettingsSnapshot | null }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(() => resolveTab(tabParam));
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    setTab(resolveTab(tabParam));
  }

  const router = useRouter();
  const me = useTutorIdentity();
  const live = !!me.id && !!initial;

  // ── Account ──
  const [name, setName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [accountModal, setAccountModal] = useState<"closed" | "confirm" | "done">("closed");
  const [savingAccount, setSavingAccount] = useState(false);
  const nameChanged = name.trim() !== me.name;
  const phoneChanged = phone.trim() !== me.phone;

  function requestSaveAccount() {
    if (!nameChanged && !phoneChanged) {
      toast("Nothing to save — your details haven't changed.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setAccountModal("confirm");
  }

  async function confirmSaveAccount() {
    if (!live) {
      setAccountModal("done");
      return;
    }
    setSavingAccount(true);
    const result = await updateMyAccount({ fullName: name, phone });
    setSavingAccount(false);
    if (!result.ok) {
      setAccountModal("closed");
      toast.error(result.message ?? "We couldn't save your details.");
      return;
    }
    setAccountModal("done");
    router.refresh();
  }

  // ── Notifications ──
  const [emailNotifs, setEmailNotifs] = useState(initial?.prefs.email ?? true);
  const [pushNotifs, setPushNotifs] = useState(initial?.prefs.push ?? false);
  const [savingPref, setSavingPref] = useState<"email" | "push" | null>(null);
  const [testing, setTesting] = useState<"email" | "push" | null>(null);
  const pushNeedsInstall = useSyncExternalStore(noopSubscribe, () => pushSupport() === "needs-install", () => false);

  // Push is per device: on for the account but no subscription in this
  // browser means it's off here.
  useEffect(() => {
    if (!live || !initial?.prefs.push) return;
    let cancelled = false;
    currentPushSubscription()
      .then((sub) => {
        if (!cancelled && !sub) setPushNotifs(false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [live, initial?.prefs.push]);

  async function changeEmailNotifs(on: boolean) {
    setEmailNotifs(on);
    if (!live) return;
    setSavingPref("email");
    const result = await updateMyNotificationPreferences({ email: on });
    setSavingPref(null);
    if (!result.ok) {
      setEmailNotifs(!on);
      toast.error(result.message ?? "Couldn't update email notifications.");
      return;
    }
    toast.success(on ? "Email notifications on — new bookings, messages and reminders will be emailed to you." : "Email notifications off.");
  }

  async function changePushNotifs(on: boolean) {
    if (!live) {
      setPushNotifs(on);
      return;
    }
    setSavingPref("push");
    const result = on ? await enablePush() : await disablePush();
    setSavingPref(null);
    if (!result.ok) {
      toast.error(result.message ?? "Couldn't update push notifications.");
      return;
    }
    setPushNotifs(on);
    toast.success(on ? "Push notifications on for this device." : "Push notifications off for this device.");
  }

  async function sendTest(channel: "email" | "push") {
    setTesting(channel);
    const result = await sendTestNotification(channel);
    setTesting(null);
    if (result.ok) toast.success(result.message ?? "Sent.");
    else toast.error(result.message ?? "Couldn't send the test.");
  }

  // ── Privacy ──
  const [privacy, setPrivacy] = useState({
    profilePublic: initial?.profilePublic ?? true,
    showLastActive: initial?.showLastActive ?? true,
    allowNewStudentMessages: initial?.allowNewStudentMessages ?? true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const privacyMessages: Record<keyof typeof privacy, [string, string]> = {
    profilePublic: ["Your profile is public — students can find you in Find a Tutor.", "Your profile is hidden from Find a Tutor. Students you already teach can still reach you."],
    showLastActive: ["Students can now see when you were last active.", "Your last-active time is now hidden."],
    allowNewStudentMessages: ["New students can now message you before booking.", "Only students who've booked with you can start a new conversation."],
  };

  async function changePrivacy(key: keyof typeof privacy, on: boolean) {
    setPrivacy((p) => ({ ...p, [key]: on }));
    if (!live) return;
    setSavingPrivacy(true);
    const result = await updateTutorPrivacy({ [key]: on });
    setSavingPrivacy(false);
    if (!result.ok) {
      setPrivacy((p) => ({ ...p, [key]: !on }));
      toast.error(result.message ?? "Couldn't save your privacy settings.");
      return;
    }
    toast.success(privacyMessages[key][on ? 0 : 1]);
  }

  // ── Payments (unchanged preferences) ──
  const [autoWithdraw, setAutoWithdraw] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("NGN");

  // ── Security ──
  const hasPassword = initial?.hasPassword ?? true;
  const [loginAlerts, setLoginAlerts] = useState(initial?.loginAlerts ?? true);
  const [savingLoginAlerts, setSavingLoginAlerts] = useState(false);

  async function changeLoginAlerts(on: boolean) {
    setLoginAlerts(on);
    if (!live) return;
    setSavingLoginAlerts(true);
    const result = await updateMyLoginAlerts(on);
    setSavingLoginAlerts(false);
    if (!result.ok) {
      setLoginAlerts(!on);
      toast.error(result.message ?? "Couldn't save your login alert setting.");
      return;
    }
    toast.success(on ? `Login alerts on — we'll email ${me.email} when your account is signed in to from a new device.` : "Login alerts off.");
  }

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const passwordMismatch = !!confirmPassword && newPassword !== confirmPassword;
  const passwordTooWeak = !!newPassword && (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword));

  function closePasswordModal() {
    if (savingPassword) return;
    setChangePasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function submitPasswordChange() {
    if (!live) {
      toast("Password changes are available once you're signed in.");
      return;
    }
    setSavingPassword(true);
    const result = await changeMyPassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't change your password.");
      return;
    }
    toast.success(result.message ?? "Password updated.");
    setChangePasswordOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  // Two-factor (authenticator app, via Supabase Auth MFA). Enrolment
  // happens entirely in the browser; requireRole then asks for a code on
  // every new sign-in.
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaLoaded, setMfaLoaded] = useState(false);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [disableMfaOpen, setDisableMfaOpen] = useState(false);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    getSupabaseBrowserClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        if (cancelled) return;
        setMfaFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
        setMfaLoaded(true);
      })
      .catch(() => setMfaLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [live]);

  async function startMfaEnrollment() {
    if (!live) {
      toast("Two-factor authentication is available once you're signed in.");
      return;
    }
    setMfaBusy(true);
    const supabase = getSupabaseBrowserClient();
    // Clear out any half-finished setup from an earlier attempt first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Ensena ${new Date().toISOString().slice(0, 10)}` });
    setMfaBusy(false);
    if (error || !data) {
      toast.error(error?.message || "We couldn't start two-factor setup. Please try again.");
      return;
    }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setEnrollCode("");
  }

  async function confirmMfaEnrollment() {
    if (!enroll || !/^\d{6}$/.test(enrollCode)) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaBusy(true);
    const { error } = await getSupabaseBrowserClient().auth.mfa.challengeAndVerify({ factorId: enroll.factorId, code: enrollCode });
    setMfaBusy(false);
    if (error) {
      setEnrollCode("");
      toast.error("That code didn't work. Codes change every 30 seconds — try the newest one.");
      return;
    }
    setMfaFactorId(enroll.factorId);
    setEnroll(null);
    toast.success("Two-factor authentication is on. You'll be asked for a code each time you sign in.");
  }

  async function cancelMfaEnrollment() {
    if (enroll) await getSupabaseBrowserClient().auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => undefined);
    setEnroll(null);
    setEnrollCode("");
  }

  async function disableMfa() {
    if (!mfaFactorId) return;
    setMfaBusy(true);
    const { error } = await getSupabaseBrowserClient().auth.mfa.unenroll({ factorId: mfaFactorId });
    setMfaBusy(false);
    setDisableMfaOpen(false);
    if (error) {
      toast.error(error.message || "We couldn't turn off two-factor authentication.");
      return;
    }
    setMfaFactorId(null);
    toast.success("Two-factor authentication is off.");
    router.refresh();
  }

  // ── Calendar ──
  const [calendarToken, setCalendarToken] = useState<string | null>(initial?.calendarToken ?? null);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const feedUrl = calendarToken ? `${SITE_URL}/api/calendar/${calendarToken}.ics` : "";
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const [defaultDuration, setDefaultDuration] = useState(initial?.defaultLessonDuration ?? 60);

  async function changeCalendarSync(on: boolean, regenerate = false) {
    if (!live) {
      toast("Calendar sync is available once you're signed in.");
      return;
    }
    setSavingCalendar(true);
    const result = on ? await getMyCalendarFeed({ regenerate }) : await disableMyCalendarFeed();
    setSavingCalendar(false);
    if (!result.ok) {
      toast.error(result.message ?? "Couldn't update calendar sync.");
      return;
    }
    if (on) {
      setCalendarToken((result as { token?: string }).token ?? null);
      toast.success(regenerate ? "New calendar link created — the old link no longer works." : "Calendar sync is on. Add it to your calendar below.");
    } else {
      setCalendarToken(null);
      toast.success("Calendar sync off — the calendar link no longer works.");
    }
  }

  async function copyFeedUrl() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast.success("Calendar link copied.");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  async function changeDefaultDuration(minutes: number) {
    const previous = defaultDuration;
    setDefaultDuration(minutes);
    if (!live) return;
    const result = await updateDefaultLessonDuration(minutes);
    if (!result.ok) {
      setDefaultDuration(previous);
      toast.error(result.message ?? "Couldn't save your default lesson length.");
      return;
    }
    toast.success(`Students booking with you will start with ${minutes}-minute lessons selected.`);
  }

  // ── Language ──
  const [teachingLanguages, setTeachingLanguages] = useState(me.languages);
  const [savingLanguages, setSavingLanguages] = useState(false);
  const languagesChanged = teachingLanguages.join("|") !== me.languages.join("|");

  async function saveTeachingLanguages() {
    if (teachingLanguages.length === 0) {
      toast.error("Add at least one language you teach in.");
      return;
    }
    if (!live) {
      toast.success("Saved (demo mode).");
      return;
    }
    setSavingLanguages(true);
    const { error } = await saveTutorInformation(me, { application: { languagesSpoken: teachingLanguages } });
    setSavingLanguages(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Teaching languages saved — they're shown on your public profile.");
    router.refresh();
  }

  // ── Theme ──
  const browserTheme = useSyncExternalStore(noopSubscribe, readThemeCookie, () => "light" as ThemePreference);
  const [themeChoice, setThemeChoice] = useState<ThemePreference | null>(initial?.theme ?? null);
  const theme = themeChoice ?? browserTheme;

  async function changeTheme(next: ThemePreference) {
    const previous = theme;
    setThemeChoice(next);
    writeThemeCookie(next);
    applyTheme(next);
    const result = await updateMyTheme(next);
    if (!result.ok) {
      setThemeChoice(previous);
      writeThemeCookie(previous);
      applyTheme(previous);
      toast.error(result.message ?? "Couldn't save your theme.");
      return;
    }
    toast.success(`${themeLabels.find((t) => t.value === next)?.label} theme on${live ? " — saved to your account" : ""}.`);
  }

  // ── Delete ──
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Settings</h1>
        <p className="mt-1 text-sm text-ensena-muted">Manage your account preferences.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-ensena-border bg-ensena-surface p-2 lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium",
                tab === t ? "bg-ensena-cta-from/10 text-ensena-cta-to" : t === "Delete Account" ? "text-rose-600 hover:bg-rose-50" : "text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
          {tab === "Account" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Account Information</h2>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Full name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Email address</span>
                <input value={me.email} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                <span className="text-xs text-ensena-muted">To change your sign-in email, please contact Ensena Support.</span>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Phone number</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" placeholder="+234…" className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              </label>
              <Button onClick={requestSaveAccount} className="mt-2 h-10 w-fit rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
                Save Changes
              </Button>
            </div>
          )}

          {tab === "Notifications" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Notification Preferences</h2>
              <Toggle
                checked={emailNotifs}
                disabled={savingPref === "email"}
                onChange={(v) => void changeEmailNotifs(v)}
                label="Email Notifications"
                description={`New bookings, messages and lesson reminders${me.email ? ` — sent to ${me.email}` : ""}`}
              />
              {live && emailNotifs && (
                <button type="button" onClick={() => sendTest("email")} disabled={testing !== null} className="-mt-1 self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                  {testing === "email" ? "Sending…" : "Send me a test email"}
                </button>
              )}
              <Toggle
                checked={pushNotifs}
                disabled={savingPref === "push"}
                onChange={(v) => void changePushNotifs(v)}
                label="Push Notifications"
                description={savingPref === "push" ? "Setting up…" : "Alerts on this device, even when Ensena isn't open"}
              />
              {live && pushNotifs && (
                <button type="button" onClick={() => sendTest("push")} disabled={testing !== null} className="-mt-1 self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                  {testing === "push" ? "Sending…" : "Send a test push to my devices"}
                </button>
              )}
              {live && !pushNotifs && pushNeedsInstall && (
                <p className="text-xs text-ensena-muted">On iPhone/iPad, add Ensena to your Home Screen (Share → Add to Home Screen) to get push notifications.</p>
              )}
            </div>
          )}

          {tab === "Privacy" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Privacy</h2>
              <Toggle
                checked={privacy.profilePublic}
                disabled={savingPrivacy}
                onChange={(v) => void changePrivacy("profilePublic", v)}
                label="Public Profile"
                description={privacy.profilePublic ? "Students can find you in Find a Tutor and in their recommendations" : "Hidden from Find a Tutor — only students you already teach can open your profile"}
              />
              <Toggle
                checked={privacy.showLastActive}
                disabled={savingPrivacy}
                onChange={(v) => void changePrivacy("showLastActive", v)}
                label="Show Last Active Status"
                description={privacy.showLastActive ? 'Students see e.g. "Active 2 hours ago" on your profile' : "Students can't see when you were last on Ensena"}
              />
              <Toggle
                checked={privacy.allowNewStudentMessages}
                disabled={savingPrivacy}
                onChange={(v) => void changePrivacy("allowNewStudentMessages", v)}
                label="Allow Messages from New Students"
                description={privacy.allowNewStudentMessages ? "Students can message you before they book" : "Only students who've booked a lesson or discovery session can start a conversation"}
              />
            </div>
          )}

          {tab === "Payments" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Preferences</h2>
              <Toggle checked={autoWithdraw} onChange={setAutoWithdraw} label="Automatic Weekly Withdrawal" description="Automatically withdraw your available balance every Friday" />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Default currency</span>
                <select value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} className="h-10 w-48 rounded-lg border border-ensena-border px-3 text-sm">
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                </select>
              </label>
            </div>
          )}

          {tab === "Security" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Security</h2>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-ensena-border p-3.5">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ensena-ink">
                    Two-Factor Authentication
                    {mfaFactorId && <span className="rounded-full bg-ensena-success/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-success">On</span>}
                  </p>
                  <p className="text-xs text-ensena-muted">
                    {mfaFactorId ? "You'll enter a code from your authenticator app each time you sign in" : "Use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) for a code at sign-in"}
                  </p>
                </div>
                {mfaFactorId ? (
                  <Button variant="outline" onClick={() => setDisableMfaOpen(true)} disabled={mfaBusy} className="h-9 shrink-0 rounded-full border-ensena-border px-4 text-xs font-medium">
                    Turn off
                  </Button>
                ) : (
                  <Button onClick={startMfaEnrollment} loading={mfaBusy} disabled={live && !mfaLoaded} className="h-9 shrink-0 rounded-full bg-ensena-primary px-4 text-xs font-semibold text-white">
                    Set up
                  </Button>
                )}
              </div>
              <Toggle
                checked={loginAlerts}
                disabled={savingLoginAlerts}
                onChange={(v) => void changeLoginAlerts(v)}
                label="Login Alerts"
                description={`Get an email${me.email ? ` at ${me.email}` : ""} when your account is signed in to from a new device`}
              />
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)} className="mt-2 h-10 w-fit rounded-full border-ensena-border px-5 text-sm font-medium">
                {hasPassword ? "Change Password" : "Set a Password"}
              </Button>
              {!hasPassword && <p className="text-xs text-ensena-muted">You sign in with Google. Add a password to also sign in with your email address.</p>}
            </div>
          )}

          {tab === "Calendar" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Calendar</h2>
              <Toggle
                checked={!!calendarToken}
                disabled={savingCalendar}
                onChange={(v) => void changeCalendarSync(v)}
                label="Sync with Google Calendar"
                description={savingCalendar ? "Updating…" : "Your private lessons, group classes and discovery sessions appear in your calendar and stay up to date automatically"}
              />
              {calendarToken && feedUrl && (
                <div className="flex flex-col gap-3 rounded-xl border border-ensena-border bg-ensena-bg-soft p-4">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center rounded-full bg-ensena-primary px-4 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
                    >
                      Add to Google Calendar
                    </a>
                    <a href={webcalUrl} className="inline-flex h-9 items-center rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-surface">
                      Apple / Outlook
                    </a>
                    <a href={feedUrl} download="ensena.ics" className="inline-flex h-9 items-center rounded-full border border-ensena-border px-4 text-sm font-medium text-ensena-ink hover:bg-ensena-surface">
                      Download .ics
                    </a>
                  </div>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-ensena-muted">Private calendar link (keep it secret — anyone with it can see your schedule)</span>
                    <div className="flex gap-2">
                      <input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-ensena-border px-3 text-xs" />
                      <Button variant="outline" onClick={copyFeedUrl} className="h-9 rounded-full border-ensena-border px-4 text-xs font-medium">
                        Copy
                      </Button>
                    </div>
                  </label>
                  <p className="text-xs text-ensena-muted">
                    Google Calendar refreshes subscribed calendars every few hours; Apple Calendar and Outlook let you choose how often.
                  </p>
                  <button type="button" disabled={savingCalendar} onClick={() => void changeCalendarSync(true, true)} className="self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                    Reset link (if you shared it by mistake)
                  </button>
                </div>
              )}
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-ensena-muted">Default lesson duration</span>
                <select value={defaultDuration} onChange={(e) => void changeDefaultDuration(Number(e.target.value))} className="h-10 w-48 rounded-lg border border-ensena-border px-3 text-sm">
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} mins
                    </option>
                  ))}
                </select>
                <span className="text-xs text-ensena-muted">Preselected when a student books with you (if it&apos;s one of the lesson lengths you offer).</span>
              </label>
            </div>
          )}

          {tab === "Language" && (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Language</h2>
              <div>
                <p className="text-sm font-medium text-ensena-ink">Languages you teach in</p>
                <p className="text-xs text-ensena-muted">Shown on your public profile, so students know which languages your lessons can be in.</p>
                <div className="mt-2">
                  <SearchableTagField values={teachingLanguages} suggestions={LANGUAGE_SUGGESTIONS} placeholder="Search languages or add your own" onChange={setTeachingLanguages} />
                </div>
                <Button onClick={saveTeachingLanguages} loading={savingLanguages} disabled={!languagesChanged} className="mt-3 h-10 w-fit rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white disabled:opacity-50">
                  Save Languages
                </Button>
              </div>
              <div className="border-t border-ensena-border pt-4">
                <p className="text-sm font-medium text-ensena-ink">Dashboard display language</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DISPLAY_LANGUAGES.map((l) => (
                    <span
                      key={l}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium",
                        l === "English" ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink" : "border-ensena-border text-ensena-muted opacity-60"
                      )}
                    >
                      {l}
                      {l !== "English" && <span className="ml-1 text-[10px]">· coming soon</span>}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-ensena-muted">Ensena is currently available in English. We&apos;ll let you know when other languages are ready.</p>
              </div>
            </div>
          )}

          {tab === "Theme" && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-semibold text-ensena-ink">Theme</h2>
              <div className="flex gap-2">
                {themeLabels.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => theme !== t.value && void changeTheme(t.value)}
                    aria-pressed={theme === t.value}
                    title={t.hint}
                    className={cn("rounded-full border px-4 py-2 text-sm font-medium", theme === t.value ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink" : "border-ensena-border text-ensena-muted")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ensena-muted">
                {theme === "system" ? "Follows your device's light/dark setting. " : ""}Applies to your Ensena dashboard{live ? " on all your devices" : ""}.
              </p>
            </div>
          )}

          {tab === "Delete Account" && (
            <div className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-rose-600">
                <AlertTriangle className="size-5" /> Delete Account
              </h2>
              <p className="text-sm text-ensena-muted">
                Deleting your account is permanent. You will lose access to your lessons, earnings history and student conversations. This cannot be undone.
              </p>
              <Button onClick={() => setDeleteOpen(true)} className="mt-2 h-10 w-fit rounded-full bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700">
                Delete My Account
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Save Changes pop-up: confirm, then a success message. */}
      <Modal open={accountModal !== "closed"} onClose={() => !savingAccount && setAccountModal("closed")} title={accountModal === "done" ? "Changes saved" : "Save these changes?"}>
        {accountModal === "done" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="size-10 text-ensena-success" />
            <p className="text-sm text-ensena-ink">Your account details have been updated{live ? " everywhere on Ensena" : " (demo mode — nothing was saved)"}.</p>
            <Button onClick={() => setAccountModal("closed")} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white">
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ensena-muted">Please check your new details before saving.</p>
            <div className="flex flex-col gap-1 rounded-xl bg-ensena-bg-soft p-3 text-sm">
              {nameChanged && (
                <p>
                  <span className="text-ensena-muted">Name:</span> {me.name} → <span className="font-semibold text-ensena-ink">{name.trim()}</span>
                </p>
              )}
              {phoneChanged && (
                <p>
                  <span className="text-ensena-muted">Phone:</span> {me.phone || "—"} → <span className="font-semibold text-ensena-ink">{phone.trim() || "—"}</span>
                </p>
              )}
            </div>
            {nameChanged && <p className="text-xs text-ensena-muted">Your new name appears on your public profile, in messages and on lesson receipts.</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAccountModal("closed")} disabled={savingAccount} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
                Cancel
              </Button>
              <Button onClick={confirmSaveAccount} loading={savingAccount} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white">
                Yes, save
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!enroll} onClose={() => !mfaBusy && void cancelMfaEnrollment()} title="Set up two-factor authentication">
        {enroll && (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void confirmMfaEnrollment();
            }}
          >
            <p className="text-sm text-ensena-muted">1. Scan this QR code with your authenticator app.</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL */}
            <img src={enroll.qr} alt="Two-factor QR code" className="mx-auto size-44 rounded-xl border border-ensena-border bg-white p-2" />
            <p className="text-xs text-ensena-muted">
              Can&apos;t scan it? Enter this key instead: <span className="break-all font-mono text-ensena-ink">{enroll.secret}</span>
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-sm text-ensena-muted">2. Enter the 6-digit code the app shows.</span>
              <input
                value={enrollCode}
                onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                className="h-11 rounded-lg border border-ensena-border px-3 text-center font-mono text-lg tracking-[0.4em]"
              />
            </label>
            <Button type="submit" loading={mfaBusy} disabled={enrollCode.length !== 6} className="h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:opacity-50">
              <ShieldCheck className="size-4" /> Turn on
            </Button>
          </form>
        )}
      </Modal>

      <Modal open={disableMfaOpen} onClose={() => !mfaBusy && setDisableMfaOpen(false)} title="Turn off two-factor authentication?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Your account will only be protected by your password. You can turn it back on at any time.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDisableMfaOpen(false)} disabled={mfaBusy} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
              Keep it on
            </Button>
            <Button onClick={disableMfa} loading={mfaBusy} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
              Turn off
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={changePasswordOpen} onClose={closePasswordModal} title={hasPassword ? "Change Password" : "Set a Password"}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submitPasswordChange();
          }}
        >
          {hasPassword && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Current password</span>
              <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">New password</span>
            <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            <span className={cn("text-xs", passwordTooWeak ? "text-ensena-danger" : "text-ensena-muted")}>At least 8 characters, with a letter and a number.</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Confirm new password</span>
            <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            {passwordMismatch && <span className="text-xs text-ensena-danger">The passwords don&apos;t match.</span>}
          </label>
          <Button
            type="submit"
            loading={savingPassword}
            disabled={(hasPassword && !currentPassword) || !newPassword || !confirmPassword || passwordMismatch || passwordTooWeak}
            className="mt-1 h-10 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {hasPassword ? "Update Password" : "Set Password"}
          </Button>
          <p className="text-xs text-ensena-muted">We&apos;ll email you to confirm the change.</p>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Account Deletion">
        {deleteConfirmed ? (
          <p className="text-sm text-ensena-ink">Your deletion request has been received. Since this is a demo environment, no account was actually deleted.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ensena-muted">Are you sure you want to delete your Ensena tutor account? This action is irreversible.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
                Cancel
              </Button>
              <Button onClick={() => setDeleteConfirmed(true)} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">
                Yes, Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
