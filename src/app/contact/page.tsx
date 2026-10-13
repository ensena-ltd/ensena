import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ContactClient } from "./contact-client";

export const metadata: Metadata = {
  title: "Contact Ensena | Get in Touch",
  description: "Reach the Ensena team for student support, tutor support, payments, partnerships or general enquiries.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact Ensena | Get in Touch", url: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ContactClient />
      </main>
      <Footer />
    </div>
  );
}
