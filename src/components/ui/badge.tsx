import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "indigo" | "cyan" | "success" | "warning" | "danger" | "neutral";
}

const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-white/10 bg-white/[0.03] text-white/50",
  indigo: "border-indigo/25 bg-indigo/[0.05] text-[#a5aaff]/70",
  cyan: "border-cyan/25 bg-cyan/[0.05] text-[#67e8f4]/70",
  success: "border-emerald/30 bg-emerald/[0.05] text-emerald-300",
  warning: "border-amber/30 bg-amber/[0.05] text-amber-300",
  danger: "border-crimson/30 bg-crimson/[0.05] text-[#fca5a5]",
  neutral: "border-white/8 bg-white/[0.03] text-white/40",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-normal uppercase tracking-[0.2em]",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
