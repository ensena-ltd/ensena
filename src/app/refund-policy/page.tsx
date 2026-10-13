import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { LEGAL_LAST_UPDATED, refundPolicySections } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy | Ensena",
  description: "How cancellations and refunds work for lessons, Discovery Sessions and Group Classes on Ensena.",
  alternates: { canonical: "/refund-policy" },
  openGraph: { title: "Cancellation & Refund Policy | Ensena", url: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <LegalPageLayout
          title="Cancellation & Refund Policy"
          lastUpdated={LEGAL_LAST_UPDATED}
          intro="This page explains how cancellations and refunds work across Ensena. It is intended for review by a qualified legal professional before being treated as final, particularly against Nigeria's Federal Competition and Consumer Protection Act."
          sections={refundPolicySections}
        />
      </main>
      <Footer />
    </div>
  );
}
