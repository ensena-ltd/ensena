"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  GraduationCap,
  Lock,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { heroImage, trustAvatars } from "@/lib/data";
import { buildContactSupportHref } from "@/lib/support-links";
import { safeRedirectPath } from "@/lib/utils";

const trustBullets = [
  { icon: ShieldCheck, title: "Verified & trusted tutors", description: "Every tutor goes through our verification process." },
  { icon: Lock, title: "Secure payments", description: "Your payments are protected with escrow." },
  { icon: Users, title: "Learn your way", description: "Private lessons, group classes and expert guidance." },
];

const whyChooseUs = [
  { icon: ShieldCheck, label: "Safe & secure learning environment" },
  { icon: MessageCircle, label: "Support when you need it" },
  { icon: GraduationCap, label: "Flexible scheduling to fit your time" },
  { icon: Star, label: "Better results, guaranteed" },
];

export function SignUpChooserClient() {
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const withRedirect = (href: string) => (redirectTo ? `${href}?redirectTo=${encodeURIComponent(redirectTo)}` : href);

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
      {/* Left brand panel */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-ensena-bg-soft px-8 py-10 sm:px-12 lg:py-14">
        <div>
          <Link href="/" aria-label="Ensena home">
            <Logo size={48} />
          </Link>

          <h1 className="mt-8 font-heading text-3xl font-semibold leading-tight text-ensena-ink lg:text-4xl">
            Learn. Teach. <span className="text-ensena-primary">Make an impact.</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ensena-muted">
            Ensena makes quality, personalized academic support more accessible to every learner.
          </p>

          <div className="mt-8 flex flex-col gap-5">
            {trustBullets.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                  <b.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{b.title}</p>
                  <p className="text-xs text-ensena-muted">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 hidden max-w-sm lg:block">
          <span className="absolute -left-2 top-2 flex size-9 items-center justify-center rounded-xl bg-white text-ensena-primary shadow-md">
            <GraduationCap className="size-4.5" />
          </span>
          <span className="absolute right-4 top-16 flex size-9 items-center justify-center rounded-full bg-white text-violet-500 shadow-md">
            <MessageCircle className="size-4" />
          </span>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-white bg-ensena-bg-soft shadow-[0_20px_60px_-30px_rgba(17,24,39,0.35)]">
            <Image src={heroImage} alt="Student learning on Ensena" fill sizes="24rem" className="object-cover" />
          </div>

          <div className="absolute -bottom-6 -right-4 flex items-center gap-2.5 rounded-2xl border border-ensena-border bg-ensena-surface px-3.5 py-2.5 shadow-lg">
            <div className="flex -space-x-2.5">
              {trustAvatars.slice(0, 3).map((src) => (
                <Image key={src} src={src} alt="" width={28} height={28} className="size-7 rounded-full border-2 border-white object-cover" />
              ))}
            </div>
            <div className="text-xs text-ensena-muted">Verified students<br />and tutors</div>
          </div>
        </div>
      </div>

      {/* Right: chooser */}
      <div className="flex flex-1 flex-col justify-center px-6 py-14 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="text-center font-heading text-3xl font-semibold text-ensena-ink">Join Ensena</h2>
          <p className="mt-2 text-center text-sm text-ensena-muted">Create your account and start your learning journey or share your knowledge with students.</p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface">
              <div className="relative aspect-[4/3] w-full bg-ensena-primary/5">
                <Image src={heroImage} alt="Student learning" fill sizes="(min-width: 640px) 336px, 100vw" className="object-cover" />
              </div>
              <div className="p-5 text-center">
                <p className="font-heading text-lg font-semibold text-ensena-ink">I want to learn</p>
                <p className="text-sm font-semibold text-ensena-primary">Join as a Student</p>
                <p className="mt-2 text-xs leading-relaxed text-ensena-muted">
                  Find the right academic support, book Discovery Sessions, join group classes and achieve your academic goals.
                </p>
                <Button nativeButton={false} render={<Link href={withRedirect("/sign-up/student")} />} className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                  Continue as Student <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface">
              <div className="relative aspect-[4/3] w-full bg-violet-50">
                <Image src="/teacher-3.jpg.png" alt="Tutor teaching" fill sizes="(min-width: 640px) 336px, 100vw" className="object-cover" />
              </div>
              <div className="p-5 text-center">
                <p className="font-heading text-lg font-semibold text-ensena-ink">I want to teach</p>
                <p className="text-sm font-semibold text-violet-600">Join as a Tutor</p>
                <p className="mt-2 text-xs leading-relaxed text-ensena-muted">
                  Create your tutor profile, reach students who need your help and grow your teaching business.
                </p>
                <Button nativeButton={false} render={<Link href={withRedirect("/sign-up/tutor")} />} className="mt-4 h-11 w-full rounded-full bg-violet-600 text-sm font-semibold text-white hover:bg-violet-700">
                  Continue as Tutor <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ensena-muted">
            Already have an account? <Link href={withRedirect("/sign-in")} className="font-semibold text-ensena-primary hover:underline">Log in</Link>
          </p>
          <p className="mt-2 text-center text-xs text-ensena-muted">
            Need help? <Link href={buildContactSupportHref({ role: "Guest", context: "public", category: "Creating an account" })} className="text-ensena-primary hover:underline">Contact support</Link>
          </p>

          <div className="mt-8 border-t border-ensena-border pt-6">
            <p className="text-center text-xs font-medium text-ensena-muted">Why choose Ensena</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {whyChooseUs.map((w) => (
                <div key={w.label} className="flex items-start gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-primary"><w.icon className="size-4" /></span>
                  <p className="text-xs leading-tight text-ensena-muted">{w.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
