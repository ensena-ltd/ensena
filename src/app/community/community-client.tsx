"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/public-pages/public-page-hero";
import { ContentSection } from "@/components/public-pages/content-section";

const pillars = [
  { icon: Users, title: "Students", description: "Learn one-on-one or alongside others, at a pace that fits you." },
  { icon: GraduationCap, title: "Tutors", description: "Teach the way you teach best: private lessons or structured group classes." },
  { icon: BookOpen, title: "Group Learning", description: "Group Classes bring students together around a shared subject and schedule." },
  { icon: Users, title: "Academic Support", description: "Counsellors help students who aren't sure where to start." },
];

export function CommunityClient() {
  return (
    <div>
      <PublicPageHero
        title="Learn together."
        subtitle="Ensena's community is students and tutors learning together, through group classes and the support around them."
      />

      <ContentSection>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {pillars.map((item) => (
            <div key={item.title} className="rounded-2xl border border-ensena-border p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
                <item.icon className="size-4.5" />
              </span>
              <p className="mt-3 font-heading text-sm font-semibold text-ensena-ink">{item.title}</p>
              <p className="mt-1 text-sm text-ensena-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection tinted>
        <p className="max-w-[720px] text-ensena-muted">
          Students take part in the Ensena community mainly through Group Classes: structured, tutor-led
          classes where you learn alongside other students at a similar level, rather than a public feed or
          forum.
        </p>
      </ContentSection>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Ready to learn together?</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/group-classes" />}
            className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Explore Group Classes
          </Button>
        </div>
      </section>
    </div>
  );
}
