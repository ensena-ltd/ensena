import type { ReactNode } from "react";
import Image from "next/image";

import { Breadcrumbs, type BreadcrumbItem } from "@/components/public-pages/breadcrumbs";

export function ArticleLayout({
  breadcrumbs,
  category,
  title,
  dateLabel,
  image,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  category?: string;
  title: string;
  dateLabel?: string;
  image?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-5">
        {category && (
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{category}</p>
        )}
        <h1 className="mt-2 font-heading text-3xl font-semibold leading-tight text-ensena-ink">{title}</h1>
        {dateLabel && <p className="mt-3 text-sm text-ensena-muted">{dateLabel}</p>}
      </div>

      {image && (
        <div className="relative mt-7 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-ensena-border">
          <Image src={image} alt="" fill sizes="760px" className="object-cover" />
        </div>
      )}

      <div className="prose-ensena mt-8 flex flex-col gap-4 text-[15px] leading-relaxed text-ensena-ink">
        {children}
      </div>
    </article>
  );
}
