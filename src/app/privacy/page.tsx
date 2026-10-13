import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { LEGAL_LAST_UPDATED, privacySections } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy | Ensena",
  description: "How Ensena collects, uses and protects your information.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy Policy | Ensena", url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <LegalPageLayout
          title="Privacy Policy"
          lastUpdated={LEGAL_LAST_UPDATED}
          intro="This page explains what information Ensena collects and how it's used, reflecting the data Ensena's platform actually collects today. It is intended for review by a qualified legal professional before being treated as final."
          sections={privacySections}
        />
      </main>
      <Footer />
    </div>
  );
}
