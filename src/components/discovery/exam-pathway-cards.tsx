import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { homepageExams } from "@/lib/exams-data";

// Visual discovery cards for the exam-preparation *pathway* (icon+name,
// linking into /search) — distinct from the "WAEC & JAMB Prep" teacher
// carousel elsewhere on the homepage, and reuses the same card style as the
// dedicated /exams page's "Popular Exams" grid. No mount animation here —
// framer-motion's opacity/transform animation gets stuck at its initial
// state inside an overflow-x-auto horizontal-scroll container on mobile
// (same bug class as the whileInView issue academic-levels.tsx hit
// earlier), so this stays a plain, always-visible list like the other
// compact mobile rows in this app (popular-subjects.tsx, academic-levels.tsx
// mobile pills).
export function ExamPathwayCards() {
  const exams = homepageExams();

  return (
    <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:px-8 lg:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ensena-ink lg:text-3xl">
            Preparing for an Exam?
          </h2>
          <p className="mt-2 text-sm text-ensena-muted lg:text-base">
            Discover a full exam-preparation pathway, from tutors to practice.
          </p>
        </div>
        <Link
          href="/exams"
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
        >
          View all exams
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:mt-8 lg:grid lg:grid-cols-8 lg:gap-6 lg:snap-none lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {exams.map((exam) => (
          <Link
            key={exam.id}
            href={`/search?category=exams&exam=${encodeURIComponent(exam.slug)}`}
            className="group flex w-[112px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface px-3 py-3 text-center transition-all hover:-translate-y-1 hover:shadow-lg lg:w-auto lg:shrink lg:px-4 lg:py-6"
          >
            {/* Icons/illustrations are desktop-only per product spec — mobile
                stays compact and text-focused. */}
            <span className="hidden items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary shadow-sm transition-transform group-hover:scale-110 lg:flex lg:size-12">
              <exam.icon className="size-6" strokeWidth={1.75} />
            </span>
            <span className="text-xs font-semibold text-ensena-ink lg:text-sm">{exam.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
