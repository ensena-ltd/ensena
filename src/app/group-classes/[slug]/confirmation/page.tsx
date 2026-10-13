import type { Metadata } from "next";
import { Suspense } from "react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { getGroupClassBySlug, groupClassListings } from "@/lib/group-classes-data";
import { GroupClassConfirmationClient } from "./group-class-confirmation-client";

export function generateStaticParams() {
  return groupClassListings.map((cls) => ({ slug: cls.slug }));
}

export function generateMetadata(): Metadata {
  return { title: "Enrollment Confirmed | Ensena" };
}

// Not gated with notFound() — see the equivalent comment on
// /group-classes/[slug]/page.tsx: a real-submission class only exists in the
// browser's localStorage, invisible to this server render.
export default async function GroupClassConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cls = getGroupClassBySlug(slug) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header logoSize={48} />
      </div>
      <main className="flex-1">
        <Suspense fallback={null}>
          <GroupClassConfirmationClient slug={slug} initialGroupClass={cls} />
        </Suspense>
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
