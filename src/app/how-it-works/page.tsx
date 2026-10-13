import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Ensena",
  description:
    "Learning that starts with the right support. See how Ensena helps you access the academic support you need — meet a tutor through a Discovery Session, learn online, and get guidance when you need it.",
};

export default function HowItWorksPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <HowItWorksClient />
      </main>
      <Footer />
    </div>
  );
}
