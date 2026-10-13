import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { BlogClient } from "./blog-client";

export const metadata: Metadata = {
  title: "Blog | Ensena",
  description: "Articles on learning, exams, tutoring and study tips from Ensena.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "Blog | Ensena", url: "/blog" },
};

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <BlogClient />
      </main>
      <Footer />
    </div>
  );
}
