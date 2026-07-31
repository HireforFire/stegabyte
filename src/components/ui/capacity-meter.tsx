"use client";

import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface CapacityMeterProps {
  used: number;
  total: number;
  label?: string;
  className?: string;
}

export function CapacityMeter({
  used,
  total,
  label = "Capacity",
  className,
}: CapacityMeterProps) {
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const danger = ratio >= 0.9;
  const remaining = Math.max(0, total - used);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-[11px] tracking-[0.05em]">
        <span className="uppercase tracking-[0.2em] text-white/30">{label}</span>
        <span className={cn("font-mono", danger ? "text-[#fca5a5]" : "text-white/80")}>
          {formatBytes(used)} / {formatBytes(total)} ({Math.round(ratio * 100)}%)
        </span>
      </div>
      <Progress value={ratio} dangerThreshold={0.9} label={label} />
      <p className="text-[11px] leading-relaxed text-white/40">
        Remaining:{" "}
        <span className="font-mono text-white/80">{formatBytes(remaining)}</span>
      </p>
    </div>
  );
}
