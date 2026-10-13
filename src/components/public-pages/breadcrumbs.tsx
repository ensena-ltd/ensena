import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ensena-muted">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-ensena-primary">
              {item.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-medium text-ensena-ink">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
