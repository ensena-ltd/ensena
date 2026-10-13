"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, PlayCircle, Wallet2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { tutorBannerImage } from "@/lib/data";

const bullets = [
  { icon: Calendar, title: "Your schedule", desc: "You choose when to teach" },
  { icon: Wallet2, title: "Your rate", desc: "You set your teaching price" },
  { icon: PlayCircle, title: "Your growth", desc: "Build your reputation and your income" },
];

export function TutorHero() {
  return (
    <section className="overflow-hidden bg-white pb-20 pt-16 lg:pt-20">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-16 px-4 sm:px-6 lg:px-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink lg:text-[3.25rem]">
            Turn What You Know Into{" "}
            <span className="text-ensena-primary">Something More.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ensena-muted">
            Teach students. Build your reputation. Grow your teaching business.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              nativeButton={false}
              className="h-12 rounded-full bg-ensena-primary px-7 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-ensena-primary/90"
              render={<Link href="/sign-up/tutor" />}
            >
              Become a Tutor
            </Button>
            <Button
              variant="ghost"
              nativeButton={false}
              className="h-12 rounded-full px-6 text-sm font-semibold text-ensena-ink hover:bg-ensena-bg-soft"
              render={<Link href="/how-it-works" />}
            >
              <PlayCircle className="size-4.5" /> See How It Works
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {bullets.map((b) => (
              <div key={b.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                  <b.icon className="size-4.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ensena-ink">{b.title}</p>
                  <p className="text-xs leading-relaxed text-ensena-muted">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto w-full max-w-md lg:max-w-lg"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-ensena-border shadow-[0_30px_80px_-30px_rgba(17,24,39,0.35)]">
            <Image
              src={tutorBannerImage}
              alt="A tutor checking her lessons on her phone"
              fill
              sizes="(min-width: 1024px) 32rem, 90vw"
              className="object-cover"
              priority
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="absolute -bottom-6 -right-4 w-64 rounded-2xl border border-ensena-border bg-ensena-surface p-4 shadow-xl sm:w-72"
          >
            <p className="text-xs font-semibold text-ensena-ink">Welcome back, Ada! 👋</p>
            <p className="text-[11px] text-ensena-muted">Here&apos;s what&apos;s happening today.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-semibold text-ensena-ink">₦184,500</p>
                <p className="text-[10px] text-ensena-muted">Earnings</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">12</p>
                <p className="text-[10px] text-ensena-muted">Lessons</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">7</p>
                <p className="text-[10px] text-ensena-muted">Requests</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
