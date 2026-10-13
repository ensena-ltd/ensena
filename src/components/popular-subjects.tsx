"use client";

import Link from "next/link";
import {
  BookOpenText,
  Calculator,
  Cpu,
  FlaskConical,
  Landmark,
  Languages,
  Leaf,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Also the source list for the tiny "Popular subjects" text row under the
// hero search (hero.tsx) — one real list, not two independently-authored
// ones that could drift apart.
export const popularSubjectNames = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "French", "Economics", "Accounting", "Computer Science"];

const popularSubjects: { name: string; icon: LucideIcon; bg: string }[] = [
  { name: "Mathematics", icon: Calculator, bg: "#EEF2FF" },
  { name: "English", icon: BookOpenText, bg: "#E9F5FF" },
  { name: "Physics", icon: FlaskConical, bg: "#F1EEFF" },
  { name: "Chemistry", icon: FlaskConical, bg: "#FFF3E0" },
  { name: "Biology", icon: Leaf, bg: "#E9FBF1" },
  { name: "French", icon: Languages, bg: "#FDEAFB" },
  { name: "Economics", icon: Landmark, bg: "#EAF0FF" },
  { name: "Accounting", icon: Wallet, bg: "#FFF0EE" },
  { name: "Computer Science", icon: Cpu, bg: "#FDEAEA" },
];

// Desktop's large colorful card-grid version of this section has been
// removed (replaced by the small text-link row under the hero search —
// see hero.tsx) — this component is now mobile-only by construction
// (`lg:hidden` on its one remaining block), so it renders nothing on
// desktop without needing any change at the page.tsx call site. The mobile
// chip row itself is untouched — same JSX as before.
export function PopularSubjects() {
  return (
    <section className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 lg:hidden">
      <h2 className="font-heading text-xl font-semibold text-ensena-ink">Popular Subjects</h2>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {popularSubjects.map((subject) => (
          <Link
            key={subject.name}
            href={`/find-teachers?subject=${encodeURIComponent(subject.name)}`}
            className="shrink-0 rounded-full border border-ensena-border bg-ensena-surface px-4 py-2 text-sm font-medium text-ensena-ink"
          >
            {subject.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
