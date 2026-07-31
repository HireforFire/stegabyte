"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Tier {
  label: string;
  threshold: number;
  tone: string;
}

const TIERS: readonly Tier[] = [
  { label: "Too weak", threshold: 24, tone: "text-[#fca5a5]" },
  { label: "Weak", threshold: 48, tone: "text-[#fca5a5]" },
  { label: "Reasonable", threshold: 72, tone: "text-amber-300" },
  { label: "Strong", threshold: 100, tone: "text-emerald-300" },
] as const;

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const score = React.useMemo(() => computeScore(password), [password]);
  const tier = TIERS.find((t) => score <= t.threshold) ?? TIERS[TIERS.length - 1]!;
  const width = Math.max(2, Math.min(100, score));

  const gradient =
    width < 30
      ? "from-[#ef4444] to-[#b91c1c]"
      : width < 60
        ? "from-amber-400 to-orange-500"
        : width < 85
          ? "from-indigo to-cyan"
          : "from-emerald-400 to-cyan";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[11px] tracking-[0.05em]">
        <span className="uppercase tracking-[0.2em] text-white/30">Strength</span>
        <span className={cn("font-mono", tier.tone)}>{tier.label}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Password strength"
        className="bg-white/8 relative h-1 w-full overflow-hidden rounded-full"
      >
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-[width] duration-200",
            gradient,
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        Score <span className="font-mono text-white/80">{Math.round(score)}/100</span> ·
        Use a passphrase with 16+ characters.
      </p>
    </div>
  );
}

export function computeScore(password: string): number {
  if (!password) return 0;
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  let repetition = 0;
  const reps = password.match(/(.)\1{2,}/g);
  if (reps) {
    for (const r of reps) repetition -= (r.length - 2) * 4;
  }

  let sequence = 0;
  for (let i = 0; i < password.length - 2; i++) {
    const a = password.charCodeAt(i);
    const b = password.charCodeAt(i + 1);
    const c = password.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) sequence -= 2;
    else if (b - a === -1 && c - b === -1) sequence -= 2;
  }

  const lengthScore = Math.min(60, length * 4);
  const classScore = classes * 10;
  const base = lengthScore + classScore + repetition + sequence;
  return Math.max(0, Math.min(100, base));
}
