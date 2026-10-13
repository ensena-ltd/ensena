import Link from "next/link";
import { GraduationCap, HeartHandshake, ShieldCheck, Users2 } from "lucide-react";

import { Logo } from "@/components/logo";

const workspaces = [
  {
    label: "Admin Dashboard",
    description: "Manage the entire platform: users, tutors, payments, escrow, and disputes.",
    href: "/admin/dashboard",
    icon: ShieldCheck,
  },
  {
    label: "Counsellor Dashboard",
    description: "Manage student guidance: appointments, intake forms, and action plans.",
    href: "/counsellor-dashboard",
    icon: HeartHandshake,
  },
  {
    label: "Tutor Dashboard",
    description: "Preview the tutor experience: lessons, earnings, and students.",
    href: "/tutor-dashboard",
    icon: Users2,
  },
  {
    label: "Student Dashboard",
    description: "Preview the student experience: lessons, progress, and homework.",
    href: "/student-dashboard",
    icon: GraduationCap,
  },
];

export default function AdminRootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-ensena-bg-soft px-6 py-16">
      <Logo />
      <h1 className="mt-8 font-heading text-2xl font-semibold text-ensena-ink">Welcome back, Cynthia</h1>
      <p className="mt-1 text-sm text-ensena-muted">Choose a workspace</p>

      <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {workspaces.map((w) => (
          <Link
            key={w.href}
            href={w.href}
            className="flex flex-col gap-3 rounded-2xl border border-ensena-border bg-ensena-surface p-6 transition-shadow hover:shadow-md"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
              <w.icon className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-semibold text-ensena-ink">{w.label}</p>
              <p className="mt-1 text-sm text-ensena-muted">{w.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-8 max-w-md text-center text-xs text-ensena-muted">
        You have access to every workspace while running Ensena solo. As your team grows, role-based permissions will restrict each person to their relevant dashboard.
      </p>
    </div>
  );
}
