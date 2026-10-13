import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function HelpCategoryCard({
  icon: Icon,
  title,
  description,
  href,
  articleCount,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  articleCount?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-2xl border border-ensena-border bg-ensena-surface p-5 transition-colors hover:border-ensena-primary/40 hover:bg-ensena-bg-soft"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ensena-bg-soft text-ensena-primary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold text-ensena-ink">{title}</p>
        <p className="mt-1 text-sm text-ensena-muted">{description}</p>
        {typeof articleCount === "number" && (
          <p className="mt-2 text-xs text-ensena-muted">{articleCount} article{articleCount === 1 ? "" : "s"}</p>
        )}
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-ensena-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
