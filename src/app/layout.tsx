import type { Metadata, Viewport } from "next";
import { MotionConfig } from "framer-motion";
import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { WasmStegoPriming } from "@/components/layout/wasm-stego-priming";
import { Toaster } from "@/components/ui/toaster";
import "./../styles/globals.css";

/**
 * The site origin used as the base for absolute URLs in metadata (Open
 * Graph, Twitter cards, etc.). Falls back to the production domain.
 *
 * In Vercel deployments this resolves correctly because:
 *  - On `stegabyte.app` (production): NEXT_PUBLIC_SITE_URL is set there.
 *  - On preview deployments (`*.vercel.app`): Vercel automatically injects
 *    VERCEL_URL; we promote that to https://VERCEL_URL when present.
 *  - On local dev: hardcoded fallback to stegabyte.app.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "https://stegabyte.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Stegabyte — Encrypted Secrets. Hidden in Plain Sight.",
    template: "%s · Stegabyte",
  },
  description:
    "Stegabyte is a privacy-first steganography platform. Encrypt messages locally and hide them inside PNG images — all in your browser. No plaintext leaves your device.",
  applicationName: "Stegabyte",
  keywords: [
    "steganography",
    "AES-256-GCM",
    "PBKDF2",
    "LSB",
    "privacy",
    "encryption",
    "open source",
    "browser crypto",
  ],
  authors: [{ name: "Stegabyte" }],
  creator: "Stegabyte",
  category: "Security",
  openGraph: {
    title: "Stegabyte — Encrypted Secrets. Hidden in Plain Sight.",
    description:
      "Browser-only steganography & encryption. Hide messages inside PNGs with AES-256-GCM.",
    url: siteUrl,
    siteName: "Stegabyte",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stegabyte",
    description: "Browser-only steganography & encryption.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/*
         * `reducedMotion="user"` makes framer-motion honour the OS
         * `prefers-reduced-motion` setting for every <motion.*> component
         * across the app. The CSS rule in globals.css handles the
         * non-React (Tailwind) transitions; this provider covers the
         * rest.
         */}
        <MotionConfig reducedMotion="user">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-black/80 focus:px-3 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.2em] focus:text-white/80"
          >
            Skip to content
          </a>
          <div className="relative flex min-h-screen">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Navbar />
              <main id="main" className="relative flex-1 pb-24 lg:pb-10">
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
          <WasmStegoPriming />
          <Toaster />
        </MotionConfig>
      </body>
    </html>
  );
}
