import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SupportNewPublicClient } from "./support-new-public-client";

export const metadata: Metadata = {
  title: "Contact Support | Ensena",
};

export default function SupportNewPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
          <SupportNewPublicClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
