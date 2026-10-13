import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ContentSection({
  id,
  eyebrow,
  title,
  subtitle,
  tinted = false,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-16", tinted && "bg-ensena-bg-soft")}>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        {(eyebrow || title || subtitle) && (
          <div className="mb-8">
            {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{eyebrow}</p>}
            {title && <h2 className="mt-1.5 font-heading text-2xl font-semibold text-ensena-ink">{title}</h2>}
            {subtitle && <p className="mt-2 text-ensena-muted">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
