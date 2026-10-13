import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Star,
  Users2,
  Wallet,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { TutorApplicationDataSync } from "@/components/tutor-dashboard/tutor-application-data-sync";
import {
  dashboardTutor,
  profileStatusChecklist,
  successToolFeatures,
  whatHappensNextSteps,
} from "@/lib/tutor-dashboard-data";

export const metadata: Metadata = {
  title: "You're Approved! | Ensena",
  description: "Your Ensena tutor profile has been approved and is ready to start teaching.",
};

const stepIcons = [GraduationCap, ShieldCheck, Wallet, BarChart3, Send];

export default function TutorWelcomePage() {
  const firstName = dashboardTutor.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-white">
      <TutorApplicationDataSync />
      <header className="border-b border-ensena-border">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <Logo size={48} />
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm font-medium text-ensena-muted">
              <HelpCircle className="size-4" /> Need Help?
            </span>
            <div className="relative size-9 overflow-hidden rounded-full">
              <Image src={dashboardTutor.image} alt={dashboardTutor.name} fill sizes="36px" className="object-cover" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ensena-success">
              <CheckCircle2 className="size-4" /> Congratulations, {firstName}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-ensena-ink sm:text-4xl">
              Welcome to Ensena, you&apos;re approved
            </h1>
            <p className="mt-3 max-w-lg text-ensena-muted">
              Your tutor profile has been approved. You&apos;re now part of a trusted community of
              educators helping students achieve their goals.
            </p>

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-ensena-border bg-ensena-success/5 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
              <div>
                <p className="text-sm font-semibold text-ensena-ink">
                  Your account is active and visible to students.
                </p>
                <p className="text-sm text-ensena-muted">Start teaching, inspiring and transforming lives.</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto flex w-fit flex-col items-center">
            <div className="relative">
              <span className="absolute -left-8 -top-4 flex size-11 items-center justify-center rounded-2xl bg-white text-ensena-primary shadow-md">
                <GraduationCap className="size-5" />
              </span>
              <span className="absolute -right-6 -top-2 flex size-11 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-md">
                <Star className="size-5 fill-amber-400" />
              </span>
              <span className="absolute -left-6 top-1/2 flex size-11 items-center justify-center rounded-2xl bg-white text-ensena-primary shadow-md">
                <Users2 className="size-5" />
              </span>
              <span className="absolute -right-8 top-1/2 flex size-11 items-center justify-center rounded-2xl bg-white text-ensena-success shadow-md">
                <BarChart3 className="size-5" />
              </span>
              <div className="relative size-56 overflow-hidden rounded-full ring-4 ring-white">
                <Image src={dashboardTutor.image} alt={dashboardTutor.name} fill sizes="224px" className="object-cover" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-ensena-border px-4 py-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-ensena-success/15 text-ensena-success">
                <CheckCircle2 className="size-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">Verified Tutor</p>
                <p className="text-xs text-ensena-muted">Identity and credentials verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* What happens next + profile status */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-lg font-semibold text-ensena-ink">What happens next?</h2>
            <p className="text-sm text-ensena-muted">Follow these simple steps to start receiving bookings.</p>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-5">
              {whatHappensNextSteps.map((step, i) => {
                const Icon = stepIcons[i];
                return (
                  <div key={step.title} className="relative text-center">
                    {i < whatHappensNextSteps.length - 1 && (
                      <span className="absolute left-1/2 top-6 hidden h-px w-full -translate-y-1/2 border-t border-dashed border-ensena-border sm:block" />
                    )}
                    <span className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                      <Icon className="size-5" />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-ensena-ink">{step.title}</p>
                    <p className="mt-1 text-xs text-ensena-muted">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-ensena-border p-6">
            <h2 className="font-heading text-base font-semibold text-ensena-ink">Your Profile Status</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {profileStatusChecklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ensena-ink">
                    <CheckCircle2 className="size-4 text-ensena-success" />
                    {item.label}
                  </span>
                  <span className="text-xs font-medium text-ensena-success">Completed</span>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/tutor-dashboard/profile" />}
              className="mt-5 h-10 w-full rounded-full border-ensena-primary text-sm font-semibold text-ensena-primary hover:bg-ensena-primary/5"
            >
              Complete Your Profile
            </Button>
            <Link
              href="/tutor-dashboard/profile"
              className="mt-3 block text-center text-sm font-semibold text-ensena-primary hover:underline"
            >
              Go to My Profile →
            </Link>
          </div>
        </div>

        {/* Powerful tools */}
        <div className="mt-10 rounded-2xl border border-ensena-border p-6">
          <h2 className="font-heading text-lg font-semibold text-ensena-ink">Powerful tools to help you succeed</h2>
          <p className="text-sm text-ensena-muted">Everything you need to manage your tutoring journey in one place.</p>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-5">
            {successToolFeatures.map((feature, i) => {
              const icons = [
                { Icon: Send, bg: "bg-rose-100", text: "text-rose-600" },
                { Icon: MessageSquare, bg: "bg-indigo-100", text: "text-indigo-600" },
                { Icon: Wallet, bg: "bg-emerald-100", text: "text-emerald-600" },
                { Icon: BarChart3, bg: "bg-amber-100", text: "text-amber-600" },
                { Icon: GraduationCap, bg: "bg-blue-100", text: "text-blue-600" },
              ][i];
              return (
                <div key={feature.title}>
                  <span className={`flex size-10 items-center justify-center rounded-xl ${icons.bg} ${icons.text}`}>
                    <icons.Icon className="size-4.5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-ensena-ink">{feature.title}</p>
                  <p className="mt-1 text-xs text-ensena-muted">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-ensena-bg-soft p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ensena-ink">We&apos;re here to support you</p>
              <p className="text-xs text-ensena-muted">
                Our support team is always available to help you succeed on Ensena.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-ensena-ink">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="size-4 text-ensena-primary" /> Help Center
                <span className="text-ensena-muted">Articles &amp; Guides</span>
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="size-4 text-ensena-primary" /> Chat Support
                <span className="text-ensena-muted">Online 24/7</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="size-4 text-ensena-primary" /> Email Support
                <span className="text-ensena-muted">support@ensena.co</span>
              </span>
            </div>
          </div>
        </div>

        {/* All set */}
        <div className="mt-12 flex flex-col items-center text-center">
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink">You&apos;re all set!</h2>
          <p className="mt-2 max-w-md text-ensena-muted">
            Start by completing your remaining profile details and setting your availability.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              nativeButton={false}
              render={<Link href="/tutor-dashboard" />}
              className="h-11 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white hover:bg-ensena-primary-hover"
            >
              Go to Dashboard →
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/tutor-dashboard/private-lessons?tab=Calendar" />}
              className="h-11 rounded-full border-ensena-border px-8 text-sm font-medium"
            >
              Set Availability Now
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 rounded-2xl bg-ensena-success/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-ensena-ink">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ensena-success" />
            <span>
              <span className="font-semibold">Your students are in safe hands.</span> Ensena holds
              all payments securely in escrow and releases them only after lessons are completed.
              You focus on teaching, we handle the rest.
            </span>
          </p>
          <Link href="/tutor-dashboard/escrow" className="shrink-0 text-sm font-semibold text-ensena-primary hover:underline">
            Learn more about escrow →
          </Link>
        </div>
      </div>
    </div>
  );
}
