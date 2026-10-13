"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Compass,
  Mic,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTutorRating } from "@/hooks/use-reviews";
import { heroImage, tutorBannerImage } from "@/lib/data";
import { formatNaira } from "@/lib/format";
import { splitEarnings } from "@/lib/commission";
import { tutorListings } from "@/lib/tutors";
import { cn } from "@/lib/utils";
import {
  afterLessonDiscovery,
  afterLessonStudent,
  classroomFeatures,
  counsellorSteps,
  discoverySessionSteps,
  faqItems,
  featureCards,
  groupClassInfo,
  discoveryFitMock,
  paymentSteps,
  privateLessonSteps,
  startWays,
  studentJourney,
  studentTimeline,
  trustCards,
  tutorEarningsExample,
  tutorJourney,
  tutorStartWays,
  verificationSteps,
  type Persona,
} from "@/lib/how-it-works-data";

const heroTutor = tutorListings.find((t) => t.name === "Emeka Okafor") ?? tutorListings[0];

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-xs font-semibold uppercase tracking-wide text-ensena-primary">{children}</p>;
}

function ConnectedSteps({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((item, i) => (
        <div key={item} className="flex items-center gap-2">
          <span className="rounded-full border border-ensena-border bg-ensena-surface px-3.5 py-1.5 text-sm font-medium text-ensena-ink">{item}</span>
          {i < items.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-ensena-muted" />}
        </div>
      ))}
    </div>
  );
}

export function HowItWorksClient() {
  const [persona, setPersona] = useState<Persona>("Student");
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0].q);
  const split = splitEarnings(tutorEarningsExample.studentPays);
  const heroRating = useTutorRating(heroTutor.name, heroTutor.rating, heroTutor.reviews);

  const ways = persona === "Student" ? startWays : tutorStartWays;
  const journey = persona === "Student" ? studentJourney : tutorJourney;

  return (
    <div>
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-ensena-bg-soft pb-16 pt-14">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:px-8 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">How It Works</p>
            <h1 className="mt-3 font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink lg:text-[3rem]">
              Learning that starts with <span className="text-ensena-primary">the right support.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-ensena-muted">
              Whether you already know what you need or you&apos;re still figuring it out, Ensena helps you access the academic support you need — meet a tutor, experience their teaching before committing, learn online, and get guidance when you need it.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button nativeButton={false} render={<Link href="/find-teachers" />} className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Find a Tutor
              </Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/counsellor" />} className="h-12 rounded-full border-ensena-border px-6 text-sm font-semibold text-ensena-ink">
                Speak to a Counsellor (Free)
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-2.5">
              <span className="text-sm font-medium text-ensena-muted">I&apos;m a:</span>
              <div className="flex gap-1 rounded-full bg-white p-1 text-sm shadow-sm">
                {(["Student", "Tutor"] as Persona[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPersona(p)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors",
                      persona === p ? "bg-ensena-primary/10 text-ensena-primary" : "text-ensena-muted hover:text-ensena-ink"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
            <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-ensena-border shadow-[0_20px_50px_-25px_rgba(17,24,39,0.35)]">
              <Image src={heroImage} alt="Student learning online with Ensena" fill sizes="(min-width: 1024px) 28rem, 90vw" className="bg-ensena-bg-soft object-cover" priority />
            </div>

            <div className="absolute -left-6 top-10 flex items-center gap-2.5 rounded-2xl border border-ensena-border bg-ensena-surface px-3.5 py-2.5 shadow-lg">
              <div className="relative size-9 shrink-0 overflow-hidden rounded-full">
                <Image src={heroTutor.image} alt={heroTutor.name} fill sizes="36px" className="object-cover" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ensena-ink">{heroTutor.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-ensena-muted">
                  <Star className="size-3 fill-amber-400 text-amber-400" /> {heroRating.rating} ({heroRating.reviews})
                </p>
              </div>
            </div>

            <div className="absolute -right-6 bottom-10 w-52 rounded-2xl border border-ensena-border bg-ensena-surface p-3.5 shadow-lg">
              <p className="text-xs font-semibold text-ensena-ink">Discovery Session with {heroTutor.name.split(" ")[0]}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-ensena-muted"><Calendar className="size-3" /> May 14, 2025 • 2:30 PM</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-ensena-success/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-success">
                <Check className="size-2.5" /> Confirmed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Three ways to start */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
          Three ways to {persona === "Student" ? "start learning" : "start teaching"}
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ways.map((way) => (
            <div key={way.title} className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
              <span className={cn("flex size-12 items-center justify-center rounded-2xl", way.tint)}>
                <way.icon className="size-5.5" />
              </span>
              <div className="mt-4 flex items-center gap-2">
                <p className="font-heading text-lg font-semibold text-ensena-ink">{way.title}</p>
                {"badge" in way && way.badge && (
                  <span className="rounded-full bg-ensena-success/10 px-2 py-0.5 text-[10px] font-semibold text-ensena-success">{way.badge}</span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ensena-muted">{way.description}</p>
              <Link href={way.href} className="mt-4 flex items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline">
                {way.cta} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Your learning journey */}
      <section className="border-y border-ensena-border bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            Your {persona === "Student" ? "learning" : "teaching"} journey on Ensena
          </h2>
          <div className="relative mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {journey.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full",
                    i % 2 === 0 ? "bg-ensena-primary/10 text-ensena-primary" : "bg-[#CBEFFF] text-[#2F9BE0]"
                  )}
                >
                  <step.icon className="size-6" />
                </span>
                <p className="mt-3 text-xs font-semibold text-ensena-muted">{i + 1}</p>
                <p className="text-sm font-semibold text-ensena-ink">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ensena-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Everything you need. All in one place.</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((f) => (
            <div key={f.title} className={cn("rounded-2xl p-6", f.tint)}>
              <f.icon className="size-6" />
              <p className="mt-3 font-semibold text-ensena-ink">{f.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ensena-ink/70">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Finding your tutor */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Find someone who understands how you learn.</h2>
            <p className="mt-3 text-sm text-ensena-muted">Search and filter tutors by:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Subject", "Academic level", "Price", "Availability", "Rating", "Language", "Discovery Session availability"].map((f) => (
                <span key={f} className="rounded-full border border-ensena-border bg-ensena-surface px-3 py-1.5 text-xs font-medium text-ensena-ink">{f}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { title: "Tutor information", desc: "Photo, biography, teaching experience, education, qualifications and languages." },
              { title: "Teaching information", desc: "Subjects, academic levels, teaching style and what students can expect to learn." },
              { title: "Trust information", desc: "Verification status, ratings, reviews, lessons taught and repeat students." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <p className="text-sm font-semibold text-ensena-ink">{c.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ensena-muted">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified tutors */}
      <section className="bg-ensena-bg-soft py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Know who you&apos;re learning from.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ensena-muted">Tutors go through Ensena&apos;s verification process before they can teach on the platform.</p>
          <div className="mt-8">
            <ConnectedSteps items={[...verificationSteps.slice(0, -1), "Approved ✓"]} />
          </div>
        </div>
      </section>

      {/* Discovery Sessions */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <SectionEyebrow>Discovery Sessions</SectionEyebrow>
        <h2 className="mt-2 text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Meet your tutor before committing.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ensena-muted">
          A Discovery Session is a short introductory session designed to help you and your tutor understand whether you&apos;re a good match.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <p className="text-sm font-semibold text-ensena-ink">Before</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {discoverySessionSteps.before.map((s) => (
                <span key={s} className="rounded-full bg-ensena-bg-soft px-2.5 py-1 text-xs font-medium text-ensena-ink">{s}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-ensena-muted">Then pays securely.</p>
          </div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-5">
            <p className="text-sm font-semibold text-ensena-ink">During</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-xs text-ensena-muted">
              {discoverySessionSteps.during.map((s) => (
                <li key={s} className="flex items-start gap-1.5"><Check className="mt-0.5 size-3 shrink-0 text-ensena-success" /> {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-ensena-primary bg-ensena-primary/5 p-5">
            <p className="text-sm font-semibold text-ensena-ink">After</p>
            <div className="mt-3 flex flex-col gap-2">
              {discoverySessionSteps.after.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ensena-primary text-[10px] font-semibold text-white">{i + 1}</span>
                  <p className="text-xs font-medium text-ensena-ink">{s}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-lg text-center text-sm font-medium text-ensena-ink">
          You don&apos;t have to continue with a tutor just because you booked a Discovery Session.
        </p>
      </section>

      {/* Fit decision */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Leave your Discovery Session knowing exactly what to do next.</h2>
              <p className="mt-3 text-sm text-ensena-muted">Every Discovery Session ends with one simple question: is this tutor the right fit for you?</p>
            </div>
            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{discoveryFitMock.subject} Discovery Session</p>
              <p className="mt-2 text-lg font-semibold text-ensena-ink">{discoveryFitMock.question}</p>
              <div className="mt-4 flex flex-col gap-2">
                <span className="rounded-xl border-2 border-ensena-primary bg-ensena-primary/5 px-4 py-3 text-center text-sm font-semibold text-ensena-ink">{discoveryFitMock.yesLabel}</span>
                <span className="rounded-xl border border-ensena-border px-4 py-3 text-center text-sm font-medium text-ensena-ink">{discoveryFitMock.noLabel}</span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-ensena-bg-soft px-4 py-3">
                <span className="text-xs text-ensena-muted">Next step</span>
                <span className="text-sm font-semibold text-ensena-ink">{discoveryFitMock.nextStep}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Private tutoring */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Learn one-on-one, on your schedule.</h2>
        <div className="mt-8"><ConnectedSteps items={privateLessonSteps} /></div>
        <p className="mx-auto mt-5 max-w-lg text-sm text-ensena-muted">Pricing is calculated according to the tutor&apos;s rate and your selected lesson duration and frequency.</p>
      </section>

      {/* Group classes */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Learn together. Pay less per lesson.</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ensena-muted">Students browse scheduled classes rather than choosing their own lesson time.</p>
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {groupClassInfo.map((f) => <span key={f} className="rounded-full bg-ensena-bg-soft px-3 py-1.5 text-center text-xs font-medium text-ensena-ink">{f}</span>)}
            </div>
            <Button nativeButton={false} render={<Link href="/group-classes" />} className="mt-5 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Reserve Your Seat
            </Button>
          </div>
          <p className="mx-auto mt-4 max-w-lg text-center text-xs text-ensena-muted">Group classes are reviewed by Ensena before becoming publicly available.</p>
        </div>
      </section>

      {/* Virtual classroom */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Everything happens inside Ensena.</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-ensena-muted">Instead of sending students to random links, the learning experience stays connected to the booking.</p>
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
          {classroomFeatures.map((f) => (
            <div key={f.label} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
              <f.icon className="size-5 text-ensena-primary" />
              <p className="mt-2 text-sm font-medium text-ensena-ink">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Payments & escrow */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">How payments are protected</h2>
          <p className="mt-2 text-center text-sm text-ensena-muted">We use escrow to keep your payment safe.</p>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {paymentSteps.map((s, i) => (
                <div key={s.title} className="relative rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary"><s.icon className="size-4.5" /></span>
                  <p className="mt-3 text-sm font-semibold text-ensena-ink">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ensena-muted">{s.description}</p>
                  {i < paymentSteps.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-ensena-muted sm:block" />}
                </div>
              ))}
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <Image src={tutorBannerImage} alt="Student learning safely on Ensena" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
            </div>
          </div>

          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-ensena-success/10 px-5 py-4">
            <p className="flex items-center gap-2 text-sm text-ensena-ink"><ShieldCheck className="size-4 shrink-0 text-ensena-success" /> If there&apos;s a problem with your lesson, we&apos;ll help resolve it.</p>
            <Link href="/counsellor" className="text-sm font-semibold text-ensena-primary hover:underline">Learn more about our Safety &amp; Trust →</Link>
          </div>
        </div>
      </section>

      {/* What happens after a lesson */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">What happens after a lesson?</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <p className="text-sm font-semibold text-ensena-ink">Private Lessons</p>
            <div className="mt-4"><ConnectedSteps items={afterLessonStudent} /></div>
          </div>
          <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6">
            <p className="text-sm font-semibold text-ensena-ink">Discovery Sessions</p>
            <div className="mt-4"><ConnectedSteps items={afterLessonDiscovery} /></div>
          </div>
        </div>
      </section>

      {/* Counsellor */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <SectionEyebrow>Speak to a Counsellor</SectionEyebrow>
          <div className="mt-2 flex items-center justify-center gap-2">
            <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Not sure what you need?</h2>
            <span className="rounded-full bg-ensena-success/10 px-2.5 py-1 text-xs font-semibold text-ensena-success">Free Service</span>
          </div>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-ensena-muted">
            Ensena&apos;s counselling service helps students understand their learning needs, choose tutors and decide on appropriate learning options.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {counsellorSteps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-ensena-border bg-ensena-surface p-4">
                <span className="flex size-8 items-center justify-center rounded-full bg-ensena-primary/10 text-xs font-semibold text-ensena-primary">{i + 1}</span>
                <p className="mt-3 text-sm font-semibold text-ensena-ink">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ensena-muted">{s.description}</p>
                {s.icons && (
                  <div className="mt-2 flex gap-1.5">
                    {s.icons.map((Icon, idx) => <span key={idx} className="flex size-7 items-center justify-center rounded-full bg-ensena-bg-soft text-ensena-ink"><Icon className="size-3.5" /></span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button nativeButton={false} render={<Link href="/counsellor" />} className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
              Speak to a Counsellor (Free)
            </Button>
          </div>
        </div>
      </section>

      {/* Student journey timeline */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Your journey on Ensena</h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-4">
          {studentTimeline.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-3.5 py-1.5 text-xs font-medium text-ensena-ink">
                <span className="flex size-5 items-center justify-center rounded-full bg-ensena-primary/10 text-[10px] font-semibold text-ensena-primary">{i + 1}</span>
                {step}
              </span>
              {i < studentTimeline.length - 1 && <ArrowRight className="size-3.5 shrink-0 text-ensena-muted" />}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-lg text-center text-xs text-ensena-muted">Discovery Sessions are optional. Students who already know what they want can book private lessons directly.</p>
      </section>

      {/* Tutor: Teach Inspire Earn */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Teach. Inspire. Earn.</h2>
          <p className="mt-2 text-center text-sm text-ensena-muted">Build your online teaching business on Ensena.</p>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {tutorJourney.map((step, i) => (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><step.icon className="size-5" /></span>
                  <p className="mt-2 text-xs font-semibold text-ensena-muted">{i + 1}</p>
                  <p className="text-sm font-semibold text-ensena-ink">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ensena-muted">{step.description}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-ensena-border bg-ensena-surface p-6 shadow-sm">
              <p className="text-sm font-semibold text-ensena-ink">Transparent Earnings</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-ensena-muted">Student pays</span><span className="font-medium text-ensena-ink">{formatNaira(tutorEarningsExample.studentPays)}</span></div>
                <div className="flex justify-between"><span className="text-ensena-muted">Ensena fee ({tutorEarningsExample.feePct}%)</span><span className="font-medium text-rose-600">−{formatNaira(split.commission)}</span></div>
                <div className="flex justify-between border-t border-ensena-border pt-2 text-base font-semibold"><span className="text-ensena-ink">You earn</span><span className="text-ensena-primary">{formatNaira(split.net)}</span></div>
              </div>
              <p className="mt-4 text-xs text-ensena-muted">You&apos;ll always see your expected net earnings before confirming a booking or class.</p>
              <Button nativeButton={false} render={<Link href="/become-a-tutor" />} className="mt-4 h-11 w-full rounded-full bg-ensena-primary text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
                Become a Tutor
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Built around trust.</h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustCards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-ensena-border bg-ensena-surface p-5 text-center">
              <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary"><c.icon className="size-5" /></span>
              <p className="mt-3 text-sm font-semibold text-ensena-ink">{c.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-ensena-muted">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ensena-bg-soft py-20">
        <div className="mx-auto max-w-[1000px] px-6">
          <h2 className="text-center font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Frequently asked questions</h2>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {faqItems.map((item) => {
              const open = openFaq === item.q;
              return (
                <div key={item.q} className="rounded-xl border border-ensena-border bg-ensena-surface">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : item.q)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-ensena-ink"
                  >
                    {item.q}
                    <ChevronDown className={cn("size-4 shrink-0 text-ensena-muted transition-transform", open && "rotate-180")} />
                  </button>
                  {open && <p className="px-4 pb-3.5 text-sm text-ensena-muted">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Ready to start learning?</h2>
        <p className="mt-2 text-sm text-ensena-muted">Find the right academic support, meet your tutor, and start achieving your goals.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/find-teachers" />} className="h-12 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]">
            Find Your Tutor
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/counsellor" />} className="h-12 rounded-full border-ensena-border px-6 text-sm font-semibold text-ensena-ink">
            Speak to a Counsellor (Free)
          </Button>
        </div>
        <p className="mt-6 text-sm text-ensena-muted">
          Want to teach on Ensena? <Link href="/become-a-tutor" className="font-semibold text-ensena-primary hover:underline">Become a Tutor →</Link>
        </p>
      </section>
    </div>
  );
}
