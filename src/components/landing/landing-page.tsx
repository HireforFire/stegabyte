"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, ScanLine, Github, ShieldCheck, Code2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechLabel } from "@/components/ui/tech-label";
import { TechButton } from "@/components/ui/tech-button";
import { cn } from "@/lib/utils";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function LandingPage() {
  return (
    <div className="relative">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[78vh] flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-16 text-center sm:px-6 lg:px-8 lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="relative z-10 mx-auto max-w-3xl space-y-7"
        >
          <TechLabel color="indigo" withLine={false}>
            Steganography · v1.0
          </TechLabel>

          <h1 className="text-[clamp(2rem,8vw,4.75rem)] font-extralight leading-[1.05] tracking-tight">
            <span className="glow-text block text-white/95">Encrypted Secrets.</span>
            <span className="glow-text-indigo block text-[#a5aaff]/80">
              Hidden in Plain Sight.
            </span>
          </h1>

          <p className="mx-auto max-w-md text-base leading-relaxed text-white/40">
            Hide messages inside PNG images with AES-256-GCM. Everything runs locally — no
            server, no upload, no plaintext ever leaves your browser.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="primary" size="lg" asChild>
              <Link href="/encrypt" className="gap-2">
                <Lock className="h-4 w-4" />
                Start
                <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/about" className="gap-2">
                <Code2 className="h-4 w-4" />
                How it works
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Three truths ──────────────────────────────────── */}
      <section className="relative mx-auto max-w-5xl px-5 py-12 sm:px-6 lg:px-8 lg:py-20">
        <div className="border-white/8 bg-white/8 grid gap-px overflow-hidden rounded-md border md:grid-cols-3">
          <Truth
            icon={ShieldCheck}
            label="Zero-knowledge"
            body="Plaintext and password never leave your device. AES-256-GCM, PBKDF2-SHA512, no telemetry."
          />
          <Truth
            icon={Lock}
            label="Lossless by design"
            body="PNG carriers preserve LSB bits through recompression. JPEG is rejected — by design."
          />
          <Truth
            icon={Github}
            label="Open source"
            body="MIT-licensed. Auditable. Self-hostable. Sub-1000 lines of cryptographic code."
          />
        </div>
      </section>

      {/* ── Single CTA ────────────────────────────────────── */}
      <section className="relative mx-auto max-w-3xl px-5 pb-24 pt-8 text-center sm:px-6 lg:px-8">
        <GlassPanel tint="indigo" glow="none" className="px-6 py-10 sm:px-10 sm:py-12">
          <TechLabel color="indigo" withLine={false}>
            Try it
          </TechLabel>
          <p className="mt-5 text-2xl font-extralight tracking-tight text-white/95 md:text-3xl">
            Ready to hide secrets in plain sight?
          </p>
          <p className="mt-3 text-base leading-relaxed text-white/40">
            Encrypt, embed, send. Only the recipient with the password can recover it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <TechButton variant="primary" asChild icon={<Lock className="h-4 w-4" />}>
              <Link href="/encrypt">Encrypt</Link>
            </TechButton>
            <TechButton variant="cyan" asChild icon={<ScanLine className="h-4 w-4" />}>
              <Link href="/analyze">Analyze</Link>
            </TechButton>
          </div>
        </GlassPanel>
      </section>

      <footer className="border-t border-white/[0.06] bg-black/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-[10px] uppercase tracking-[0.2em] text-white/30 sm:flex-row lg:px-8">
          <span>Stegabyte v1.0 · MIT licensed</span>
          <div className="flex items-center gap-4">
            <Link href="/about" className="hover:text-white/60">
              About
            </Link>
            <Link href="/security" className="hover:text-white/60">
              Security
            </Link>
            <Link href="/privacy" className="hover:text-white/60">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white/60">
              Terms
            </Link>
            <Link href="/license" className="hover:text-white/60">
              License
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Single-cell "truth" — quiet, no panel chrome, just a hairline divider. */
function Truth({
  icon: Icon,
  label,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-black/60 p-6 text-left backdrop-blur-xl",
        "md:p-8",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-[#a5aaff]" />
        <span className="text-xs font-normal uppercase tracking-[0.2em] text-white/50">
          {label}
        </span>
      </div>
      <p className="text-base leading-relaxed text-white/70">{body}</p>
    </div>
  );
}
