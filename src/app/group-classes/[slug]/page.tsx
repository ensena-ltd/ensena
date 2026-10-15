import type { Metadata } from "next";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { MobileGroupClassHeader } from "@/components/group-classes-page/mobile-group-class-header";
import { getGroupClassBySlug, type GroupClassListing } from "@/lib/group-classes-data";
import { loadGroupClassBySlug, loadPublishedGroupClasses, similarClasses } from "@/lib/group-classes-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { GroupClassBookingClient } from "./group-class-booking-client";


async function viewerId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const { data } = await (await getSupabaseServerClient()).auth.getUser();
  return data.user?.id ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cls = (isSupabaseConfigured() ? await loadGroupClassBySlug(slug) : null) ?? getGroupClassBySlug(slug);

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
  // Published classes from the database first; the demo catalogue otherwise.
  const live = isSupabaseConfigured() ? await loadGroupClassBySlug(slug, await viewerId()) : null;
  const cls = live ?? getGroupClassBySlug(slug) ?? null;
  let similar: GroupClassListing[] | undefined;
  if (live) similar = similarClasses(await loadPublishedGroupClasses(), live);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="hidden lg:block">
        <Header />
      </div>
      <MobileGroupClassHeader />
      <main className="flex-1">
        <GroupClassBookingClient slug={slug} initialGroupClass={cls} similar={similar} />
      </main>
      <div className="hidden lg:block">
        <Footer />
      </div>
    </div>
  );
}
