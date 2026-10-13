"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Ban,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  HeartHandshake,
  Lock,
  LockOpen,
  Mail,
  Phone,
  RefreshCcw,
  School,
  Star,
  Users2,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useTutorRating } from "@/hooks/use-reviews";
import { banReasons, initialAdminTutors, suspendReasons } from "@/lib/admin-data";
import { tutorProfiles } from "@/lib/admin-tutor-profile-data";
import {
  adminStudentIdByName,
  bookingsFor,
  counsellingSessionsFor,
  formatPlatformUserId,
  formatTutorId,
  groupClassesFor,
  marketplaceProfileFor,
  verificationDocumentsFor,
} from "@/lib/admin-user-profile-data";
import {
  platformUserStatusDot,
  platformUserStatusLabel,
  platformUsers,
  type PlatformUser,
  type PlatformUserStatus,
} from "@/lib/admin-users-data";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

const availabilityDaysLabel: Record<string, string> = {
  Weekdays: "Monday – Friday",
  Weekends: "Saturday – Sunday",
  Evenings: "Evenings, Monday – Sunday",
};

const studentTabs = [
  { key: "Overview", icon: Users2 },
  { key: "Bookings", icon: CalendarCheck },
  { key: "Payments", icon: CreditCard },
  { key: "Counselling", icon: HeartHandshake },
  { key: "Activity", icon: Activity },
] as const;

const tutorTabs = [
  { key: "Overview", icon: Users2 },
  { key: "Verification", icon: FileText },
  { key: "Classes", icon: School },
  { key: "Students", icon: GraduationCap },
  { key: "Earnings", icon: Wallet },
  { key: "Activity", icon: Activity },
] as const;

type StudentTabKey = (typeof studentTabs)[number]["key"];
type TutorTabKey = (typeof tutorTabs)[number]["key"];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-sm">
      <dt className="text-ensena-muted">{label}</dt>
      <dd className="text-right font-medium text-ensena-ink">{value}</dd>
    </div>
  );
}

function Card({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-ensena-border bg-ensena-surface p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold text-ensena-ink">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function AdminUserProfileClient({ userId }: { userId: string }) {
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<PlatformUser[]>(platformUsers);
  const user = users.find((u) => u.id === userId);

  const isTutor = user?.role === "Tutor";
  const tabDefs = isTutor ? tutorTabs : studentTabs;
  const tabParam = searchParams.get("tab");
  const validTab = (tabDefs as readonly { key: string }[]).some((t) => t.key === tabParam);
  const [tab, setTab] = useState<StudentTabKey | TutorTabKey>(
    (validTab ? tabParam : user?.status === "Pending Verification" && isTutor ? "Verification" : "Overview") as StudentTabKey | TutorTabKey
  );

  const [actionsOpen, setActionsOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState(banReasons[0]);
  const [restrictOpen, setRestrictOpen] = useState(false);
  // "Restrict" and "Suspend" both land on the same underlying account status
  // (PlatformUserStatus only has one non-Active/Banned state — see the label
  // note on platformUserStatusLabel in admin-users-data.ts) — this just
  // tracks which entry point opened the confirmation modal so its copy
  // matches what the admin clicked.
  const [restrictTrigger, setRestrictTrigger] = useState<"Restrict" | "Suspend">("Restrict");
  const [restrictReasonDraft, setRestrictReasonDraft] = useState(suspendReasons[0]);
  const [docModal, setDocModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const earlySourceTutor = isTutor ? initialAdminTutors.find((t) => `usr-${t.id}` === user?.id) : undefined;
  const rating = useTutorRating(earlySourceTutor?.name ?? "", earlySourceTutor?.rating ?? 0, earlySourceTutor?.reviews ?? 0);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast((cur) => (cur === message ? null : cur)), 2500);
  }

  function setStatus(status: PlatformUserStatus, reason?: Partial<Pick<PlatformUser, "restrictReason" | "banReason">>) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status, ...reason } : u)));
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-10 text-center">
        <p className="text-sm text-ensena-muted">This user could not be found.</p>
        <Link href="/admin/users" className="mt-3 inline-flex text-sm font-semibold text-ensena-primary hover:underline">← Back to Users</Link>
      </div>
    );
  }

  // TypeScript doesn't carry the `if (!user)` narrowing above into nested
  // function declarations below (they could in principle outlive this
  // render) — bind a definitely-typed alias once so those closures don't
  // need repeated non-null assertions.
  const currentUser = user;
  const marketplace = isTutor ? marketplaceProfileFor(currentUser.name) : undefined;
  const sourceTutor = isTutor ? initialAdminTutors.find((t) => `usr-${t.id}` === currentUser.id) : undefined;
  const tutorProfile = sourceTutor ? tutorProfiles[sourceTutor.id] : undefined;

  function confirmRestrict() {
    setStatus("Suspended", { restrictReason: restrictReasonDraft });
    flash(restrictTrigger === "Suspend" ? "Tutor suspended." : "Account restricted.");
    setRestrictOpen(false);
  }

  function addAdminNote() {
    if (!noteDraft.trim()) return;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, adminNotes: [noteDraft.trim(), ...u.adminNotes] } : u)));
    setNoteDraft("");
  }
  function removeRestriction() {
    setStatus("Active", { restrictReason: undefined });
    flash("Restriction removed.");
    setActionsOpen(false);
  }
  function confirmBan() {
    setStatus("Banned", { banReason });
    flash("Account banned.");
    setBanOpen(false);
    setActionsOpen(false);
  }
  function reactivate() {
    setStatus("Active", { banReason: undefined });
    flash("Account reactivated.");
    setActionsOpen(false);
  }
  const bookings = !isTutor ? bookingsFor(user) : [];
  const counselling = !isTutor ? counsellingSessionsFor(user) : [];
  const upcomingCounselling = counselling.find((c) => c.status === "Upcoming");
  const pastCounselling = counselling.filter((c) => c.status === "Completed");
  const groupClasses = isTutor ? groupClassesFor(user.name) : [];
  const assignedStudents = tutorProfile?.assignedStudents ?? [];
  const privateClassRows = (tutorProfile?.subjectsByLevel ?? []).map((sl) => ({
    title: sl.subject,
    type: "Private" as const,
    level: sl.levels.join("–"),
    students: assignedStudents.filter((s) => s.subject === sl.subject).length,
  }));
  const groupClassRows = groupClasses.map((c) => ({ title: c.title, type: "Group" as const, level: c.gradeLevel, students: c.students, slug: c.slug }));
  const groupClassPrice = groupClasses[0]?.price;

  // Real per-document verification data where the tutor's full profile
  // exists (submitted/date/filename, from admin-tutor-profile-data.ts);
  // falls back to the simpler status-only shape for the rare case a tutor
  // record has no matching detailed profile.
  const documents = tutorProfile
    ? ([
        { label: "Government ID", ...tutorProfile.verificationDocuments.idDocument },
        { label: "Academic Certificate", ...tutorProfile.verificationDocuments.qualifications },
        { label: "Teaching Certificate", ...tutorProfile.verificationDocuments.certificates },
        { label: "Other Document", ...tutorProfile.verificationDocuments.teachingVideo },
      ] as const)
    : isTutor
      ? verificationDocumentsFor().map((d) => ({ label: d.label, submitted: d.status === "Uploaded", submittedAt: undefined, fileName: undefined }))
      : [];

  // Available/withdrawn split off the tutor's real lifetime earnings — same
  // ratio convention already used for PlatformUser.walletBalance/
  // escrowBalance in admin-users-data.ts, just applied to the richer
  // TutorProfile earnings figure so every tutor tab agrees with itself.
  const availableBalance = tutorProfile ? Math.round(tutorProfile.earnings.lifetime * 0.08) : user.walletBalance;
  const totalWithdrawn = tutorProfile
    ? Math.max(0, tutorProfile.earnings.lifetime - availableBalance - tutorProfile.escrowHeld - tutorProfile.pendingWithdrawal)
    : 0;

  return (
    <div>
      <Link href="/admin/users" className="flex items-center gap-1 text-sm font-medium text-ensena-muted hover:text-ensena-ink">
        <ChevronLeft className="size-4" /> Back to Users
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-ensena-border bg-ensena-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full">
              <Image src={user.image} alt={user.name} fill sizes="80px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-xl font-semibold text-ensena-ink">{user.name}</h1>
                <span className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", isTutor && user.verified ? "bg-emerald-100 text-emerald-700" : "text-ensena-ink")} style={!(isTutor && user.verified) ? { backgroundColor: "var(--ensena-bg-soft)" } : undefined}>
                  <span className={cn("size-2 rounded-full", platformUserStatusDot[user.status])} />
                  {isTutor && user.verified ? "Verified Tutor" : platformUserStatusLabel[user.status]}
                </span>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-ensena-primary">
                {user.role} · ID: {isTutor && sourceTutor ? formatTutorId(sourceTutor.id) : formatPlatformUserId(user)}
              </p>
              <p className="mt-1 text-xs text-ensena-muted">Joined {user.joined}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ensena-muted">
                <span className="flex items-center gap-1"><Mail className="size-3.5" /> {user.email}</span>
                <span className="flex items-center gap-1"><Phone className="size-3.5" /> {user.phone}</span>
                <span className="flex items-center gap-1">🇳🇬 {user.state}, {user.country}</span>
              </div>
              {isTutor && sourceTutor && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">Classes {groupClassRows.length + privateClassRows.length}</span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">Students {assignedStudents.length}</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Earnings {formatNaira(sourceTutor.earnings)}</span>
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                    <Star className="size-3 fill-amber-600 text-amber-600" /> {rating.rating || "N/A"} ({rating.reviews})
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user.status === "Active" && (
              <button type="button" onClick={() => { setRestrictTrigger("Restrict"); setRestrictOpen(true); }} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                <Lock className="size-3.5" /> Restrict {isTutor ? "Tutor" : "Account"}
              </button>
            )}
            {user.status === "Suspended" && (
              <button type="button" onClick={removeRestriction} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                <LockOpen className="size-3.5" /> Remove Restriction
              </button>
            )}
            {user.status === "Banned" && (
              <button type="button" onClick={reactivate} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-primary px-4 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">
                <RefreshCcw className="size-3.5" /> Reactivate {isTutor ? "Tutor" : "Account"}
              </button>
            )}
            <div className="relative">
              <button type="button" onClick={() => setActionsOpen((v) => !v)} className="flex h-9 items-center gap-1.5 rounded-full border border-ensena-border px-3.5 text-xs font-semibold text-ensena-ink hover:bg-ensena-bg-soft">
                Actions <ChevronDown className={cn("size-3.5 transition-transform", actionsOpen && "rotate-180")} />
              </button>
              {actionsOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setActionsOpen(false)} />
                  <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-ensena-border bg-ensena-surface p-1.5 shadow-lg">
                    {isTutor && user.status === "Pending Verification" && sourceTutor && (
                      <>
                        <Link href={`/admin/verification/${sourceTutor.id}`} onClick={() => setActionsOpen(false)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-primary hover:bg-ensena-primary/5">
                          <CheckCircle2 className="size-3.5" /> Review Verification
                        </Link>
                        <div className="my-1 border-t border-ensena-border" />
                      </>
                    )}
                    {isTutor && user.status === "Active" && (
                      <button type="button" onClick={() => { setRestrictTrigger("Suspend"); setRestrictOpen(true); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-orange-600 hover:bg-orange-50">
                        <Lock className="size-3.5" /> Suspend Tutor
                      </button>
                    )}
                    {user.status !== "Banned" && (
                      <button type="button" onClick={() => { setBanOpen(true); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50">
                        <Ban className="size-3.5" /> Ban {isTutor ? "Tutor" : "Account"}
                      </button>
                    )}
                    {user.status === "Banned" && (
                      <button type="button" onClick={reactivate} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-success hover:bg-ensena-success/10">
                        <RefreshCcw className="size-3.5" /> Reactivate {isTutor ? "Tutor" : "Account"}
                      </button>
                    )}
                    <button type="button" onClick={() => { setTab("Activity"); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                      <Activity className="size-3.5" /> View Activity Log
                    </button>
                    {marketplace && (
                      <Link href={`/find-teachers/${marketplace.slug}`} target="_blank" onClick={() => setActionsOpen(false)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">
                        <FileText className="size-3.5" /> View Public Profile
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-6 overflow-x-auto border-b border-ensena-border text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabDefs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 transition-colors",
              tab === t.key ? "border-ensena-primary text-ensena-primary" : "border-transparent text-ensena-muted hover:text-ensena-ink"
            )}
          >
            <t.icon className="size-4" /> {t.key}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Overview" && !isTutor && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_320px]">
              <Card title="Personal Information" action={<button type="button" onClick={() => flash("Editing user records isn't available in this demo yet.")} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit</button>}>
                <dl className="mt-2 divide-y divide-ensena-border">
                  <InfoRow label="Full Name" value={user.name} />
                  <InfoRow label="Email Address" value={user.email} />
                  <InfoRow label="Phone Number" value={user.phone} />
                  <InfoRow label="Country" value={user.country} />
                  <InfoRow label="State" value={user.state} />
                  <InfoRow label="Registration Date" value={user.joined} />
                  <InfoRow label="Account Status" value={platformUserStatusLabel[user.status]} />
                </dl>
              </Card>

              <Card title="Academic Information" action={<button type="button" onClick={() => flash("Editing user records isn't available in this demo yet.")} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit</button>}>
                <dl className="mt-2 divide-y divide-ensena-border">
                  <InfoRow label="Academic Level" value={user.academicLevel ?? "Not set"} />
                  <InfoRow label="Preferred Mode" value="Online" />
                </dl>
                <p className="mt-3 text-xs text-ensena-muted">Only editable to correct information. Subject and exam-goal detail lives on the student&apos;s own profile.</p>
              </Card>

              <div className="flex flex-col gap-4">
                <Card title="Summary">
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Total Bookings" value={String(user.totalBookings)} />
                    <InfoRow label="Completed Lessons" value={String(user.totalLessons)} />
                    <InfoRow label="Total Spent" value={formatNaira(user.totalPayments)} />
                    <InfoRow label="Refunds" value={formatNaira(user.totalRefunds)} />
                    <InfoRow label="Account Status" value={platformUserStatusLabel[user.status]} />
                  </dl>
                </Card>

                <Card title="Admin Actions">
                  <div className="mt-2 flex flex-col gap-1.5">
                    {user.status === "Active" && (
                      <button type="button" onClick={() => setRestrictOpen(true)} className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-3 py-2.5 text-left text-xs">
                        <Lock className="size-4 shrink-0 text-rose-600" />
                        <span><span className="block font-semibold text-rose-700">Restrict Account</span><span className="text-rose-600/80">Limit user access temporarily</span></span>
                      </button>
                    )}
                    {user.status !== "Banned" && (
                      <button type="button" onClick={() => setBanOpen(true)} className="flex items-center gap-2.5 rounded-xl bg-orange-50 px-3 py-2.5 text-left text-xs">
                        <Ban className="size-4 shrink-0 text-orange-600" />
                        <span><span className="block font-semibold text-orange-700">Ban Account</span><span className="text-orange-600/80">Permanently ban from platform</span></span>
                      </button>
                    )}
                    {user.status !== "Active" && user.status !== "Deleted" && (
                      <button type="button" onClick={user.status === "Banned" ? reactivate : removeRestriction} className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-xs">
                        <RefreshCcw className="size-4 shrink-0 text-emerald-600" />
                        <span><span className="block font-semibold text-emerald-700">Reactivate Account</span><span className="text-emerald-600/80">Restore user access</span></span>
                      </button>
                    )}
                    <button type="button" onClick={() => setTab("Bookings")} className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5 text-left text-xs">
                      <Calendar className="size-4 shrink-0 text-blue-600" />
                      <span><span className="block font-semibold text-blue-700">View Bookings</span><span className="text-blue-600/80">See all bookings</span></span>
                    </button>
                    <button type="button" onClick={() => setTab("Payments")} className="flex items-center gap-2.5 rounded-xl bg-violet-50 px-3 py-2.5 text-left text-xs">
                      <CreditCard className="size-4 shrink-0 text-violet-600" />
                      <span><span className="block font-semibold text-violet-700">View Payments</span><span className="text-violet-600/80">View payment history</span></span>
                    </button>
                  </div>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
              <Card title="Recent Activity">
                <ul className="mt-3 flex flex-col gap-3">
                  {user.activity.slice(0, 5).map((a, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                      <div className="min-w-0">
                        <p className="text-sm text-ensena-ink">{a.action}</p>
                        <p className="text-xs text-ensena-muted">{a.time}</p>
                      </div>
                    </li>
                  ))}
                  {user.activity.length === 0 && <li className="text-sm text-ensena-muted">No activity yet.</li>}
                </ul>
                <button type="button" onClick={() => setTab("Activity")} className="mt-3 text-xs font-semibold text-ensena-primary hover:underline">View all activity</button>
              </Card>

              <Card title="Latest Bookings" action={<button type="button" onClick={() => setTab("Bookings")} className="text-xs font-semibold text-ensena-primary hover:underline">View all bookings</button>}>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-ensena-border text-ensena-muted">
                        <th className="py-1.5 pr-3 font-medium">Booking ID</th>
                        <th className="py-1.5 pr-3 font-medium">Type</th>
                        <th className="py-1.5 pr-3 font-medium">Date</th>
                        <th className="py-1.5 pr-3 font-medium">Amount</th>
                        <th className="py-1.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className="border-b border-ensena-border last:border-0">
                          <td className="py-2 pr-3 font-mono text-ensena-ink">{b.id}</td>
                          <td className="py-2 pr-3 text-ensena-muted">{b.counterpart}</td>
                          <td className="py-2 pr-3 text-ensena-muted">{b.date}</td>
                          <td className="py-2 pr-3 text-ensena-ink">{formatNaira(b.amount)}</td>
                          <td className="py-2">
                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", b.status === "Upcoming" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>{b.status}</span>
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-ensena-muted">No bookings recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "Bookings" && !isTutor && (
          <Card title="Booking History">
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                    <th className="py-2 pr-4 font-medium">Booking ID</th>
                    <th className="py-2 pr-4 font-medium">Tutor / Class</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-ensena-border last:border-0">
                      <td className="py-3 pr-4 font-mono text-ensena-ink">{b.id}</td>
                      <td className="py-3 pr-4 text-ensena-ink">{b.title}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{b.type}</td>
                      <td className="py-3 pr-4 text-ensena-muted">{b.date}</td>
                      <td className="py-3 pr-4 text-ensena-ink">{formatNaira(b.amount)}</td>
                      <td className="py-3">
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", b.status === "Upcoming" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-ensena-muted">No bookings recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === "Payments" && !isTutor && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Total Paid</p><p className="mt-1 text-lg font-semibold text-ensena-ink">{formatNaira(user.totalPayments)}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Pending</p><p className="mt-1 text-lg font-semibold text-ensena-ink">{formatNaira(user.pendingPayments)}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Refunds</p><p className="mt-1 text-lg font-semibold text-rose-600">{formatNaira(user.totalRefunds)}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Wallet Balance</p><p className="mt-1 text-lg font-semibold text-ensena-ink">{formatNaira(user.walletBalance)}</p></div>
            </div>
            <Card title="Payment History">
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ensena-border text-xs text-ensena-muted">
                      <th className="py-2 pr-4 font-medium">Booking</th>
                      <th className="py-2 pr-4 font-medium">Amount</th>
                      <th className="py-2 pr-4 font-medium">Payment Status</th>
                      <th className="py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-ensena-border last:border-0">
                        <td className="py-3 pr-4 font-mono text-ensena-ink">{b.id}</td>
                        <td className="py-3 pr-4 text-ensena-ink">{formatNaira(b.amount)}</td>
                        <td className="py-3 pr-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Paid</span></td>
                        <td className="py-3 text-ensena-muted">{b.date}</td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-ensena-muted">No payments recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "Counselling" && !isTutor && (
          <div className="flex flex-col gap-4">
            <Card title="Counselling History">
              <div className="mt-3 flex flex-col gap-3">
                {upcomingCounselling && (
                  <div className="rounded-xl bg-blue-50 p-3.5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Upcoming</p>
                    <p className="mt-1 flex items-center gap-1.5 font-medium text-ensena-ink"><Clock className="size-3.5" /> {upcomingCounselling.date}</p>
                    <p className="text-xs text-ensena-muted">{upcomingCounselling.type}</p>
                  </div>
                )}
                {pastCounselling.map((c, i) => (
                  <div key={i} className="rounded-xl bg-ensena-bg-soft p-3.5 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ensena-muted">Previous Session</p>
                    <p className="mt-1 font-medium text-ensena-ink">{c.date} · Completed</p>
                  </div>
                ))}
                {counselling.length === 0 && <p className="text-sm text-ensena-muted">No counselling sessions on record.</p>}
              </div>
            </Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card title="Intake Form"><p className="mt-2 text-sm text-ensena-muted">No intake form submitted yet.</p></Card>
              <Card title="Action Plan"><p className="mt-2 text-sm text-ensena-muted">No action plan created yet.</p></Card>
              <Card title="Counsellor Notes"><p className="mt-2 text-sm text-ensena-muted">No notes on file. Visible to authorized counselling staff only.</p></Card>
            </div>
          </div>
        )}

        {tab === "Overview" && isTutor && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_320px]">
              <Card
                title="About the Tutor"
                className="xl:col-start-1 xl:row-start-1"
                action={<button type="button" onClick={() => flash("Editing user records isn't available in this demo yet.")} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit</button>}
              >
                <p className="mt-2 text-sm text-ensena-muted">{tutorProfile?.bio ?? marketplace?.bio ?? "No bio on file yet."}</p>
                <dl className="mt-3 divide-y divide-ensena-border">
                  <InfoRow label="Subjects" value={sourceTutor?.subjects.join(", ") ?? marketplace?.subject ?? "—"} />
                  <InfoRow label="Academic Levels" value={marketplace?.levels.join(", ") ?? "—"} />
                  <InfoRow label="Exam Expertise" value={marketplace?.levels.filter((l) => l.includes("WAEC") || l.includes("JAMB") || l.includes("NECO") || l.includes("UTME")).join(", ") || "—"} />
                  <InfoRow label="Languages" value={tutorProfile?.languages.join(", ") ?? marketplace?.languages.join(", ") ?? "—"} />
                  <InfoRow label="Teaching Experience" value={tutorProfile ? `${tutorProfile.experienceYears} years` : marketplace ? `${marketplace.yearsExperience} years` : "—"} />
                  <InfoRow label="Education" value={tutorProfile?.education ?? "—"} />
                </dl>
              </Card>

              <Card
                title="Teaching & Pricing"
                className="xl:col-start-2 xl:row-start-1"
                action={<button type="button" onClick={() => flash("Editing user records isn't available in this demo yet.")} className="rounded-full border border-ensena-border px-3 py-1 text-xs font-medium text-ensena-ink hover:bg-ensena-bg-soft">Edit</button>}
              >
                <dl className="mt-2 divide-y divide-ensena-border">
                  <InfoRow label="Private Lesson Price" value={tutorProfile ? `${formatNaira(tutorProfile.hourlyRate)}/hour` : marketplace ? `${formatNaira(marketplace.price)}/hour` : "—"} />
                  <InfoRow label="Group Class Price" value={groupClassPrice != null ? `${formatNaira(groupClassPrice)}/session` : "Not offered"} />
                  <InfoRow label="Discovery Session" value={marketplace ? `${formatNaira(Math.round(marketplace.price / 2))}/25 mins` : "—"} />
                  <InfoRow label="Preferred Mode" value={tutorProfile?.teachingMode ?? "—"} />
                  <InfoRow label="Discovery Session Availability" value={marketplace ? (marketplace.availableToday ? "Available" : "Not Available Today") : "—"} />
                  <InfoRow label="Preferred Days" value={marketplace?.availability.map((a) => availabilityDaysLabel[a] ?? a).join(", ") || "Not set"} />
                  <InfoRow label="Preferred Time" value="Not set" />
                  <InfoRow label="Time Zone" value={tutorProfile?.timezone ?? "—"} />
                </dl>
              </Card>

              <div className="flex flex-col gap-4 xl:col-start-3 xl:row-start-1">
                <Card title="Account Information">
                  <dl className="mt-2 divide-y divide-ensena-border">
                    <InfoRow label="Account Status" value={platformUserStatusLabel[user.status]} />
                    <InfoRow label="Verification Status" value={user.verified ? "Verified" : "Pending"} />
                    <InfoRow label="Joined Date" value={user.joined} />
                    <InfoRow label="Last Active" value={user.lastLogin} />
                    <InfoRow label="Country" value={user.country} />
                    <InfoRow label="State" value={user.state} />
                    <InfoRow label="User ID" value={sourceTutor ? formatTutorId(sourceTutor.id) : formatPlatformUserId(user)} />
                  </dl>
                </Card>
              </div>

              <Card title="Verification Summary" className="xl:col-start-1 xl:row-start-2" action={<span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", user.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{user.verified ? "Verified" : "Pending"}</span>}>
                <ul className="mt-3 flex flex-col gap-2">
                  {documents.map((d) => (
                    <li key={d.label} className="flex items-center justify-between gap-2 rounded-xl border border-ensena-border p-2.5 text-xs">
                      <span className="flex items-center gap-2 text-ensena-ink">
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", d.submitted ? "bg-emerald-100 text-emerald-600" : "bg-ensena-bg-soft text-ensena-muted")}><FileText className="size-3.5" /></span>
                        <span>
                          <span className="block font-medium">{d.label}</span>
                          <span className="text-ensena-muted">{d.submitted ? `Verified${d.submittedAt ? ` on ${d.submittedAt}` : ""}` : "Not submitted"}</span>
                        </span>
                      </span>
                      {d.submitted && (
                        <button type="button" onClick={() => setDocModal(d.label)} className="shrink-0 rounded-full border border-ensena-primary px-2.5 py-1 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View</button>
                      )}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => setTab("Verification")} className="mt-3 flex items-center gap-1 text-xs font-semibold text-ensena-primary hover:underline">View all documents →</button>
              </Card>

              <Card title="Active Classes" className="xl:col-start-2 xl:row-start-2" action={<button type="button" onClick={() => setTab("Classes")} className="text-xs font-semibold text-ensena-primary hover:underline">View all classes</button>}>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[380px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-ensena-border text-ensena-muted">
                        <th className="py-1.5 pr-3 font-medium">Class Title</th>
                        <th className="py-1.5 pr-3 font-medium">Type</th>
                        <th className="py-1.5 pr-3 font-medium">Level</th>
                        <th className="py-1.5 pr-3 font-medium">Students</th>
                        <th className="py-1.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...groupClassRows, ...privateClassRows].map((c) => (
                        <tr key={`${c.type}-${c.title}`} className="border-b border-ensena-border last:border-0">
                          <td className="py-2 pr-3 text-ensena-ink">{c.title}</td>
                          <td className="py-2 pr-3 text-ensena-muted">{c.type}</td>
                          <td className="py-2 pr-3 text-ensena-muted">{c.level}</td>
                          <td className="py-2 pr-3 text-ensena-ink">{c.students}</td>
                          <td className="py-2"><span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">Active</span></td>
                        </tr>
                      ))}
                      {groupClassRows.length + privateClassRows.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-ensena-muted">No active classes on record.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Admin Notes" className="xl:col-start-3 xl:row-start-2" action={<span className="text-[10px] font-semibold uppercase tracking-wide text-ensena-muted">Admin only</span>}>
                <p className="mt-1 text-xs text-ensena-muted">Never visible to the tutor or students.</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {user.adminNotes.length === 0 && <li className="text-xs text-ensena-muted">No notes yet.</li>}
                  {user.adminNotes.map((n, i) => (
                    <li key={i} className="rounded-lg bg-ensena-bg-soft px-2.5 py-1.5 text-xs text-ensena-ink">{n}</li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-1.5">
                  <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add an internal note…" className="h-8 flex-1 rounded-lg border border-ensena-border px-2.5 text-xs" />
                  <Button onClick={addAdminNote} className="h-8 rounded-lg bg-ensena-primary px-3 text-xs font-semibold text-white">Add</Button>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 border-t border-ensena-border pt-3">
                  {user.status === "Active" && (
                    <button type="button" onClick={() => { setRestrictTrigger("Restrict"); setRestrictOpen(true); }} className="flex items-center gap-2.5 rounded-xl bg-orange-50 px-3 py-2.5 text-left text-xs">
                      <Lock className="size-4 shrink-0 text-orange-600" />
                      <span><span className="block font-semibold text-orange-700">Restrict Tutor</span><span className="text-orange-600/80">Limit tutor access temporarily</span></span>
                    </button>
                  )}
                  {user.status === "Active" && (
                    <button type="button" onClick={() => { setRestrictTrigger("Suspend"); setRestrictOpen(true); }} className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 text-left text-xs">
                      <Clock className="size-4 shrink-0 text-amber-600" />
                      <span><span className="block font-semibold text-amber-700">Suspend Tutor</span><span className="text-amber-600/80">Pause tutor from teaching</span></span>
                    </button>
                  )}
                  {user.status !== "Banned" && (
                    <button type="button" onClick={() => setBanOpen(true)} className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-3 py-2.5 text-left text-xs">
                      <Ban className="size-4 shrink-0 text-rose-600" />
                      <span><span className="block font-semibold text-rose-700">Ban Tutor</span><span className="text-rose-600/80">Permanently ban tutor from platform</span></span>
                    </button>
                  )}
                  {user.status !== "Active" && user.status !== "Deleted" && (
                    <button type="button" onClick={user.status === "Banned" ? reactivate : removeRestriction} className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-left text-xs">
                      <RefreshCcw className="size-4 shrink-0 text-emerald-600" />
                      <span><span className="block font-semibold text-emerald-700">Reactivate Tutor</span><span className="text-emerald-600/80">Restore tutor access</span></span>
                    </button>
                  )}
                </div>
              </Card>

              <Card title="Recent Earnings Summary" className="xl:col-start-1 xl:row-start-3 xl:col-span-2">
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-ensena-bg-soft p-3">
                    <p className="flex items-center gap-1.5 text-xs text-ensena-muted"><Wallet className="size-3.5" /> Available Balance</p>
                    <p className="mt-1 text-lg font-semibold text-ensena-ink">{formatNaira(availableBalance)}</p>
                    <p className="text-[11px] text-ensena-muted">Ready for withdrawal</p>
                  </div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3">
                    <p className="text-xs text-ensena-muted">This Month</p>
                    <p className="mt-1 text-lg font-semibold text-ensena-ink">{tutorProfile ? formatNaira(tutorProfile.earnings.thisMonth) : "—"}</p>
                    <p className="text-[11px] text-ensena-muted">From {sourceTutor?.lessonsCompleted ?? 0} bookings</p>
                  </div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3">
                    <p className="text-xs text-ensena-muted">Total Earned</p>
                    <p className="mt-1 text-lg font-semibold text-ensena-ink">{tutorProfile ? formatNaira(tutorProfile.earnings.lifetime) : "—"}</p>
                    <p className="text-[11px] text-ensena-muted">All-time earnings</p>
                  </div>
                  <div className="rounded-xl bg-ensena-bg-soft p-3">
                    <p className="text-xs text-ensena-muted">Total Withdrawn</p>
                    <p className="mt-1 text-lg font-semibold text-ensena-ink">{formatNaira(totalWithdrawn)}</p>
                    <p className="text-[11px] text-ensena-muted">All-time withdrawals</p>
                  </div>
                </div>
              </Card>

              <Card title="Quick Links" className="xl:col-start-3 xl:row-start-3">
                <div className="mt-2 flex flex-col gap-1.5">
                  <button type="button" onClick={() => setTab("Classes")} className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5 text-left text-xs">
                    <Calendar className="size-4 shrink-0 text-blue-600" />
                    <span><span className="block font-semibold text-blue-700">View All Bookings</span><span className="text-blue-600/80">See all classes</span></span>
                  </button>
                  <button type="button" onClick={() => setTab("Earnings")} className="flex items-center gap-2.5 rounded-xl bg-violet-50 px-3 py-2.5 text-left text-xs">
                    <CreditCard className="size-4 shrink-0 text-violet-600" />
                    <span><span className="block font-semibold text-violet-700">View Payment History</span><span className="text-violet-600/80">See earnings & withdrawals</span></span>
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === "Verification" && isTutor && (
          <div className="flex flex-col gap-4">
            <Card title="Verification Status">
              <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", user.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                {user.verified ? "Verified" : "Pending Review"}
              </span>
            </Card>
            <Card title="Submitted Documents">
              <ul className="mt-3 flex flex-col gap-2">
                {documents.map((d) => (
                  <li key={d.label} className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm">
                    <span className="flex items-center gap-2 text-ensena-ink">
                      <FileText className="size-4 text-ensena-muted" />
                      <span>
                        {d.label}
                        {d.submittedAt && <span className="block text-xs text-ensena-muted">Verified on {d.submittedAt}</span>}
                      </span>
                    </span>
                    {d.submitted ? (
                      <button type="button" onClick={() => setDocModal(d.label)} className="rounded-full border border-ensena-primary px-3 py-1 text-xs font-semibold text-ensena-primary hover:bg-ensena-primary/5">View</button>
                    ) : (
                      <span className="text-xs font-medium text-rose-600">Missing</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            {!user.verified ? (
              <Link
                href={`/admin/verification/${sourceTutor?.id}`}
                className="flex h-11 w-fit items-center gap-1.5 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
              >
                Go to full verification review →
              </Link>
            ) : (
              <p className="text-sm text-ensena-muted">This tutor is already verified. No verification action needed.</p>
            )}
          </div>
        )}

        {tab === "Classes" && isTutor && (
          <div className="flex flex-col gap-4">
            <Card title="Private Lessons">
              <dl className="mt-2 divide-y divide-ensena-border">
                <InfoRow label="Completed Lessons" value={String(user.totalLessons)} />
                <InfoRow label="Total Bookings" value={String(user.totalBookings)} />
              </dl>
              {privateClassRows.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {privateClassRows.map((c) => (
                    <li key={c.title} className="flex items-center justify-between rounded-xl bg-ensena-bg-soft px-3 py-2 text-sm">
                      <span className="text-ensena-ink">{c.title}</span>
                      <span className="text-xs text-ensena-muted">{c.level} · {c.students} students</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Group Classes">
              <ul className="mt-3 flex flex-col gap-2">
                {groupClasses.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/group-classes/${c.slug}`} target="_blank" className="flex items-center justify-between rounded-xl border border-ensena-border p-3 text-sm hover:bg-ensena-bg-soft">
                      <span className="text-ensena-ink">{c.title}</span>
                      <span className="text-xs text-ensena-muted">{c.gradeLevel} · {c.students}/{c.maxSeats} students</span>
                    </Link>
                  </li>
                ))}
                {groupClasses.length === 0 && <p className="text-sm text-ensena-muted">No group classes on record for this tutor.</p>}
              </ul>
            </Card>
          </div>
        )}

        {tab === "Students" && isTutor && (
          <Card title="Students">
            <ul className="mt-3 flex flex-col divide-y divide-ensena-border">
              {assignedStudents.map((s) => {
                const studentId = adminStudentIdByName(s.name);
                const Row = (
                  <div className="flex flex-wrap items-center gap-3 py-3">
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-full"><Image src={s.image} alt={s.name} fill sizes="40px" className="object-cover" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ensena-ink">{s.name}</p>
                      <p className="text-xs text-ensena-muted">{s.subject} · {s.level}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span>
                  </div>
                );
                return (
                  <li key={s.name}>
                    {studentId ? (
                      <Link href={`/admin/users/usr-${studentId}`} className="block hover:bg-ensena-bg-soft rounded-xl px-1">{Row}</Link>
                    ) : (
                      Row
                    )}
                  </li>
                );
              })}
              {assignedStudents.length === 0 && <p className="py-4 text-sm text-ensena-muted">No students currently associated with this tutor.</p>}
            </ul>
          </Card>
        )}

        {tab === "Earnings" && isTutor && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Available Balance</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{formatNaira(availableBalance)}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">This Month</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{tutorProfile ? formatNaira(tutorProfile.earnings.thisMonth) : "—"}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Total Earned</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{tutorProfile ? formatNaira(tutorProfile.earnings.lifetime) : "—"}</p></div>
              <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-4"><p className="text-xs text-ensena-muted">Total Withdrawn</p><p className="mt-1 text-xl font-semibold text-ensena-ink">{formatNaira(totalWithdrawn)}</p></div>
            </div>
            <Card title="Held in Escrow / Pending Withdrawal">
              <dl className="mt-2 divide-y divide-ensena-border">
                <InfoRow label="Held in Escrow" value={tutorProfile ? formatNaira(tutorProfile.escrowHeld) : formatNaira(user.escrowBalance)} />
                <InfoRow label="Pending Withdrawal" value={tutorProfile ? formatNaira(tutorProfile.pendingWithdrawal) : formatNaira(user.pendingWithdrawal)} />
              </dl>
            </Card>
            <Card title="Recent Transactions">
              <ul className="mt-2 flex flex-col divide-y divide-ensena-border">
                {(tutorProfile?.lessons ?? []).filter((l) => l.status === "Completed").map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="text-ensena-ink">{l.student} · {l.subject}</p>
                      <p className="text-xs text-ensena-muted">{l.date}</p>
                    </div>
                    <span className="font-medium text-ensena-ink">{formatNaira(l.payment)}</span>
                  </li>
                ))}
                {(!tutorProfile || tutorProfile.lessons.filter((l) => l.status === "Completed").length === 0) && (
                  <li className="py-4 text-sm text-ensena-muted">No completed transactions yet.</li>
                )}
              </ul>
            </Card>
          </div>
        )}

        {tab === "Activity" && (
          <Card title="Activity Log">
            <ul className="mt-3 flex flex-col gap-3">
              {(isTutor && tutorProfile ? tutorProfile.activityLog : user.activity.map((a) => ({ time: a.time, action: a.action }))).map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ensena-primary" />
                  <div>
                    <p className="text-sm text-ensena-ink">{a.action}</p>
                    <p className="text-xs text-ensena-muted">{a.time}</p>
                  </div>
                </li>
              ))}
              {(isTutor && tutorProfile ? tutorProfile.activityLog.length : user.activity.length) === 0 && <p className="text-sm text-ensena-muted">No activity recorded yet.</p>}
            </ul>
          </Card>
        )}
      </div>

      {/* Restrict / Suspend confirmation — both real entry points converge on
          the same account status, see the restrictTrigger note above */}
      <Modal
        open={restrictOpen}
        onClose={() => setRestrictOpen(false)}
        title={restrictTrigger === "Suspend" ? `Suspend ${user.name.split(" ")[0]}?` : `Restrict ${user.name.split(" ")[0]}'s ${isTutor ? "account" : "account"}?`}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">
            {restrictTrigger === "Suspend"
              ? "This temporarily prevents the tutor from teaching while their account is preserved. They can be reactivated at any time."
              : "This limits the account's access temporarily. They can be reactivated at any time."}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={restrictReasonDraft} onChange={(e) => setRestrictReasonDraft(e.target.value)} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {suspendReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setRestrictOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmRestrict} className="h-10 flex-1 rounded-full bg-orange-600 text-sm font-semibold text-white hover:bg-orange-700">
              {restrictTrigger === "Suspend" ? "Suspend Tutor" : `Restrict ${isTutor ? "Tutor" : "Account"}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ban confirmation */}
      <Modal open={banOpen} onClose={() => setBanOpen(false)} title={`Ban ${isTutor ? "this tutor" : "this account"}?`}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ensena-muted">This will prevent {isTutor ? "the tutor" : "the student"} from accessing Enseña.</p>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-ensena-muted">Reason</span>
            <select value={banReason} onChange={(e) => setBanReason(e.target.value)} className="h-11 rounded-xl border border-ensena-border px-3 text-sm">
              {banReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="mt-1 flex gap-2">
            <Button variant="outline" onClick={() => setBanOpen(false)} className="h-10 flex-1 rounded-full border-ensena-border text-sm font-medium">Cancel</Button>
            <Button onClick={confirmBan} className="h-10 flex-1 rounded-full bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700">Ban {isTutor ? "Tutor" : "Account"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!docModal} onClose={() => setDocModal(null)} title={docModal ?? "Document"}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <BookOpen className="size-8 text-ensena-muted" />
          <p className="text-sm text-ensena-muted">Document preview isn&apos;t available in this demo environment. In production this opens the file the tutor uploaded during verification.</p>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ensena-ink px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
      )}
    </div>
  );
}
