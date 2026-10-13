import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HelpCenterClient } from "./help-center-client";

export const metadata: Metadata = {
  title: "Ensena Help Center",
  description: "Find answers about tutors, Discovery Sessions, bookings, payments and more.",
  alternates: { canonical: "/help" },
  openGraph: { title: "Ensena Help Center", url: "/help" },
};

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <HelpCenterClient />
      </main>
      <Footer />
    </div>
  );
}
