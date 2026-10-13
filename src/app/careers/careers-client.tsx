"use client";

import Link from "next/link";
import { Briefcase, Heart, Target, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicPageHero } from "@/components/public-pages/public-page-hero";
import { ContentSection } from "@/components/public-pages/content-section";
import { EmptyState } from "@/components/public-pages/empty-state";
import { openRoles } from "@/lib/careers-data";

const whyEnsena = [
  { icon: Target, title: "A clear mission", description: "We're building a straightforward way for students to find the right academic support." },
  { icon: Users, title: "Real users, real impact", description: "What we build directly changes whether a student finds the right tutor and the right guidance." },
  { icon: Heart, title: "Education-first", description: "We care about learning outcomes, not vanity metrics." },
];

export function CareersClient() {
  return (
    <div>
      <PublicPageHero
        title="Help us build a better way to learn."
        subtitle="Ensena makes quality academic support more accessible to every learner — tutors, group classes and academic guidance. We're a small team building the platform and the culture to match that mission."
      />

      <ContentSection eyebrow="Why Ensena" title="Why work here">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {whyEnsena.map((item) => (
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

      <ContentSection eyebrow="How We Work" title="Small team, direct ownership" tinted>
        <p className="max-w-[720px] text-ensena-muted">
          We work in a small, focused team where everyone is close to the product and the people using it.
          Decisions are made quickly, and everyone is expected to talk to students and tutors directly.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Who We Want to Work With" title="People who care about learning">
        <p className="max-w-[720px] text-ensena-muted">
          We&apos;re looking for people who take education seriously, are comfortable with an early-stage pace, and
          want to build something that genuinely helps students, wherever that takes their role.
        </p>
      </ContentSection>

      <ContentSection eyebrow="Open Roles" title="Current openings" tinted>
        {openRoles.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No open roles right now."
            description="We're growing. Check back soon for future opportunities."
          >
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/contact" />}
              className="h-10 rounded-full border-ensena-border px-5 text-sm font-semibold text-ensena-ink"
            >
              Contact Us
            </Button>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3">
            {openRoles.map((role) => (
              <div key={role.slug} className="flex flex-col justify-between gap-2 rounded-2xl border border-ensena-border p-6 sm:flex-row sm:items-center">
                <div>
                  <p className="font-heading text-sm font-semibold text-ensena-ink">{role.title}</p>
                  <p className="mt-0.5 text-xs text-ensena-muted">{role.department} · {role.location} · {role.type}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentSection>
    </div>
  );
}
