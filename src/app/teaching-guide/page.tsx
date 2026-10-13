import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { LegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { teachingGuideSections } from "@/lib/guide-content";

export const metadata: Metadata = {
  title: "Teaching Guide | Ensena",
  description: "A guide for tutors covering profiles, availability, rates, Discovery Sessions, Group Classes, Pre-approvals and earnings.",
  alternates: { canonical: "/teaching-guide" },
  openGraph: { title: "Teaching Guide | Ensena", url: "/teaching-guide" },
};

export default function TeachingGuidePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="border-b border-ensena-border bg-ensena-bg-soft py-14 text-center">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink">
            Teach successfully on Ensena.
          </h1>
        </div>

        <LegalPageLayout title="Teaching Guide" sections={teachingGuideSections} />

        <section className="border-t border-ensena-border bg-ensena-bg-soft py-16 text-center">
          <h2 className="font-heading text-xl font-semibold text-ensena-ink">Ready to teach?</h2>
          <Button
            nativeButton={false}
            render={<Link href="/become-a-tutor" />}
            className="mt-5 h-11 rounded-full bg-ensena-primary px-6 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
          >
            Become a Tutor
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
}
