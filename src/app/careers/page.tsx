import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CareersClient } from "./careers-client";

export const metadata: Metadata = {
  title: "Careers | Ensena",
  description: "Help Ensena build a better way to learn. See our open roles and how we work.",
  alternates: { canonical: "/careers" },
  openGraph: { title: "Careers | Ensena", url: "/careers" },
};

export default function CareersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CareersClient />
      </main>
      <Footer />
    </div>
  );
}
