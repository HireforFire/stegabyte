"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TechButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "cyan";
  loading?: boolean;
  /** Render as Slot (e.g. for `<a>`). */
  asChild?: boolean;
  /** Optional icon — Lucide icon component. */
  icon?: React.ReactNode;
  /** Optional trailing element (loading spinner etc). */
  trailing?: React.ReactNode;
}

export const TechButton = React.forwardRef<HTMLButtonElement, TechButtonProps>(
  function TechButton(
    {
      variant = "secondary",
      loading = false,
      disabled,
      className,
      children,
      icon,
      trailing,
      asChild,
      type,
      ...props
    },
    ref,
  ) {
    const base =
      "group relative inline-flex items-center justify-center gap-2 px-5 h-11 rounded-md border text-[12px] tracking-[0.15em] uppercase transition-[border-color,background-color,color,box-shadow] duration-300 disabled:cursor-not-allowed disabled:opacity-40 select-none font-normal";

    const variantClass = {
      primary:
        "border-indigo/30 text-[#a5aaff]/70 hover:border-indigo/50 hover:text-[#a5aaff] hover:bg-indigo/[0.06] active:scale-[0.98]",
      secondary:
        "border-cyan/30 text-[#67e8f4]/70 hover:border-cyan/50 hover:text-[#67e8f4] hover:bg-cyan/[0.06] active:scale-[0.98]",
      cyan: "border-cyan/30 text-[#67e8f4]/70 hover:border-cyan/50 hover:text-[#67e8f4] hover:bg-cyan/[0.06] active:scale-[0.98] shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]",
      ghost:
        "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80 hover:bg-white/[0.06] active:scale-[0.98]",
      destructive:
        "border-crimson/30 text-[#fca5a5]/70 hover:border-crimson/50 hover:text-[#fca5a5] hover:bg-crimson/[0.06] active:scale-[0.98]",
    }[variant];

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      const merged = React.cloneElement(child, {
        className: cn(base, variantClass, className, child.props.className),
        "aria-busy": loading || undefined,
        "data-slot": "tech-button",
      } as Record<string, unknown>);
      return merged;
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        data-slot="tech-button"
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(base, variantClass, className)}
        {...props}
      >
        {icon}
        <span className="relative z-10">{children}</span>
        {trailing}
        {variant === "primary" && (
          <span
            aria-hidden
            className="to-purple/[0.10] pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-indigo/[0.10] via-cyan/[0.10] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
      </button>
    );
  },
);
