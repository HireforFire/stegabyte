"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Lock,
  Hash,
  KeyRound,
  Layers,
  EyeOff,
  Cpu,
  ShieldCheck,
  BookKey,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TechButton } from "@/components/ui/tech-button";
import { Badge } from "@/components/ui/badge";

const flow = [
  {
    icon: KeyRound,
    title: "1. Derive a key",
    description:
      "Your password is stretched with PBKDF2-SHA512 (600,000 iterations) and a per-image random 32-byte salt.",
  },
  {
    icon: Lock,
    title: "2. Encrypt locally",
    description:
      "The plaintext is encrypted using AES-256-GCM with a fresh 12-byte IV. The IV, salt, and ciphertext are bundled.",
  },
  {
    icon: Hash,
    title: "3. Add a CRYX header",
    description:
      "A 14-byte header encodes the magic number, format version, and payload length.",
  },
  {
    icon: EyeOff,
    title: "4. Embed via LSB",
    description:
      "Each payload byte is split into 8 bits and written to the least-significant bits of the R, G, and B channels.",
  },
  {
    icon: Layers,
    title: "5. Re-encode the PNG",
    description:
      "The modified pixels are rendered back through a Canvas, producing a fresh PNG that is visually identical.",
  },
];

const security = [
  {
    icon: ShieldCheck,
    title: "No plaintext leaves the browser",
    description:
      "All encryption and steganography happens in your browser tab. There is no network call involving your message.",
  },
  {
    icon: Cpu,
    title: "Web Crypto API",
    description:
      "We use the platform-native SubtleCrypto. No third-party crypto libraries are loaded.",
  },
  {
    icon: KeyRound,
    title: "Per-image salts",
    description:
      "Two images encrypted with the same password and same message produce unrelated ciphertexts.",
  },
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-4 text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <Badge variant="indigo">
            <BookKey className="h-3 w-3" /> Documentation
          </Badge>
        </div>
        <h1 className="text-3xl font-extralight tracking-tight text-white/90 md:text-5xl">
          How Stegabyte Works
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/40 md:text-base">
          Stegabyte combines industry-standard cryptography with a simple LSB
          steganographic encoding to hide messages inside PNG images. The entire pipeline
          runs in your browser.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Encryption Pipeline</CardTitle>
            <Badge variant="cyan">5 steps</Badge>
          </div>
          <CardDescription>From your keyboard to a PNG, in five steps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flow.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: i * 0.05,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="border-white/8 flex items-start gap-4 rounded-md border bg-white/[0.02] p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-[#67e8f4]/80">
                <step.icon className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-normal text-white/90">{step.title}</p>
                <p className="text-sm leading-relaxed text-white/40">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Guarantees</CardTitle>
          <CardDescription>
            What we promise. We make no claims about what we cannot see.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {security.map((s) => (
            <div
              key={s.title}
              className="border-white/8 rounded-md border bg-white/[0.02] p-4"
            >
              <s.icon className="mb-2 h-4 w-4 text-[#a5aaff]/70" />
              <p className="text-sm font-normal text-white/90">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/40">
                {s.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <Faq
            q="Is my data ever sent to a server?"
            a="No. Stegabyte has no backend; your browser does all the work. The production CSP forbids any external network calls from the encryption pages."
          />
          <Faq
            q="Why is LSB steganography used?"
            a="It is simple, robust against recompression loss (lossless PNG), and supports a high-capacity payload. Future versions will add BMP, WAV, and PDF carriers."
          />
          <Faq
            q="What happens if I lose my password?"
            a="The encrypted payload is unrecoverable. PBKDF2 makes brute-force impractical, so a forgotten password means a lost message. Store it carefully."
          />
          <Faq
            q="Can the embedded image be detected?"
            a="A trained detector can find LSB anomalies in any image. Stegabyte adds entropy analysis so you can see what an analyst would see."
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3 pb-6">
        <TechButton variant="primary" asChild icon={<Lock className="h-4 w-4" />}>
          <Link href="/encrypt">Try it now</Link>
        </TechButton>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="space-y-1 border-l border-white/15 pl-4">
      <p className="font-normal text-white/90">{q}</p>
      <p className="text-sm leading-relaxed text-white/40">{a}</p>
    </div>
  );
}
