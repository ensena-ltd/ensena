"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { footerLinkGroups } from "@/lib/data";
import { subscribeToNewsletter, type NewsletterFormState } from "@/lib/actions/newsletter";

const initialNewsletterState: NewsletterFormState = { status: "idle" };

export function Footer() {
  const [newsletterState, newsletterAction, newsletterPending] = useActionState(
    subscribeToNewsletter,
    initialNewsletterState
  );

  return (
    <footer className="border-t border-ensena-border bg-ensena-bg-soft">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ensena-muted">
              Making quality academic support more accessible to every learner.
            </p>
          </div>

          {footerLinkGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-heading text-sm font-semibold text-ensena-ink">
                {group.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-ensena-muted transition-colors hover:text-ensena-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-heading text-sm font-semibold text-ensena-ink">
              Stay in the loop
            </h3>
            <p className="mt-4 text-sm text-ensena-muted">
              Get the latest updates and tips.
            </p>
            {newsletterState.status === "success" || newsletterState.status === "already-subscribed" ? (
              <p className="mt-4 text-sm font-medium text-ensena-ink">{newsletterState.message}</p>
            ) : (
              <form action={newsletterAction} className="mt-4 flex flex-col gap-2" aria-label="Newsletter signup">
                <div className="flex gap-2">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    required
                    placeholder="Enter your email"
                    className="h-10 rounded-full border-ensena-border"
                  />
                  <Button
                    type="submit"
                    disabled={newsletterPending}
                    className="h-10 shrink-0 rounded-full bg-ensena-primary px-5 text-sm font-medium text-white hover:bg-ensena-primary/90 disabled:opacity-60"
                  >
                    {newsletterPending ? "…" : "Subscribe"}
                  </Button>
                </div>
                {newsletterState.status === "error" && newsletterState.message && (
                  <p className="text-xs text-rose-600">{newsletterState.message}</p>
                )}
              </form>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-ensena-border pt-8 text-sm text-ensena-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Ensena. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
