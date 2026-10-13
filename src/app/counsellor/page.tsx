import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { CounsellorClient } from "./counsellor-client";

export const metadata: Metadata = {
  title: "Speak to a Counsellor | Ensena",
  description:
    "Not sure what to do with your education? Talk to Benny, Ensena's academic counsellor, and figure out what to do next.",
};

export default function CounsellorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense>
          <CounsellorClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
