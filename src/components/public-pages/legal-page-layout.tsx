import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

function TocList({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className="flex gap-2 rounded-lg px-2.5 py-1.5 text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
          >
            <span className="shrink-0 tabular-nums">{i + 1}.</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

// --- Grouped variant: for longer documents where clauses are organized
// under human-readable categories (e.g. Terms of Service), rather than one
// TOC entry per clause. ---

export interface LegalClause {
  id: string;
  number: number;
  title: string;
  content: ReactNode;
}

export interface LegalCategory {
  id: string;
  title: string;
  clauses: LegalClause[];
  /** Optional callout/diagram rendered after this category's clauses. */
  after?: ReactNode;
}

function GroupedTocList({ categories }: { categories: LegalCategory[] }) {
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {categories.map((category) => (
        <li key={category.id}>
          <a
            href={`#${category.id}`}
            className="block rounded-lg px-2.5 py-1.5 text-ensena-muted hover:bg-ensena-bg-soft hover:text-ensena-ink"
          >
            {category.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function GroupedLegalPageLayout({
  title,
  lastUpdated,
  intro,
  quickLinks,
  categories,
  bottomCta,
}: {
  title: string;
  lastUpdated?: string;
  intro?: string;
  quickLinks?: { label: string; href: string }[];
  categories: LegalCategory[];
  bottomCta?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-ensena-ink">{title}</h1>
      {lastUpdated && <p className="mt-2 text-sm text-ensena-muted">Last updated: {lastUpdated}</p>}
      {intro && <p className="mt-4 max-w-[720px] text-ensena-muted">{intro}</p>}

      {quickLinks && quickLinks.length > 0 && (
        <div className="mt-6 rounded-2xl border border-ensena-border bg-ensena-bg-soft p-4">
          <p className="text-xs font-semibold text-ensena-ink">Looking for something specific?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border border-ensena-border bg-ensena-surface px-3.5 py-1.5 text-xs font-medium text-ensena-ink hover:border-ensena-primary/40 hover:text-ensena-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Mobile table of contents — collapsed by default */}
      <details className="mt-6 rounded-xl border border-ensena-border lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ensena-ink">
          Jump to section
        </summary>
        <div className="border-t border-ensena-border px-2 py-2">
          <GroupedTocList categories={categories} />
        </div>
      </details>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wide text-ensena-muted">On this page</p>
            <div className="mt-2">
              <GroupedTocList categories={categories} />
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex flex-col gap-12">
          {categories.map((category) => (
            <div key={category.id} id={category.id} className="scroll-mt-24 flex flex-col gap-8">
              <h2 className="font-heading text-xl font-semibold text-ensena-ink">{category.title}</h2>
              {category.clauses.map((clause) => (
                <section key={clause.id} id={clause.id} className="scroll-mt-24">
                  <h3 className="font-heading text-base font-semibold text-ensena-ink">
                    {clause.number}. {clause.title}
                  </h3>
                  <div className="mt-2 flex max-w-[760px] flex-col gap-2.5 text-sm leading-relaxed text-ensena-muted">
                    {clause.content}
                  </div>
                </section>
              ))}
              {category.after}
            </div>
          ))}
        </div>
      </div>

      {bottomCta && <div className="mt-14">{bottomCta}</div>}
    </div>
  );
}

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  sections,
  cta,
}: {
  title: string;
  lastUpdated?: string;
  intro?: string;
  sections: LegalSection[];
  cta?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-semibold text-ensena-ink">{title}</h1>
      {lastUpdated && <p className="mt-2 text-sm text-ensena-muted">Last updated: {lastUpdated}</p>}
      {intro && <p className="mt-4 max-w-[720px] text-ensena-muted">{intro}</p>}
      {cta && <div className="mt-5 flex flex-wrap gap-3">{cta}</div>}

      {/* Mobile table of contents — collapsed by default */}
      <details className="mt-6 rounded-xl border border-ensena-border lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ensena-ink">
          Table of contents
        </summary>
        <div className="border-t border-ensena-border px-2 py-2">
          <TocList sections={sections} />
        </div>
      </details>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="px-2.5 text-xs font-semibold uppercase tracking-wide text-ensena-muted">On this page</p>
            <div className="mt-2">
              <TocList sections={sections} />
            </div>
          </div>
        </nav>

        <div className="min-w-0 flex flex-col gap-10">
          {sections.map((section, i) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-heading text-lg font-semibold text-ensena-ink">
                {i + 1}. {section.title}
              </h2>
              <div className="mt-2.5 flex max-w-[760px] flex-col gap-2.5 text-sm leading-relaxed text-ensena-muted">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
