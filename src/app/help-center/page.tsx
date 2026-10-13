import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { PublicHelpCenterClient } from "@/components/support/public-help-center-client";

export const metadata: Metadata = {
  title: "Help Center | Ensena",
};

export default function HelpCenterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <Suspense fallback={null}>
          <PublicHelpCenterClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
