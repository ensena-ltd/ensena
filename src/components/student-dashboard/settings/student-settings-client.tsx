"use client";

import { type ComponentType, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Calendar,
  ChevronRight,
  CreditCard,
  IdCard,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { sendTestNotification, updateMyAccount, updateMyNotificationPreferences } from "@/lib/actions/notifications";
import type { NotificationPreferences } from "@/lib/notifications";
import { currentPushSubscription, disablePush, enablePush, pushSupport } from "@/lib/push-client";
import { changeMyPassword, disableMyCalendarFeed, getMyCalendarFeed, updateMyLoginAlerts, updateMyPrivacy, updateMyTheme } from "@/lib/actions/account-settings";
import { applyTheme, readThemeCookie, writeThemeCookie, type ThemePreference } from "@/lib/theme";
import { saveStudentIdentity, useStudentIdentity } from "@/components/student-dashboard/student-identity";
import { dashboardStudent, studentProfileDetail } from "@/lib/student-dashboard-data";
import { cn } from "@/lib/utils";

const tabs = ["Account", "Notifications", "Privacy", "Security", "Payment Methods", "Calendar Sync", "Theme", "Delete Account"] as const;
type Tab = (typeof tabs)[number];

// Case-insensitive so a link like Profile's "Payment" card (?tab=Payment
// Methods) always lands on the right tab.
function resolveTab(raw: string | null): Tab {
  if (!raw) return "Account";
  const normalized = raw.trim().toLowerCase();
  const match = tabs.find((t) => t.toLowerCase() === normalized);
  return match ?? "Account";
}

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

// Mobile-only entry point: a settings row not backed by a desktop sidebar
// tab. Kept separate from `Tab` so the desktop sidebar/tab list is untouched.
type MobilePanel = Tab | "Personal Details";

type MobileRow = {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  panel: MobilePanel;
};

type MobileGroup = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  rowIconBg: string;
  rowIconColor: string;
  rows: MobileRow[];
};

export interface StudentAccountSettings {
  profilePublic: boolean;
  shareProgressWithGuardian: boolean;
  loginAlerts: boolean;
  /** null = never saved to the account; fall back to this browser's choice. */
  theme: ThemePreference | null;
  calendarToken: string | null;
  /** false for Google-only accounts (they can add a first password). */
  hasPassword: boolean;
}

const themeLabels: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
  { value: "system", label: "System", hint: "Match your device" },
];

const noopSubscribe = () => () => {};

// initialPrefs / initialSettings: the signed-in user's saved settings (null
// in demo mode, where everything stays local).
export function StudentSettingsClient({
  initialPrefs = null,
  initialSettings = null,
}: { initialPrefs?: NotificationPreferences | null; initialSettings?: StudentAccountSettings | null } = {}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(() => resolveTab(tabParam));
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(() => resolveTab(tabParam));
  const [mobileView, setMobileView] = useState<"list" | "detail">(() => (tabParam ? "detail" : "list"));

  // Keep in sync with links that navigate here with a different `?tab=`
  // while already on this route (e.g. Profile > Payment). Adjusted during
  // render rather than in a useEffect — React's recommended pattern for
  // "derive state from a changed prop".
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (tabParam !== prevTabParam) {
    setPrevTabParam(tabParam);
    const resolved = resolveTab(tabParam);
    setTab(resolved);
    setMobilePanel(resolved);
    setMobileView("detail");
  }
  const router = useRouter();
  const me = useStudentIdentity();
  const [email, setEmail] = useState(me.email);
  const [fullName, setFullName] = useState(me.name);
  const [phone, setPhone] = useState(me.phone);
  const [confirmAccountOpen, setConfirmAccountOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const accountChanged = fullName.trim() !== me.name || phone.trim() !== me.phone;

  // Real accounts: confirm first, then save to the database and refresh so
  // the new name/phone shows everywhere. Demo: local only.
  function requestSaveAccount() {
    if (!me.id) {
      dashboardStudent.name = fullName;
      dashboardStudent.email = email;
      dashboardStudent.phone = phone;
      toast.success("Saved (demo mode).");
      return;
    }
    if (!accountChanged) {
      toast("Nothing to save — your details haven't changed.");
      return;
    }
    if (fullName.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    setConfirmAccountOpen(true);
  }

  async function confirmSaveAccount() {
    setSavingAccount(true);
    const result = await updateMyAccount({ fullName, phone });
    setSavingAccount(false);
    setConfirmAccountOpen(false);
    if (!result.ok) {
      toast.error(result.message ?? "We couldn't save your details.");
      return;
    }
    toast.success("Your details have been updated.");
    router.refresh();
  }

  const [dob, setDob] = useState(me.dob);
  const [academicLevel, setAcademicLevel] = useState(me.level);
  const [timezone, setTimezone] = useState(studentProfileDetail.timezone);
  const [preferredLanguage, setPreferredLanguage] = useState(studentProfileDetail.preferredLanguage);
  const [emergencyContact, setEmergencyContact] = useState(studentProfileDetail.emergencyContact);
  const [personalSaved, setPersonalSaved] = useState(false);

  async function savePersonalDetails() {
    const { ok } = await saveStudentIdentity(me.id, {
      profile: { date_of_birth: dob || null },
      student: { date_of_birth: dob || null, academic_detail: academicLevel.trim() || null },
    });
    if (!ok) return;
    if (me.id) router.refresh();
    dashboardStudent.dob = dob;
    dashboardStudent.level = academicLevel;
    studentProfileDetail.timezone = timezone;
    studentProfileDetail.preferredLanguage = preferredLanguage;
    studentProfileDetail.emergencyContact = emergencyContact;
    setPersonalSaved(true);
    setTimeout(() => setPersonalSaved(false), 2000);
  }

  const [emailNotifs, setEmailNotifs] = useState(initialPrefs?.email ?? true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(initialPrefs?.push ?? false);
  const [savingPref, setSavingPref] = useState<"email" | "push" | null>(null);
  // iPhone/iPad Safari only supports push once Ensena is on the Home Screen.
  const pushNeedsInstall = useSyncExternalStore(() => () => {}, () => pushSupport() === "needs-install", () => false);
  const [testing, setTesting] = useState<"email" | "push" | null>(null);

  // Push is per device: if it's on for the account but this browser has no
  // subscription, show it as off here.
  useEffect(() => {
    if (!me.id || !initialPrefs?.push) return;
    let cancelled = false;
    currentPushSubscription()
      .then((sub) => {
        if (!cancelled && !sub) setPushNotifs(false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [me.id, initialPrefs?.push]);

  async function changeEmailNotifs(on: boolean) {
    setEmailNotifs(on);
    if (!me.id) return;
    setSavingPref("email");
    const result = await updateMyNotificationPreferences({ email: on });
    setSavingPref(null);
    if (!result.ok) {
      setEmailNotifs(!on);
      toast.error(result.message ?? "Couldn't update email notifications.");
      return;
    }
    toast.success(on ? "Email notifications on — booking confirmations, homework and reminders will be emailed to you." : "Email notifications off.");
  }

  async function changePushNotifs(on: boolean) {
    if (!me.id) {
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

  // --- Privacy ---
  const [profilePublic, setProfilePublic] = useState(initialSettings?.profilePublic ?? false);
  const [shareProgressWithParent, setShareProgressWithParent] = useState(initialSettings?.shareProgressWithGuardian ?? true);
  const [savingPrivacy, setSavingPrivacy] = useState<"public" | "share" | null>(null);

  async function changePrivacy(key: "public" | "share", on: boolean) {
    const set = key === "public" ? setProfilePublic : setShareProgressWithParent;
    set(on);
    if (!me.id) return;
    setSavingPrivacy(key);
    const result = await updateMyPrivacy(key === "public" ? { profilePublic: on } : { shareProgressWithGuardian: on });
    setSavingPrivacy(null);
    if (!result.ok) {
      set(!on);
      toast.error(result.message ?? "Couldn't save your privacy settings.");
      return;
    }
    if (key === "public") {
      toast.success(on ? "Your profile is now public — tutors can view it before you book." : "Your profile is now private — only tutors you've booked can see it.");
    } else {
      toast.success(on ? "Your parent/guardian can now see your learning plan and progress." : "Your progress is now hidden from your parent/guardian.");
    }
  }

  // --- Security ---
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(initialSettings?.loginAlerts ?? true);
  const [savingLoginAlerts, setSavingLoginAlerts] = useState(false);
  const hasPassword = initialSettings?.hasPassword ?? true;

  async function changeLoginAlerts(on: boolean) {
    setLoginAlerts(on);
    if (!me.id) return;
    setSavingLoginAlerts(true);
    const result = await updateMyLoginAlerts(on);
    setSavingLoginAlerts(false);
    if (!result.ok) {
      setLoginAlerts(!on);
      toast.error(result.message ?? "Couldn't save your login alert setting.");
      return;
    }
    toast.success(on ? `Login alerts on — we'll email ${me.email || "you"} when your account is signed in to from a new device.` : "Login alerts off.");
  }

  // --- Calendar sync ---
  const [calendarToken, setCalendarToken] = useState<string | null>(initialSettings?.calendarToken ?? null);
  const [savingCalendar, setSavingCalendar] = useState(false);
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const feedUrl = calendarToken && origin ? `${origin}/api/calendar/${calendarToken}.ics` : "";
  const webcalUrl = feedUrl.replace(/^https?:/, "webcal:");
  const isLocalhost = /\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(feedUrl);

  async function changeCalendarSync(on: boolean, regenerate = false) {
    if (!me.id) {
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

  // --- Theme ---
  const browserTheme = useSyncExternalStore(noopSubscribe, readThemeCookie, () => "light" as ThemePreference);
  const [themeChoice, setThemeChoice] = useState<ThemePreference | null>(initialSettings?.theme ?? null);
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
    toast.success(`${themeLabels.find((t) => t.value === next)?.label} theme on${me.id ? " — saved to your account" : ""}.`);
  }

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  function flash(message: string) {
    toast(message);
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
    if (!me.id) {
      toast("Password changes are available once you're signed in.");
      return;
    }
    if (passwordTooWeak) {
      toast.error("Use at least 8 characters, including a letter and a number.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords don't match.");
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

  function openMobilePanel(panel: MobilePanel) {
    setMobilePanel(panel);
    setMobileView("detail");
    if (panel !== "Personal Details") setTab(panel);
  }

  function renderTabContent(t: Tab) {
    switch (t) {
      case "Account":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Account Information</h2>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Email address</span>
              {me.id ? (
                <>
                  <input value={email} readOnly disabled className="h-10 cursor-not-allowed rounded-lg border border-ensena-border bg-ensena-bg-soft px-3 text-sm text-ensena-muted" />
                  <span className="text-xs text-ensena-muted">To correct your email, please contact Ensena Support.</span>
                </>
              ) : (
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
              )}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs font-medium text-ensena-muted">Phone number</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
            </label>
            <Button onClick={requestSaveAccount} className="mt-2 h-10 w-fit rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
              Save Changes
            </Button>
          </div>
        );

      case "Notifications":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Notification Preferences</h2>
            <Toggle checked={emailNotifs} onChange={(v) => savingPref !== "email" && void changeEmailNotifs(v)} label="Email Notifications" description={`Booking confirmations, homework and reminders${me.id ? ` — sent to ${me.email}` : ""}`} />
            {me.id && emailNotifs && (
              <button type="button" onClick={() => sendTest("email")} disabled={testing !== null} className="-mt-1 self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                {testing === "email" ? "Sending…" : "Send me a test email"}
              </button>
            )}
            <Toggle checked={smsNotifs} onChange={setSmsNotifs} label="SMS Notifications" description="Get a text before upcoming lessons" />
            <Toggle
              checked={pushNotifs}
              onChange={(v) => savingPref !== "push" && void changePushNotifs(v)}
              label="Push Notifications"
              description={savingPref === "push" ? "Setting up…" : "Alerts on this device, even when Ensena isn't open"}
            />
            {me.id && pushNotifs && (
              <button type="button" onClick={() => sendTest("push")} disabled={testing !== null} className="-mt-1 self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60">
                {testing === "push" ? "Sending…" : "Send a test push to my devices"}
              </button>
            )}
            {me.id && !pushNotifs && pushNeedsInstall && (
              <p className="text-xs text-ensena-muted">On iPhone/iPad, add Ensena to your Home Screen (Share → Add to Home Screen) to get push notifications.</p>
            )}
          </div>
        );

      case "Privacy":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Privacy</h2>
            <Toggle
              checked={profilePublic}
              onChange={(v) => savingPrivacy === null && void changePrivacy("public", v)}
              label="Public Profile"
              description={
                profilePublic
                  ? "Tutors can see your name, level, subjects, bio and learning goals before you book"
                  : "Private — only tutors you've booked with can see your profile"
              }
            />
            <Toggle
              checked={shareProgressWithParent}
              onChange={(v) => savingPrivacy === null && void changePrivacy("share", v)}
              label="Share Progress with Parent"
              description={
                me.guardian
                  ? `${me.guardian.fullName || "Your parent/guardian"} ${shareProgressWithParent ? "can" : "can't"} see your learning plan, subjects and progress on their dashboard`
                  : "Applies once a parent or guardian is linked to your account"
              }
            />
          </div>
        );

      case "Security":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Security</h2>
            <Toggle checked={twoFactor} onChange={setTwoFactor} label="Two-Factor Authentication" description="Add an extra layer of security to your account" />
            <Toggle
              checked={loginAlerts}
              onChange={(v) => !savingLoginAlerts && void changeLoginAlerts(v)}
              label="Login Alerts"
              description={`Get an email${me.id ? ` at ${me.email}` : ""} when your account is signed in to from a new device`}
            />
            <Button variant="outline" onClick={() => setChangePasswordOpen(true)} className="mt-2 h-10 w-fit rounded-full border-ensena-border px-5 text-sm font-medium">
              {hasPassword ? "Change Password" : "Set a Password"}
            </Button>
            {!hasPassword && <p className="text-xs text-ensena-muted">You sign in with Google. Add a password to also sign in with your email address.</p>}
          </div>
        );

      case "Payment Methods":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Payment Methods</h2>
            <p className="text-sm text-ensena-muted">No saved payment methods yet. Add one during your next booking.</p>
            <Button variant="outline" onClick={() => flash("Payment methods are added during checkout on your next booking.")} className="h-10 w-fit rounded-full border-ensena-border px-5 text-sm font-medium">
              Add Payment Method
            </Button>
          </div>
        );

      case "Calendar Sync":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Calendar Sync</h2>
            <Toggle
              checked={!!calendarToken}
              onChange={(v) => !savingCalendar && void changeCalendarSync(v)}
              label="Sync with Google Calendar"
              description={savingCalendar ? "Updating…" : "Your lessons, sessions and homework due dates appear in your calendar and stay up to date automatically"}
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
                  {isLocalhost && " Note: calendar apps can't reach localhost — this works once Ensena is deployed."}
                </p>
                <button
                  type="button"
                  disabled={savingCalendar}
                  onClick={() => void changeCalendarSync(true, true)}
                  className="self-start text-xs font-semibold text-ensena-primary hover:underline disabled:opacity-60"
                >
                  Reset link (if you shared it by mistake)
                </button>
              </div>
            )}
          </div>
        );

      case "Theme":
        return (
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
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium",
                    theme === t.value ? "border-ensena-primary bg-ensena-primary/5 text-ensena-ink" : "border-ensena-border text-ensena-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-ensena-muted">
              {theme === "system" ? "Follows your device's light/dark setting. " : ""}Applies to your Ensena dashboard{me.id ? " on all your devices" : ""}.
            </p>
          </div>
        );

      case "Delete Account":
        return (
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-rose-600">
              <AlertTriangle className="size-5" /> Delete Account
            </h2>
            <p className="text-sm text-ensena-muted">
              Deleting your account is permanent. You will lose access to your lessons, homework and messages. This cannot be undone.
            </p>
            <Button onClick={() => setDeleteOpen(true)} className="mt-2 h-10 w-fit rounded-full bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700">
              Delete My Account
            </Button>
          </div>
        );
    }
  }

  function renderPersonalDetails() {
    return (
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-base font-semibold text-ensena-ink">Personal Details</h2>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Date of birth</span>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Academic level</span>
          <input value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Timezone</span>
          <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 rounded-lg border border-ensena-border px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Preferred language</span>
          <input
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-ensena-muted">Emergency contact</span>
          <input
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className="h-10 rounded-lg border border-ensena-border px-3 text-sm"
          />
        </label>
        <Button onClick={savePersonalDetails} className="mt-2 h-10 w-fit rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white">
          {personalSaved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    );
  }

  const mobileGroups: MobileGroup[] = [
    {
      title: "Account",
      icon: User,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
      rowIconBg: "bg-rose-50",
      rowIconColor: "text-rose-500",
      rows: [
        { label: "Account Information", description: "View and manage your account details.", icon: User, panel: "Account" },
        { label: "Personal Details", description: "Manage your profile and personal information.", icon: IdCard, panel: "Personal Details" },
      ],
    },
    {
      title: "Preferences",
      icon: SlidersHorizontal,
      iconBg: "bg-violet-50",
      iconColor: "text-violet-500",
      rowIconBg: "bg-violet-50",
      rowIconColor: "text-violet-500",
      rows: [
        { label: "Notifications", description: "Manage your notification preferences.", icon: Bell, panel: "Notifications" },
        { label: "Privacy", description: "Manage your privacy settings.", icon: Lock, panel: "Privacy" },
        { label: "Calendar Sync", description: "Sync your classes with your calendar.", icon: Calendar, panel: "Calendar Sync" },
        { label: "Theme", description: "Choose your preferred app theme.", icon: SlidersHorizontal, panel: "Theme" },
      ],
    },
    {
      title: "Payments",
      icon: CreditCard,
      iconBg: "bg-sky-50",
      iconColor: "text-sky-500",
      rowIconBg: "bg-sky-50",
      rowIconColor: "text-sky-500",
      rows: [{ label: "Payment Methods", description: "Manage your saved payment methods.", icon: CreditCard, panel: "Payment Methods" }],
    },
    {
      title: "Security",
      icon: ShieldCheck,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      rowIconBg: "bg-emerald-50",
      rowIconColor: "text-emerald-600",
      rows: [{ label: "Password & Security", description: "Update your password and security settings.", icon: Lock, panel: "Security" }],
    },
  ];

  const mobilePanelLabel =
    mobilePanel === "Personal Details"
      ? "Personal Details"
      : mobileGroups.flatMap((g) => g.rows).find((r) => r.panel === mobilePanel)?.label ?? mobilePanel;

  return (
    <div>
      {mobileView === "list" && (
        <div className="lg:hidden">
          <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Settings</h1>
          <p className="mt-1 text-sm text-ensena-muted">Manage your account preferences.</p>
        </div>
      )}
      <div className="hidden lg:block">
        <h1 className="font-heading text-2xl font-semibold text-ensena-ink">Settings</h1>
        <p className="mt-1 text-sm text-ensena-muted">Manage your account preferences.</p>
      </div>

      {/* Desktop: unchanged sidebar + content panel */}
      <div className="mt-6 hidden gap-5 lg:grid lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-1 rounded-2xl border border-ensena-border bg-ensena-surface p-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "rounded-xl px-3 py-2 text-left text-sm font-medium",
                tab === t
                  ? "bg-ensena-primary/10 text-ensena-primary"
                  : t === "Delete Account"
                    ? "text-rose-600 hover:bg-rose-50"
                    : "text-ensena-muted hover:bg-ensena-bg-soft"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">{renderTabContent(tab)}</div>
      </div>

      {/* Mobile: compact grouped rows, each opening as a full-screen panel */}
      <div className="mt-5 lg:hidden">
        {mobileView === "list" ? (
          <div className="flex flex-col gap-5">
            {mobileGroups.map((group) => (
              <div key={group.title} className="overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <h2 className="font-heading text-sm font-semibold text-ensena-ink">{group.title}</h2>
                  <span className={cn("flex size-9 items-center justify-center rounded-full", group.iconBg)}>
                    <group.icon className={cn("size-4", group.iconColor)} />
                  </span>
                </div>
                <div className="border-t border-ensena-border">
                  {group.rows.map((row, i) => (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => openMobilePanel(row.panel)}
                      className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left", i > 0 && "border-t border-ensena-border")}
                    >
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", group.rowIconBg)}>
                        <row.icon className={cn("size-4", group.rowIconColor)} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ensena-ink">{row.label}</span>
                        <span className="block text-xs text-ensena-muted">{row.description}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-ensena-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
              <h2 className="font-heading text-sm font-semibold text-rose-600">Danger Zone</h2>
              <div className="my-3 border-t border-rose-200" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-rose-600">Delete Account</p>
                  <p className="text-xs text-ensena-muted">Permanently delete your Ensena account and all associated data.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="shrink-0 rounded-lg border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-600"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
            <button type="button" onClick={() => setMobileView("list")} className="mb-4 flex items-center gap-2 text-sm font-medium text-ensena-ink">
              <ArrowLeft className="size-4" /> {mobilePanelLabel}
            </button>
            {mobilePanel === "Personal Details" ? renderPersonalDetails() : renderTabContent(mobilePanel)}
          </div>
        )}
      </div>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Account Deletion">
        {deleteConfirmed ? (
          <p className="text-sm text-ensena-ink">Your deletion request has been received. Since this is a demo environment, no account was actually deleted.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ensena-muted">Are you sure you want to delete your Ensena student account? This action is irreversible.</p>
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

      <Modal open={confirmAccountOpen} onClose={() => !savingAccount && setConfirmAccountOpen(false)} title="Save these changes?">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">Are you sure you want to update your account details?</p>
          <div className="rounded-xl bg-ensena-bg-soft p-3 text-sm">
            {fullName.trim() !== me.name && (
              <p><span className="text-ensena-muted">Name:</span> {me.name} → <span className="font-semibold text-ensena-ink">{fullName.trim()}</span></p>
            )}
            {phone.trim() !== me.phone && (
              <p><span className="text-ensena-muted">Phone:</span> {me.phone || "—"} → <span className="font-semibold text-ensena-ink">{phone.trim() || "—"}</span></p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmAccountOpen(false)} disabled={savingAccount} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">
              No, cancel
            </Button>
            <Button onClick={confirmSaveAccount} loading={savingAccount} className="h-10 flex-1 rounded-full bg-ensena-primary text-sm font-semibold text-white">
              Yes, save
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

    </div>
  );
}
