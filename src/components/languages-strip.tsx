"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Languages as LanguagesIcon } from "lucide-react";

import { languageSubjectOptions } from "@/lib/tutors";

const MotionLink = motion.create(Link);

const pastelBackgrounds = ["#EEF2FF", "#FDEAEA", "#E9FBF1", "#FFF3E0", "#FDEAFB", "#E9F5FF"];

// Homepage keeps this strip to 6 languages for a clean single row; the
// full catalog (incl. German, Mandarin, Portuguese) lives on /languages.
const homepageLanguages = languageSubjectOptions.slice(0, 6);

export function LanguagesStrip() {
  return (
    <section className="mx-auto hidden max-w-[1240px] px-4 py-20 sm:px-6 lg:block lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
            Learn a New Language
          </h2>
          <p className="mt-2 text-ensena-muted">
            From heritage languages to global ones, find a native-speaking tutor.
          </p>
        </div>
        <Link
          href="/languages"
          className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ensena-primary hover:underline sm:flex"
        >
          View all
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {homepageLanguages.map((language, i) => (
          <MotionLink
            key={language}
            href={`/find-teachers?subject=${encodeURIComponent(language)}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-ensena-border px-4 py-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
            style={{ backgroundColor: pastelBackgrounds[i % pastelBackgrounds.length] }}
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-white/70 text-ensena-ink shadow-sm transition-transform group-hover:scale-110">
              <LanguagesIcon className="size-6" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-semibold text-ensena-ink">{language}</span>
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
