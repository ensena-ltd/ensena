import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ExamsClient } from "./exams-client";

export const metadata: Metadata = {
  title: "Exam Prep Tutors | Ensena",
  description:
    "Find the right academic support for your exam. Prepare for WAEC, NECO, GCE, JAMB/UTME, Post-UTME, TOEFL, IELTS, Common Entrance, TEF and JUPEB with experienced tutors.",
};

export default function ExamsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ExamsClient />
      </main>
      <Footer />
    </div>
  );
}
