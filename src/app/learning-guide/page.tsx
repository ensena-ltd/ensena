import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { LegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { learningGuideSections } from "@/lib/guide-content";

export const metadata: Metadata = {
  title: "Learning Guide | Ensena",
  description: "A guide for students covering finding a tutor, Discovery Sessions, planning lessons and tracking progress.",
  alternates: { canonical: "/learning-guide" },
  openGraph: { title: "Learning Guide | Ensena", url: "/learning-guide" },
};

export default function LearningGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="border-b border-ensena-border bg-ensena-bg-soft py-14 text-center">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink">
            Get more from every lesson.
          </h1>
        </div>

        <LegalPageLayout
          title="Learning Guide"
          sections={learningGuideSections}
          cta={
            <>
              <Button
                nativeButton={false}
                render={<Link href="/find-teachers" />}
                className="h-10 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Find a Tutor
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/group-classes" />}
                className="h-10 rounded-full border-ensena-border px-5 text-sm font-semibold text-ensena-ink"
              >
                Browse Group Classes
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/counsellor" />}
                className="h-10 rounded-full border-ensena-border px-5 text-sm font-semibold text-ensena-ink"
              >
                Speak to a Counsellor
              </Button>
            </>
          }
        />
      </main>
      <Footer />
    </div>
  );
}
