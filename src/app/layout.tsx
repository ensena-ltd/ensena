import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";

import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { BennyChat } from "@/components/support/benny-chat";
import { IdleSessionGuard } from "@/components/shared/idle-session-guard";
import { RouteProgressBar } from "@/components/shared/route-progress-bar";
import { ThemeSync } from "@/components/shared/theme-sync";
import { themeInitScript } from "@/lib/theme";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ensena.co"),
  title: "Ensena | Find the Perfect Academic Support for Every Learner Level",
  description:
    "Ensena makes quality academic support more accessible to every learner — one-on-one tutoring, group classes and academic guidance across Nigeria. Learn at your own pace, on your own schedule.",
  keywords: [
    "Nigeria",
    "academic support",
    "tutoring",
    "teachers",
    "education",
    "WAEC",
    "JAMB",
    "online learning",
  ],
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  openGraph: {
    title: "Ensena | Find the Perfect Academic Support for Every Learner Level",
    description:
      "Ensena makes quality academic support more accessible to every learner — one-on-one tutoring, group classes and academic guidance across Nigeria.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Ensena" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ensena | Find the Perfect Academic Support for Every Learner Level",
    description:
      "Ensena makes quality academic support more accessible to every learner — one-on-one tutoring, group classes and academic guidance across Nigeria.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} scroll-smooth`}
      // The theme script below may add `dark` before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-white font-sans text-ensena-ink antialiased">
        <ThemeSync />
        <RouteProgressBar />
        <PageViewTracker />
        {children}
        <BennyChat />
        <IdleSessionGuard />
        <Toaster />
      </body>
    </html>
  );
}
