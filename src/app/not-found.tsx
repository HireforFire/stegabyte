"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechButton } from "@/components/ui/tech-button";

export default function NotFound() {
  return (
    <div className="relative grid min-h-[60vh] place-items-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md"
      >
        <GlassPanel tint="indigo" className="px-8 py-12 text-center">
          <div className="relative">
            <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-[#a5aaff]/80">
              <Compass className="h-7 w-7" />
            </span>
            <h1 className="text-5xl font-extralight tracking-tight text-white/95">404</h1>
            <p className="mt-3 text-[13px] leading-relaxed text-white/40">
              The page you’re looking for is not part of Stegabyte. Maybe a steganographic
              payload swallowed it.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <TechButton variant="primary" asChild icon={<Home className="h-4 w-4" />}>
                <Link href="/">Home</Link>
              </TechButton>
              <TechButton
                variant="ghost"
                asChild
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                <Link href="/dashboard">Dashboard</Link>
              </TechButton>
            </div>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
