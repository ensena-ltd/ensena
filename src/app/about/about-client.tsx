"use client";

import Link from "next/link";
import { BookOpen, Compass, GraduationCap, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/public-pages/public-page-hero";
import { ContentSection } from "@/components/public-pages/content-section";

const whatWeDo = [
  { icon: Users, title: "Private Tutoring", description: "One-on-one lessons matched to a student's subject, level and schedule." },
  { icon: GraduationCap, title: "Group Classes", description: "Structured classes where students learn alongside others at a similar level." },
  { icon: Compass, title: "Free Discovery Sessions", description: "A short introductory session with a tutor before committing to paid lessons." },
  { icon: BookOpen, title: "Academic Counselling", description: "Guidance for students who aren't sure where to start or what they need." },
];

const howItWorks = [
  "Find a tutor by subject, level and availability.",
  "Meet them through a free Discovery Session.",
  "Choose private tutoring or group classes.",
  "Continue learning through Ensena.",
];

export function AboutClient() {
  return (
    <div>
      <PublicPageHero
        title="Learning should feel personal."
        subtitle="Ensena makes quality academic support more accessible to every learner — tutors, group classes and academic guidance, built around how each student actually learns."
      />

      <ContentSection eyebrow="Our Mission" title="Making quality academic support easier to find">
        <p className="max-w-[720px] text-ensena-muted">
          Finding the right academic support shouldn&apos;t depend on who you know. Ensena&apos;s mission is to make it
          straightforward for students in Nigeria to find a tutor or group class that actually fits how they
          learn, and to get guidance when they&apos;re not sure where to start.
        </p>
      </ContentSection>

      <ContentSection eyebrow="What Ensena Does" title="A few ways to learn on Ensena" tinted>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {whatWeDo.map((item) => (
            <div key={item.title} className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
                <item.icon className="size-4.5" />
              </span>
              <p className="mt-3 font-heading text-sm font-semibold text-ensena-ink">{item.title}</p>
              <p className="mt-1 text-sm text-ensena-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection eyebrow="How Ensena Works" title="From finding a tutor to learning with them">
        <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((step, i) => (
            <li key={step} className="rounded-2xl border border-ensena-border p-6">
              <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-sm font-semibold text-ensena-primary">
                {i + 1}
              </span>
              <p className="mt-3 text-sm text-ensena-ink">{step}</p>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection eyebrow="For Students" title="Learn at your own pace" tinted>
        <p className="max-w-[720px] text-ensena-muted">
          Students can search for tutors by subject and level, meet a tutor through a free Discovery Session,
          and then book private lessons or join a group class. Lessons, messages and progress all live in one
          Student Dashboard.
        </p>
      </ContentSection>

      <ContentSection eyebrow="For Tutors" title="Teach on your own terms">
        <p className="max-w-[720px] text-ensena-muted">
          Educators can build a profile, set their own rates and availability, run private lessons or group
          classes, and get paid securely through Ensena. Tutors manage bookings, students and earnings from a
          dedicated Tutor Dashboard.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Academic Support" title="Speak to a Counsellor" tinted>
        <div className="flex flex-col items-start gap-4 rounded-2xl border border-ensena-border bg-ensena-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[520px] text-sm text-ensena-muted">
            Not sure which subject, tutor or learning path is right? Ensena&apos;s counsellors help students figure
            out where to start. This is one of the things that sets Ensena apart from a plain tutor directory.
          </p>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/counsellor" />}
            className="h-11 shrink-0 rounded-full border-ensena-border px-5 text-sm font-semibold text-ensena-ink"
          >
            Speak to a Counsellor
          </Button>
        </div>
      </ContentSection>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
          Find the right support for your learning.
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/find-teachers" />}
            className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Find a Tutor
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/counsellor" />}
            className="h-12 rounded-full border-ensena-border px-6 text-sm font-semibold text-ensena-ink"
          >
            Speak to a Counsellor
          </Button>
        </div>
      </section>
    </div>
  );
}
