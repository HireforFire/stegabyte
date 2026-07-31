"use client";

import * as React from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface EntropyMeterProps {
  value: number;
  suspicion?: number;
  className?: string;
}

export function EntropyMeter({ value, suspicion = 0, className }: EntropyMeterProps) {
  const v = Math.max(0, Math.min(8, value));
  const s = Math.max(0, Math.min(1, suspicion));
  const assessment = React.useMemo(() => {
    if (v >= 7.4 && s >= 0.4)
      return { label: "Possible steganographic payload", tone: "warning" as const };
    if (v >= 7.6) return { label: "High entropy", tone: "info" as const };
    if (v < 4) return { label: "Low entropy", tone: "muted" as const };
    return { label: "Normal", tone: "muted" as const };
  }, [v, s]);

  const toneClass =
    assessment.tone === "warning"
      ? "text-amber-300"
      : assessment.tone === "info"
        ? "text-[#67e8f4]"
        : "text-white/40";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-[11px] tracking-[0.05em]">
        <span className="uppercase tracking-[0.2em] text-white/30">Entropy</span>
        <span className="font-mono text-white/80">{v.toFixed(2)} bits / byte</span>
      </div>
      <Progress value={v / 8} label="entropy" />
      {s > 0 && (
        <>
          <div className="flex items-center justify-between text-[11px] tracking-[0.05em]">
            <span className="uppercase tracking-[0.2em] text-white/30">
              LSB suspicion
            </span>
            <span className="font-mono text-white/80">{Math.round(s * 100)}%</span>
          </div>
          <Progress value={s} dangerThreshold={0.7} label="lsb-suspicion" />
        </>
      )}
      <p className={cn("text-[11px] tracking-[0.05em]", toneClass)}>{assessment.label}</p>
    </div>
  );
}
