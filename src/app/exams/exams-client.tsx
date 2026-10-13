"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

import { CounsellorBanner } from "@/components/counsellor-banner";
import { activeExams } from "@/lib/exams-data";

const MotionLink = motion.create(Link);

export function ExamsClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const exams = activeExams();

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return exams.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6);
  }, [exams, query]);

  function goToExam(slug: string) {
    router.push(`/search?category=exams&exam=${encodeURIComponent(slug)}`);
  }

  function submitSearch() {
    const match = exams.find((e) => e.name.toLowerCase() === query.trim().toLowerCase()) ?? suggestions[0];
    if (match) goToExam(match.slug);
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-ensena-bg-soft px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[900px] text-center">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink lg:text-5xl">
            Find the Right Academic Support for{" "}
            <span className="text-ensena-primary">Your Exam</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ensena-muted">
            Prepare with experienced tutors and get the support you need to achieve your goals.
          </p>

          <div className="relative mx-auto mt-8 max-w-2xl">
            <div className="flex items-center gap-3 rounded-3xl border border-ensena-border bg-ensena-surface p-3 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.25)] sm:p-4">
              <Search className="ml-2 size-5 shrink-0 text-ensena-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder="Search for an exam"
                aria-label="Search for an exam"
                className="h-11 flex-1 border-0 bg-transparent text-base text-ensena-ink outline-none placeholder:text-ensena-muted"
              />
              <button
                type="button"
                onClick={submitSearch}
                className="hidden h-11 shrink-0 items-center justify-center rounded-xl bg-ensena-primary px-6 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90 sm:flex"
              >
                Search
              </button>
            </div>

            {focused && suggestions.length > 0 && (
              <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-ensena-border bg-ensena-surface shadow-lg">
                {suggestions.map((exam) => (
                  <button
                    key={exam.id}
                    type="button"
                    onMouseDown={() => goToExam(exam.slug)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-ensena-ink hover:bg-ensena-bg-soft"
                  >
                    <exam.icon className="size-4 text-ensena-primary" />
                    {exam.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Popular Exams */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">Popular Exams</h2>
            <p className="mt-2 text-ensena-muted">Find the academic support that specializes in your exam.</p>
          </div>
        </div>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
          {exams.map((exam, i) => (
            <MotionLink
              key={exam.id}
              href={`/search?category=exams&exam=${encodeURIComponent(exam.slug)}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group flex w-[132px] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-ensena-border bg-ensena-surface px-4 py-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg sm:w-auto sm:shrink"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-ensena-primary/10 text-ensena-primary shadow-sm transition-transform group-hover:scale-110">
                <exam.icon className="size-6" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold text-ensena-ink">{exam.name}</span>
            </MotionLink>
          ))}
        </div>
      </section>

      {/* Speak to a Counsellor */}
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 pb-20">
        <CounsellorBanner />
      </section>
    </div>
  );
}
