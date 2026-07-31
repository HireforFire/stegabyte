"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TechLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accent color */
  color?: "indigo" | "cyan" | "neutral";
  /** Show the leading line */
  withLine?: boolean;
  /** Show the trailing dot */
  withDot?: boolean;
  /** Override the color of the text (one of the theme colors). */
  textClass?: string;
}

/**
 * Uppercase tracked label with optional leading line and trailing dot.
 * Matches PortfolioSite's "About" / "Contact" section labels.
 *
 *   <div className="w-4 h-[1px] bg-indigo/50" />
 *   <span className="text-[10px] tracking-[0.3em] uppercase text-indigo/50">About</span>
 */
export function TechLabel({
  children,
  color = "indigo",
  withLine = true,
  withDot = false,
  textClass,
  className,
  ...props
}: TechLabelProps) {
  const lineColor = {
    indigo: "bg-indigo/50",
    cyan: "bg-cyan/50",
    neutral: "bg-white/20",
  }[color];

  const defaultText = {
    indigo: "text-indigo/50",
    cyan: "text-cyan/50",
    neutral: "text-white/30",
  }[color];

  return (
    <div className={cn("flex items-center gap-3", className)} {...props}>
      {withLine && <div className={cn("h-[1px] w-4", lineColor)} />}
      <span
        className={cn("text-[10px] uppercase tracking-[0.3em]", textClass ?? defaultText)}
      >
        {children}
      </span>
      {withDot && (
        <div className="ml-auto flex flex-1 items-center gap-3">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          <div
            className={cn("h-1 w-1 rounded-full", {
              "bg-indigo/40": color === "indigo",
              "bg-cyan/40": color === "cyan",
              "bg-white/30": color === "neutral",
            })}
          />
        </div>
      )}
    </div>
  );
}
