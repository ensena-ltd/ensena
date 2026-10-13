import type { ReactNode } from "react";

export function PublicPageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-ensena-border bg-ensena-bg-soft py-16">
      <div className="mx-auto max-w-[800px] px-4 text-center sm:px-6 lg:px-8">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-ensena-primary">{eyebrow}</p>
        )}
        <h1 className="mt-3 font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-ensena-ink">
          {title}
        </h1>
        {subtitle && <p className="mt-4 text-lg text-ensena-muted">{subtitle}</p>}
        {children && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{children}</div>}
      </div>
    </section>
  );
}
