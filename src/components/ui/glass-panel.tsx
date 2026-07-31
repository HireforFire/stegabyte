"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Indigo tint (default) | Cyan tint | Neutral */
  tint?: "indigo" | "cyan" | "neutral";
  /** Show animated corner brackets. Default true. */
  brackets?: boolean;
  /** Show animated scan line. Default true. */
  scanline?: boolean;
  /** Glow intensity. Default "default". */
  glow?: "default" | "strong" | "none";
}

/**
 * Liquid-glass panel — centerpiece of the Stegabyte UI.
 *
 * Replicates the visual language of the PortfolioSite:
 *   - bg-black/60 backdrop blur
 *   - 1px white/8 border
 *   - Layered box-shadow glow (white + indigo/cyan)
 *   - Inset highlight
 *   - Decorative corner brackets and a scanning line
 */
export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  function GlassPanel(
    {
      className,
      tint = "indigo",
      brackets = true,
      scanline = true,
      glow = "default",
      children,
      ...props
    },
    ref,
  ) {
    const tintClass =
      tint === "cyan"
        ? "border-cyan/15 shadow-[0_0_60px_rgba(255,255,255,0.06),0_0_120px_rgba(6,182,212,0.10),inset_0_0_60px_rgba(255,255,255,0.02)]"
        : tint === "neutral"
          ? "border-white/8 shadow-[0_0_60px_rgba(255,255,255,0.06),inset_0_0_60px_rgba(255,255,255,0.02)]"
          : "border-indigo/15 shadow-[0_0_60px_rgba(255,255,255,0.06),0_0_120px_rgba(99,102,241,0.08),inset_0_0_60px_rgba(255,255,255,0.02)]";

    const glowOverride =
      glow === "strong"
        ? "shadow-[0_0_60px_rgba(255,255,255,0.10),0_0_120px_rgba(99,102,241,0.20),inset_0_0_60px_rgba(255,255,255,0.04)]"
        : glow === "none"
          ? "shadow-[inset_0_0_60px_rgba(255,255,255,0.02)]"
          : "";

    return (
      <div
        ref={ref}
        data-slot="glass-panel"
        className={cn(
          "relative rounded-lg border bg-black/60 backdrop-blur-xl",
          "transition-[border-color,box-shadow] duration-300",
          "hover:border-white/15",
          tintClass,
          glowOverride,
          className,
        )}
        {...props}
      >
        {brackets && <CornerBrackets />}
        {scanline && tint !== "neutral" && (
          <ScanLine colorClass={tint === "cyan" ? "via-cyan/20" : "via-indigo/20"} />
        )}
        <div className="relative">{children}</div>
      </div>
    );
  },
);

/**
 * Four L-shaped brackets at the corners of a panel. Matches PortfolioSite.
 */
export function CornerBrackets({
  size = 6,
  colorClass = "bg-white/15",
}: {
  size?: 4 | 6 | 8 | 10 | 12;
  colorClass?: string;
}) {
  const sizeClass = {
    4: "w-4 h-4",
    6: "w-6 h-6",
    8: "w-8 h-8",
    10: "w-10 h-10",
    12: "w-12 h-12",
  }[size];

  const positions = [
    { pos: "top-0 left-0", rotate: "" },
    { pos: "top-0 right-0", rotate: "rotate-90" },
    { pos: "bottom-0 left-0", rotate: "-rotate-90" },
    { pos: "bottom-0 right-0", rotate: "rotate-180" },
  ] as const;

  return (
    <>
      {positions.map((p, i) => (
        <div
          key={i}
          className={cn("pointer-events-none absolute", sizeClass, p.pos, p.rotate)}
          aria-hidden
        >
          <div className={cn("absolute left-0 top-0 h-[1px] w-full", colorClass)} />
          <div className={cn("absolute left-0 top-0 h-full w-[1px]", colorClass)} />
        </div>
      ))}
    </>
  );
}

/**
 * Animated horizontal scan line that travels top to bottom.
 */
export function ScanLine({
  colorClass = "via-indigo/20",
  duration = 5,
}: {
  colorClass?: string;
  duration?: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 h-[1px] animate-scan-line bg-gradient-to-r from-transparent to-transparent",
        colorClass,
      )}
      style={{ animationDuration: `${duration}s`, animationDelay: "1s" }}
      aria-hidden
    />
  );
}
