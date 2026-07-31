import * as React from "react";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "border border-indigo/30 text-[#a5aaff]/70 hover:border-indigo/50 hover:text-[#a5aaff] hover:bg-indigo/[0.06] shadow-[0_0_20px_rgba(99,102,241,0.18)] hover:shadow-[0_0_40px_rgba(99,102,241,0.35)]",
  cyan: "border border-cyan/30 text-[#67e8f4]/70 hover:border-cyan/50 hover:text-[#67e8f4] hover:bg-cyan/[0.06] shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:shadow-[0_0_40px_rgba(6,182,212,0.35)]",
  glass: "glass-panel text-foreground hover:border-white/15",
  outline: "border border-white/10 bg-transparent hover:bg-white/[0.04] text-foreground",
  ghost: "bg-transparent hover:bg-white/[0.04] text-white/50 hover:text-white/80",
  destructive:
    "border border-crimson/40 bg-crimson/[0.06] text-[#fca5a5] hover:bg-crimson/[0.12]",
  subtle: "bg-white/[0.03] text-foreground hover:bg-white/[0.06] border border-white/8",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-11 px-5 text-sm rounded-lg",
  lg: "h-12 px-7 text-base rounded-lg",
  icon: "h-10 w-10 rounded-md",
} as const;

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    React.RefAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "glass", size = "md", asChild = false, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={asChild ? undefined : ref}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type={asChild ? (undefined as any) : (type ?? "button")}
      data-slot="button"
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 font-normal transition-[border-color,background-color,color,box-shadow] duration-300",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo/40 focus-visible:ring-offset-0",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as Record<string, unknown>)}
    />
  );
});

export { Button };
