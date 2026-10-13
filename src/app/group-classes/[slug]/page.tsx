import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileGroupClassHeader } from "@/components/group-classes-page/mobile-group-class-header";
import { getGroupClassBySlug, groupClassListings } from "@/lib/group-classes-data";
import { GroupClassBookingClient } from "./group-class-booking-client";

export function generateStaticParams() {
  return groupClassListings.map((cls) => ({ slug: cls.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cls = getGroupClassBySlug(slug);

  if (!cls) return { title: "Group class not found | Ensena" };

  return {
    title: `${cls.title} | Ensena Group Classes`,
    description: cls.description,
  };
}

// Not gated with notFound() here — a class created through the real
// tutor-submission-and-approval flow (group-class-submission-store.ts) only
// exists in the visiting browser's localStorage, which this server render
// can't see. GroupClassBookingClient re-resolves the slug client-side via
// useGroupClassBySlug and renders its own "not found" state if the class
// genuinely doesn't exist anywhere.
export default async function GroupClassDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cls = getGroupClassBySlug(slug) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header />
      </div>
      <MobileGroupClassHeader />
      <main className="flex-1">
        <GroupClassBookingClient slug={slug} initialGroupClass={cls} />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
