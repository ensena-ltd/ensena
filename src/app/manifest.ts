import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ensena | Find the Perfect Academic Support for Every Learner Level",
    short_name: "Ensena",
    description:
      "Ensena makes quality academic support more accessible to every learner — one-on-one tutoring, group classes and academic guidance across Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f80248",
    icons: [
      { src: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { src: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { src: "/icons/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/android-chrome-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
