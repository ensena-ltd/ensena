import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { AboutClient } from "./about-client";

export const metadata: Metadata = {
  title: "About Ensena | Academic Support Platform",
  description: "Ensena makes quality academic support more accessible to every learner — tutors, group classes and academic guidance. Learn what we do and how it works.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About Ensena | Academic Support Platform", url: "/about" },
};

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <AboutClient />
      </main>
      <Footer />
    </div>
  );
}
