"use client";

import Link from "next/link";
import {
  Lock,
  Unlock,
  ScanLine,
  Activity,
  ArrowRight,
  Cpu,
  Code2,
  Zap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { GlassPanel } from "@/components/ui/glass-panel";
import { TechLabel } from "@/components/ui/tech-label";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const actions = [
  {
    href: "/encrypt",
    icon: Lock,
    title: "Encrypt a Message",
    description: "Hide ciphertext inside a PNG image with AES-256-GCM.",
    badge: "Create",
    color: "indigo" as const,
  },
  {
    href: "/extract",
    icon: Unlock,
    title: "Recover a Message",
    description: "Extract and decrypt a hidden message from a PNG.",
    badge: "Restore",
    color: "cyan" as const,
  },
  {
    href: "/analyze",
    icon: ScanLine,
    title: "Analyze an Image",
    description: "Inspect entropy, histogram, and LSB suspicion.",
    badge: "Inspect",
    color: "cyan" as const,
  },
];

const stats = [
  { label: "Algorithm", value: "AES-256-GCM" },
  { label: "Key Derivation", value: "PBKDF2-SHA512" },
  { label: "Iterations", value: "600 000" },
  { label: "Salt Size", value: "32 bytes" },
  { label: "IV Size", value: "12 bytes" },
  { label: "Stego Format", value: "PNG LSB" },
];

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-3"
      >
        <TechLabel color="indigo">Workspace</TechLabel>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-4xl">
          Welcome to Stegabyte
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/40">
          A privacy-first steganography platform. All cryptographic operations execute
          locally in your browser.
        </p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {actions.map((action, i) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05 + i * 0.06,
              duration: 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <Link href={action.href} className="group block h-full">
              <GlassPanel tint={action.color} className="h-full p-6 md:p-8">
                <div className="relative">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-[#a5aaff]">
                      <action.icon className="h-5 w-5" />
                    </span>
                    <Badge variant={action.color === "indigo" ? "indigo" : "cyan"}>
                      {action.badge}
                    </Badge>
                  </div>
                  <h3 className="mb-2 text-base font-extralight tracking-tight text-white/90">
                    {action.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/40">
                    {action.description}
                  </p>
                  <p className="mt-5 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white/80">
                    Continue
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </GlassPanel>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Crypto Profile</CardTitle>
              <Activity className="h-5 w-5 text-[#67e8f4]/70" />
            </div>
            <CardDescription>
              Current cryptographic configuration. All values are immutable and based on
              NIST-recommended primitives.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-5 md:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {s.label}
                </p>
                <p className="font-mono text-sm text-white/90">{s.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: Cpu,
            title: "WASM-ready",
            description: "Drop in a WebAssembly module to accelerate the pipeline.",
          },
          {
            icon: Zap,
            title: "Off-thread",
            description: "Heavy work runs in Web Workers for 60 fps UI.",
          },
          {
            icon: Code2,
            title: "Open architecture",
            description: "Hook points for BMP, WAV, PDF, and QR plugins.",
          },
        ].map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <feature.icon className="mb-3 h-5 w-5 text-[#67e8f4]/70" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
