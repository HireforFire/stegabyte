import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  label?: string;
  showValue?: boolean;
  dangerThreshold?: number;
}

export function Progress({
  value,
  label,
  showValue = true,
  dangerThreshold = Infinity,
  className,
  ...props
}: ProgressProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const danger = pct >= dangerThreshold * 100;
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "bg-white/8 relative h-1 w-full overflow-hidden rounded-full",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          danger
            ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-500"
            : "bg-gradient-to-r from-indigo to-cyan",
        )}
        style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(99,102,241,0.35)" }}
      />
      {label || showValue ? (
        <div className="sr-only">{label ?? `${Math.round(pct)}%`}</div>
      ) : null}
    </div>
  );
}
