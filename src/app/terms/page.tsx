import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { GroupedLegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-content";
import { termsCategories } from "@/lib/terms-content";

export const metadata: Metadata = {
  title: "Terms of Service | Ensena",
  description: "The rules and guidelines for using Ensena.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Service | Ensena", url: "/terms" },
};

const quickLinks = [
  { label: "Payments", href: "#payments" },
  { label: "Refunds", href: "#cancellations-refunds" },
  { label: "Discovery Sessions", href: "#discovery-sessions" },
  { label: "Tutor Rules", href: "#tutors" },
  { label: "Counselling", href: "#counselling" },
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <div className="border-b border-ensena-border bg-ensena-bg-soft py-14 text-center">
          <h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink">
            Terms of Service
          </h1>
          <p className="mt-3 text-ensena-muted">The rules and guidelines for using Ensena.</p>
        </div>

        <GroupedLegalPageLayout
          title="Terms of Service"
          lastUpdated={LEGAL_LAST_UPDATED}
          intro="This is a working legal draft written to reflect how the Ensena platform actually works today. It is not a substitute for review by a qualified Nigerian lawyer before launch."
          quickLinks={quickLinks}
          categories={termsCategories}
          bottomCta={
            <div className="flex flex-col items-start gap-4 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ensena-primary">
                  <MessageCircleQuestion className="size-4.5" />
                </span>
                <div>
                  <p className="font-heading text-sm font-semibold text-ensena-ink">Questions about these Terms?</p>
                  <p className="mt-1 text-sm text-ensena-muted">
                    If there&apos;s anything you don&apos;t understand about these Terms, contact the Ensena team.
                  </p>
                </div>
              </div>
              <Button
                nativeButton={false}
                render={<Link href="/contact" />}
                className="h-10 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-semibold text-white hover:bg-[var(--ensena-primary-hover)]"
              >
                Contact Support
              </Button>
            </div>
          }
        />
      </main>
      <Footer />
    </div>
  );
}
