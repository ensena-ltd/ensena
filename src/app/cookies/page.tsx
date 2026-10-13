import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LegalPageLayout } from "@/components/public-pages/legal-page-layout";
import { COOKIE_POLICY_LAST_UPDATED, cookieSections } from "@/lib/cookie-policy-content";

export const metadata: Metadata = {
  title: "Cookie Policy | Ensena",
  description: "How Ensena uses cookies across the platform.",
  alternates: { canonical: "/cookies" },
  openGraph: { title: "Cookie Policy | Ensena", url: "/cookies" },
};

export default function CookiesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <LegalPageLayout
          title="Cookie Policy"
          lastUpdated={COOKIE_POLICY_LAST_UPDATED}
          intro="This page explains the cookies Ensena uses and the information it keeps in your browser. It only lists what Ensena actually uses today, and will be updated as the platform changes."
          sections={cookieSections}
        />
      </main>
      <Footer />
    </div>
  );
}
