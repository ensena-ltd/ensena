"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Grid2x2 } from "lucide-react";

import { academicLevels } from "@/lib/data";

const MotionLink = motion.create(Link);

// Undergraduate/Masters/PhD get the guided faculty->department->level->course
// (or service->field->research-area) browsing flow; Language and Exams each
// have their own dedicated category page; every other level keeps linking
// straight into the existing find-teachers results page unchanged.
const browseFlowLevels = new Set(["Undergraduate", "Masters", "PhD"]);
const dedicatedCategoryPages: Record<string, string> = {
  Language: "/languages",
  Exams: "/exams",
};

function hrefForLevel(label: string): string {
  if (dedicatedCategoryPages[label]) return dedicatedCategoryPages[label];
  return browseFlowLevels.has(label)
    ? `/find-teachers/browse?level=${encodeURIComponent(label)}`
    : `/find-teachers?level=${encodeURIComponent(label)}`;
}

export function AcademicLevels() {
  return (
    <section id="teachers" className="mx-auto max-w-[1240px] py-4 lg:py-20">
      {/* Mobile: compact "All + category" pill row, no section heading — matches the app-style discovery feed. Desktop keeps the full card grid below unchanged. */}
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        <Link
          href="/find-teachers"
          className="flex shrink-0 snap-start items-center gap-1.5 rounded-full bg-ensena-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Grid2x2 className="size-3.5" /> All
        </Link>
        {academicLevels.map((level) => {
          const Icon = level.icon;
          return (
            <Link
              key={level.label}
              href={hrefForLevel(level.label)}
              className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-ensena-border bg-ensena-surface px-4 py-2.5 text-sm font-medium text-ensena-ink"
            >
              <Icon className="size-3.5 text-ensena-primary" strokeWidth={2} />
              {level.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden px-4 sm:px-6 lg:block lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
              Browse by Academic Level
            </h2>
            <p className="mt-2 text-ensena-muted">
              Find the right academic support for every stage of learning.
            </p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-8 gap-6">
          {academicLevels.map((level, i) => {
            const Icon = level.icon;
            return (
              <MotionLink
                key={level.label}
                href={hrefForLevel(level.label)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-ensena-border px-4 py-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ backgroundColor: level.bg }}
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/70 text-ensena-ink shadow-sm transition-transform group-hover:scale-110">
                  <Icon className="size-6" strokeWidth={1.75} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ensena-ink">
                    {level.label}
                  </span>
                  <span className="text-xs text-ensena-muted">{level.sub}</span>
                </span>
              </MotionLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
