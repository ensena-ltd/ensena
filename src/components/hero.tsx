"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { popularSubjectNames } from "@/components/popular-subjects";
import {
  academicLevelOptions,
  heroImage,
  trustAvatars,
} from "@/lib/data";
import { availabilityOptions } from "@/lib/tutors";

// Small, subtle text-link discovery row — replaces the old large "Popular
// Subjects" card-grid section (removed from desktop; see popular-subjects.tsx)
// with a compact micro-navigation row directly under the search it belongs
// to, rather than a whole separate section further down the page.
function PopularSubjectsInline({ className }: { className?: string }) {
  return (
    <p className={className}>
      <span className="text-ensena-muted">Popular: </span>
      {popularSubjectNames.map((name, i) => (
        <span key={name}>
          <Link href={`/find-teachers?subject=${encodeURIComponent(name)}`} className="text-ensena-ink hover:text-ensena-primary hover:underline">
            {name}
          </Link>
          {i < popularSubjectNames.length - 1 && <span className="text-ensena-muted"> · </span>}
        </span>
      ))}
    </p>
  );
}

// The same shared `heroImage` every other marketing/auth page uses (Find
// Teachers, How It Works, sign-in/up, become-a-tutor) — real alpha
// transparency (verified pixel-by-pixel: background alpha 0, subject alpha
// ~253), so on the homepage specifically the woman sits directly on the
// section's own background with no image card/rectangle behind her.

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ensena-bg-soft pb-5 pt-4 lg:pb-20 lg:pt-16">
      {/* Mobile: the rich hero narrative is replaced by a single prominent search bar — see AcademicLevels for the category row directly below. Desktop keeps the full hero unchanged. Mobile is intentionally its own simpler design, not a stacked copy of the desktop segmented pill — never derive mobile's markup from desktop's. */}
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:hidden">
        <form action="/find-teachers" className="flex items-center gap-3 rounded-full border border-ensena-border bg-ensena-surface px-4 shadow-sm">
          <Search className="size-5 shrink-0 text-ensena-muted" />
          <input
            name="q"
            placeholder="What do you want to learn?"
            aria-label="What do you want to learn?"
            className="h-14 flex-1 border-0 bg-transparent text-base text-ensena-ink outline-none placeholder:text-ensena-muted"
          />
        </form>
      </div>

      <div className="mx-auto hidden max-w-[1280px] px-4 sm:px-6 lg:block lg:px-8">
        <div className="grid grid-cols-[1.1fr_1fr] items-center gap-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="font-heading text-[3.75rem] font-bold leading-[1.08] tracking-tight text-ensena-ink">
              Find the Perfect
              <br />
              Academic Support
              <br />
              for <span className="text-ensena-primary">Every Level</span>
            </h1>

            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-3">
                {trustAvatars.map((src, i) => (
                  <Image
                    key={src}
                    src={src}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 rounded-full border-2 border-white object-cover"
                    style={{ zIndex: trustAvatars.length - i }}
                  />
                ))}
              </div>
              <span className="text-sm text-ensena-muted">
                Trusted by learners across Nigeria
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="relative mx-auto w-full max-w-xl"
          >
            <Image
              src={heroImage}
              alt="Smiling student on a video call with her tutor"
              width={1536}
              height={1024}
              sizes="(min-width: 1024px) 34rem, 90vw"
              className="h-auto w-full object-contain"
              priority
            />
          </motion.div>
        </div>

        {/* Compact, centered, segmented search pill — contained rather than
            edge-to-edge, in the spirit of a compact "one control, several
            segments" search bar (Airbnb's structural idea, not its
            branding): three labelled fields plus the search action,
            separated by hairline dividers inside one rounded surface. */}
        <form
          action="/find-teachers"
          className="relative z-10 mx-auto -mt-2 flex h-16 w-[75%] max-w-[1000px] items-center rounded-[34px] border border-ensena-border bg-ensena-surface pr-1.5 pl-6 shadow-[0_16px_40px_-24px_rgba(17,24,39,0.25)]"
        >
          <label className="flex min-w-0 flex-[1.2] flex-col justify-center gap-0.5 py-2 pr-5">
            <span className="text-[11px] font-semibold text-ensena-ink">What do you need help with?</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Search className="size-3.5 shrink-0 text-ensena-muted" />
              <Input
                name="q"
                placeholder="Search subjects or courses"
                className="h-auto min-w-0 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
              />
            </span>
          </label>

          <span className="h-8 w-px shrink-0 bg-ensena-border" />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-5 py-2">
            <span className="text-[11px] font-semibold text-ensena-ink">Academic level</span>
            <Select name="level">
              <SelectTrigger aria-label="Select level" className="h-auto w-full justify-start gap-1.5 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {academicLevelOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="h-8 w-px shrink-0 bg-ensena-border" />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-5 py-2">
            <span className="text-[11px] font-semibold text-ensena-ink">When?</span>
            <Select name="availability">
              <SelectTrigger aria-label="When" className="h-auto w-full justify-start gap-1.5 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                {availabilityOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="ml-1 h-12 shrink-0 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--ensena-primary-hover)]"
          >
            Search Teachers
          </Button>
        </form>
        <PopularSubjectsInline className="mt-3 px-2 text-sm" />
      </div>
    </section>
  );
}
