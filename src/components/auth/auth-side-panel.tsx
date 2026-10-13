import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/logo";

export interface AuthSidePanelBullet {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function AuthSidePanel({
  title,
  subtitle,
  bullets,
}: {
  title: React.ReactNode;
  subtitle: string;
  bullets: AuthSidePanelBullet[];
}) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-ensena-bg-soft px-12 py-14 lg:flex">
      <div>
        <Link href="/" aria-label="Ensena home">
          {/* Matches the landing page header's own logo size (Header's logoSize=48 prop) — the landing page is the source of truth for brand-mark size everywhere in the auth/onboarding flow. */}
          <Logo size={48} />
        </Link>

        <h1 className="mt-10 font-heading text-4xl font-semibold leading-tight text-ensena-ink">{title}</h1>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-ensena-muted">{subtitle}</p>

        <div className="mt-8 flex flex-col gap-5">
          {bullets.map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ensena-primary/10 text-ensena-primary">
                <b.icon className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ensena-ink">{b.title}</p>
                <p className="text-xs text-ensena-muted">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-ensena-muted">© {new Date().getFullYear()} Ensena. Making quality academic support more accessible to every learner.</p>
    </div>
  );
}
