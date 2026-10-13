"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CounsellorBanner } from "@/components/counsellor-banner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupClassListingCard } from "@/components/group-classes-page/group-class-listing-card";
import { LanguageTutorCard } from "@/components/languages-page/language-tutor-card";
import { groupClassListings } from "@/lib/group-classes-data";
import {
  languageGoals,
  languageHowItWorksSteps,
  languageLevelOptions,
  popularLanguages,
} from "@/lib/languages-data";
import { languageSubjectOptions, tutorListings } from "@/lib/tutors";

const MotionLink = motion.create(Link);

const popularSearches = ["English Conversation", "IELTS", "French for Beginners", "Business English"];

const stepRingColors = ["#1FA971", "#F80248", "#2F9BE0", "#9B6BD6", "#E58A2A"];

const languageTutors = tutorListings.filter((t) => languageSubjectOptions.includes(t.subject));
const languageGroupClasses = groupClassListings.filter((c) => languageSubjectOptions.includes(c.subject));

export function LanguagesClient() {
  const tutorScrollerRef = useRef<HTMLDivElement>(null);
  const classScrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (ref: React.RefObject<HTMLDivElement | null>, direction: 1 | -1) => {
    ref.current?.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-ensena-bg-soft px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink lg:text-5xl">
            Learn a language.{" "}
            <span className="text-ensena-primary">Speak with confidence.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ensena-muted">
            Learn with experienced language tutors through private lessons, free Discovery Sessions and small group classes.
          </p>

          <form
            action="/find-teachers"
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 rounded-3xl border border-ensena-border bg-ensena-surface p-4 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:flex-row sm:items-end sm:p-3"
          >
            <label className="flex flex-1 flex-col gap-1.5 text-left sm:pl-2">
              <span className="text-xs font-medium text-ensena-muted">Language</span>
              <Select name="subject" defaultValue={languageSubjectOptions[0]}>
                <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageSubjectOptions.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-1 flex-col gap-1.5 text-left">
              <span className="text-xs font-medium text-ensena-muted">Your level</span>
              <Select name="level" defaultValue={languageLevelOptions[1]}>
                <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageLevelOptions.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-1 flex-col gap-1.5 text-left">
              <span className="text-xs font-medium text-ensena-muted">Learning goal</span>
              <Select name="goal" defaultValue={languageGoals[0].title}>
                <SelectTrigger className="h-11 w-full rounded-xl border-ensena-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageGoals.map((goal) => (
                    <SelectItem key={goal.title} value={goal.title}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <Button
              type="submit"
              className="h-11 shrink-0 rounded-xl bg-ensena-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90"
            >
              <Search className="size-4" /> Find a Language Tutor
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-ensena-muted">Popular searches:</span>
            {popularSearches.map((term) => (
              <Link
                key={term}
                href={`/find-teachers?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-ensena-border bg-ensena-surface px-3 py-1 font-medium text-ensena-ink hover:bg-ensena-bg-soft"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Languages */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Popular Languages</h2>
            <p className="mt-2 text-ensena-muted">Find a native-speaking tutor for any language.</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {popularLanguages.map((language, i) => (
            <MotionLink
              key={language.name}
              href={`/find-teachers?subject=${encodeURIComponent(language.name)}`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface px-4 py-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="text-3xl transition-transform group-hover:scale-110" aria-hidden="true">
                {language.flag}
              </span>
              <span className="text-sm font-semibold text-ensena-ink">{language.name}</span>
            </MotionLink>
          ))}
        </div>
      </section>

      {/* What do you want to achieve */}
      <section className="bg-ensena-bg-soft py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            What do you want to achieve?
          </h2>
          <p className="mt-2 text-ensena-muted">Choose a goal and we&apos;ll help you find the right fit.</p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {languageGoals.map((goal, i) => {
              const Icon = goal.icon;
              return (
                <motion.a
                  key={goal.title}
                  href="#find-tutors"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-ensena-border bg-ensena-surface px-4 py-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ensena-ink">{goal.title}</span>
                    <span className="text-xs text-ensena-muted">{goal.description}</span>
                  </span>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Find Your Language Tutor */}
      <section id="find-tutors" className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
              Find Your Language Tutor
            </h2>
            <p className="mt-2 text-ensena-muted">Experienced tutors. Flexible schedules. Personalised learning.</p>
          </div>
          <Link
            href="/find-teachers"
            className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
          >
            View all tutors
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="relative mt-8">
          <div
            ref={tutorScrollerRef}
            className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {languageTutors.map((tutor) => (
              <LanguageTutorCard key={tutor.slug} tutor={tutor} />
            ))}
          </div>

          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(tutorScrollerRef, -1)}
            className="absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(tutorScrollerRef, 1)}
            className="absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>

      {/* Popular Group Classes */}
      <section className="bg-ensena-bg-soft py-16">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
                Popular Language Group Classes
              </h2>
              <p className="mt-2 text-ensena-muted">Learn together. Grow faster.</p>
            </div>
            <Link
              href="/group-classes"
              className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
            >
              View all classes
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="relative mt-8">
            <div
              ref={classScrollerRef}
              className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {languageGroupClasses.map((cls) => (
                <div key={cls.slug} className="w-72 shrink-0">
                  <GroupClassListingCard groupClass={cls} />
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(classScrollerRef, -1)}
              className="absolute -left-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(classScrollerRef, 1)}
              className="absolute -right-4 top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-ensena-border bg-ensena-surface text-ensena-ink shadow-md transition-transform hover:scale-105 lg:flex"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Speak to a Counsellor */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <CounsellorBanner />
      </section>

      {/* How Language Learning Works */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center">
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            How Language Learning Works
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {languageHowItWorksSteps.map((step) => (
            <div key={step.step} className="flex flex-col items-center text-center">
              <span
                className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: stepRingColors[step.step - 1] }}
              >
                {step.step}
              </span>
              <h3 className="mt-3 font-heading text-sm font-semibold text-ensena-ink">{step.title}</h3>
              <p className="mt-1 text-xs text-ensena-muted">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Button
            nativeButton={false}
            render={<Link href="/find-teachers" />}
            className="h-12 rounded-full bg-ensena-primary px-8 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Find My Language Tutor
          </Button>
        </div>
      </section>
    </div>
  );
}
