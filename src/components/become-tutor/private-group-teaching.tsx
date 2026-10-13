import Image from "next/image";
import { Check, Users2 } from "lucide-react";

import { heroImage } from "@/lib/data";

const privateItems = [
  "Set your availability",
  "Set your teaching rate",
  "Teach online",
  "Use the Ensena classroom",
  "Accept Discovery Sessions",
  "Accept Pre-approval requests",
];

const groupItems = [
  "Create your own group class",
  "Choose your schedule",
  "Set your class capacity",
  "Teach multiple students together",
  "Use the Ensena classroom",
];

export function PrivateGroupTeaching() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="font-heading text-2xl font-semibold text-ensena-ink lg:text-3xl">
          Teach one-on-one. Teach together.
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">Teach one-on-one.</span>
          <h3 className="mt-1 font-heading text-xl font-semibold text-ensena-ink">Private Lessons</h3>
          <p className="mt-2 text-sm text-ensena-muted">Teach students individually at times that work for you.</p>

          <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-ensena-bg-soft">
            <Image src="/teacher-1.jpg.png" alt="Tutor on a private video lesson" fill sizes="600px" className="object-cover" />
          </div>

          <ul className="mt-6 flex flex-col gap-2.5">
            {privateItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-ensena-ink">
                <Check className="size-4 shrink-0 text-ensena-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-ensena-border bg-ensena-surface p-6 sm:p-8">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">Teach together.</span>
              <h3 className="mt-1 font-heading text-xl font-semibold text-ensena-ink">Group Classes</h3>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-ensena-primary/10 px-3 py-1.5 text-xs font-semibold text-ensena-primary">
              <Users2 className="size-3.5" /> Up to 10 students
            </span>
          </div>
          <p className="mt-2 text-sm text-ensena-muted">Bring students together around a subject you know well.</p>

          <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-ensena-bg-soft">
            <Image src={heroImage} alt="Students in a group class" fill sizes="600px" className="object-cover" />
          </div>

          <ul className="mt-6 flex flex-col gap-2.5">
            {groupItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-ensena-ink">
                <Check className="size-4 shrink-0 text-ensena-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
