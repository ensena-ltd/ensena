// Cookie Policy content. Lists only what the app actually stores today —
// audited against the code: the only cookies are Supabase's sign-in
// cookies (set by src/proxy.ts and src/lib/supabase/*); everything else is
// browser local/session storage that never leaves the device. There are no
// third-party analytics, advertising or payment scripts. Update the tables
// whenever that changes (e.g. adding a payment provider or analytics tool).
//
// Like the rest of legal-content.ts, this wording has NOT been reviewed by a
// qualified legal professional.
import Link from "next/link";
import type { ReactNode } from "react";

import type { LegalSection } from "@/components/public-pages/legal-page-layout";

export const COOKIE_POLICY_LAST_UPDATED = "28 September 2026";

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ensena-border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-ensena-bg-soft text-xs font-semibold text-ensena-ink">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-ensena-border align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const code = (text: string) => <code className="rounded bg-ensena-bg-soft px-1 py-0.5 text-xs text-ensena-ink">{text}</code>;

export const cookieSections: LegalSection[] = [
  {
    id: "what-cookies-are",
    title: "What Cookies Are",
    content: (
      <p>
        Cookies are small text files a website stores on your device. Websites can also keep information in your browser&apos;s
        &quot;local storage&quot; or &quot;session storage&quot;, which works similarly but is never sent to the website&apos;s servers
        automatically. This policy covers both.
      </p>
    ),
  },
  {
    id: "summary",
    title: "Summary",
    content: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Ensena only sets <strong className="text-ensena-ink">essential cookies</strong>, to keep you signed in.</li>
        <li>Ensena does <strong className="text-ensena-ink">not</strong> use advertising or marketing cookies, and does not use third-party analytics tools.</li>
        <li>Some features remember things in your browser&apos;s storage (for example, tutors you&apos;ve saved). That information stays on your device.</li>
        <li>Because Ensena only uses essential cookies, there&apos;s no cookie banner to accept. If that changes, we&apos;ll ask for your consent first.</li>
      </ul>
    ),
  },
  {
    id: "essential-cookies",
    title: "Essential Cookies",
    content: (
      <>
        <p>
          These cookies are set when you sign in, including with Google, and keep you signed in securely as you move between pages. Ensena
          can&apos;t work without them, so they can&apos;t be switched off. They&apos;re provided by Supabase, Ensena&apos;s authentication provider.
        </p>
        <Table
          head={["Cookie", "Purpose", "Duration"]}
          rows={[
            [
              <>{code("sb-…-auth-token")} (may be split into {code(".0")}, {code(".1")} …)</>,
              "Keeps you signed in and proves to Ensena's servers who you are on each request.",
              "Up to 400 days, or until you log out",
            ],
            [
              code("sb-…-auth-token-code-verifier"),
              "A one-time security code used while you sign in with Google or open an email confirmation link.",
              "Removed once sign-in completes",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "browser-storage",
    title: "Information Kept in Your Browser",
    content: (
      <>
        <p>
          Ensena keeps some information in your browser&apos;s local or session storage so features work smoothly. It isn&apos;t a cookie and
          isn&apos;t sent to Ensena&apos;s servers automatically. It stays on the device and browser you&apos;re using.
        </p>
        <Table
          head={["What", "Why", "How long"]}
          rows={[
            [
              "Anonymous visitor and visit IDs, and pages viewed",
              "Counts page visits so Ensena can see which pages are used. This stays on your device and doesn't identify you.",
              "Visitor ID: until you clear your browser data. Visit ID: until you close the tab.",
            ],
            [
              "Your preferences and activity (for example saved tutors, recently viewed tutors, dismissed notices, and a booking you started before signing in)",
              "Remembers your choices so you don't have to repeat them on each visit.",
              "Until you clear your browser data",
            ],
            [
              "The email address you just signed up with",
              "Shown on the \"Check your inbox\" page and used for \"Resend email\".",
              "Until you close the tab",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "marketing-cookies",
    title: "Analytics and Marketing Cookies",
    content: (
      <p>
        Ensena does not currently use analytics cookies, advertising or marketing cookies, or any third-party tracking tools. If that
        changes, this policy will be updated and we&apos;ll ask for your consent before they&apos;re used.
      </p>
    ),
  },
  {
    id: "third-party-services",
    title: "Third-Party Services",
    content: (
      <>
        <p>
          If you choose &quot;Continue with Google&quot;, you&apos;ll sign in on Google&apos;s own page, which uses Google&apos;s cookies under
          Google&apos;s privacy policy. Ensena doesn&apos;t control or read those cookies.
        </p>
        <p>
          Payment processing isn&apos;t live on Ensena yet. When it is, the payment provider may set its own cookies on its payment pages, and
          this policy will be updated to list them.
        </p>
      </>
    ),
  },
  {
    id: "managing-cookie-preferences",
    title: "Managing Cookies",
    content: (
      <p>
        You can clear or block cookies and site data in your browser settings. Logging out removes Ensena&apos;s sign-in cookies. If you block
        cookies for Ensena, you won&apos;t be able to stay signed in. Clearing site data also clears the information kept in your browser
        described above.
      </p>
    ),
  },
  {
    id: "policy-updates",
    title: "Policy Updates",
    content: (
      <p>
        Ensena may update this Cookie Policy as the platform changes. Changes will be reflected by an updated &quot;Last updated&quot; date on
        this page.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>
        Questions about this policy can be sent through the{" "}
        <Link href="/contact" className="font-medium text-ensena-primary hover:underline">Ensena Contact page</Link>.
      </p>
    ),
  },
];
