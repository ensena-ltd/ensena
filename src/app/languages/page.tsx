import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { LanguagesClient } from "./languages-client";

export const metadata: Metadata = {
  title: "Learn a Language | Ensena",
  description:
    "Learn a language with experienced tutors through private lessons, free Discovery Sessions and small group classes. French, Spanish, Arabic, Yoruba, Igbo, Hausa and more.",
};

export default function LanguagesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <LanguagesClient />
      </main>
      <Footer />
    </div>
  );
}
