"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HistogramProps {
  data: number[];
  className?: string;
  height?: number;
  highlight?: boolean;
}

export function Histogram({
  data,
  className,
  height = 80,
  highlight = true,
}: HistogramProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (data.length === 0) return;

    let max = 0;
    for (let i = 0; i < data.length; i++) if (data[i]! > max) max = data[i]!;
    if (max === 0) return;

    const binWidth = cssWidth / data.length;
    const gradient = ctx.createLinearGradient(0, 0, 0, cssHeight);
    gradient.addColorStop(0, "rgba(99, 102, 241, 0.95)");
    gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.6)");
    gradient.addColorStop(1, "rgba(6, 182, 212, 0.4)");

    ctx.fillStyle = gradient;
    for (let i = 0; i < data.length; i++) {
      const h = (data[i]! / max) * (cssHeight - 4);
      ctx.fillRect(i * binWidth, cssHeight - h, Math.max(0.5, binWidth), h);
    }

    if (highlight) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      for (let i = 0; i < data.length; i++) {
        if (data[i] === max) {
          const h = (max / max) * (cssHeight - 4);
          ctx.fillRect(i * binWidth, cssHeight - h, Math.max(0.5, binWidth), h);
        }
      }
    }
  }, [data, highlight]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("block w-full", className)}
      style={{ height }}
      role="img"
      aria-label="Pixel intensity histogram"
    />
  );
}
