"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TechLabel } from "@/components/ui/tech-label";
import { GlassPanel } from "@/components/ui/glass-panel";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

export interface LegalPageProps {
  eyebrow: string;
  title: string;
  effective: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}

/** Shared layout for the /privacy, /terms, /security and /license pages. */
export function LegalPage({
  eyebrow,
  title,
  effective,
  intro,
  sections,
}: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-4"
      >
        <TechLabel color="indigo">{eyebrow}</TechLabel>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-5xl">
          {title}
        </h1>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">
          Effective {effective}
        </p>
        <div className="text-[14px] leading-relaxed text-white/50">{intro}</div>
      </motion.header>

      <GlassPanel tint="indigo" className="p-6 md:p-10">
        <div className="relative space-y-10">
          {sections.map((section, i) => (
            <motion.section
              key={section.id}
              id={section.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-32px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.04,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="space-y-3 border-l border-white/10 pl-5"
            >
              <h2 className="text-xl font-extralight tracking-tight text-white/95">
                {section.title}
              </h2>
              <div className="space-y-3 text-[13px] leading-relaxed text-white/50 [&_a]:text-[#a5aaff]/70 [&_a]:underline-offset-2 hover:[&_a]:underline [&_code]:rounded [&_code]:bg-white/[0.04] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-[#67e8f4]/70 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-normal [&_strong]:text-white/80 [&_ul]:list-disc [&_ul]:pl-5">
                {section.body}
              </div>
            </motion.section>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
