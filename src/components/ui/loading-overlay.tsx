"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingOverlayProps {
  open: boolean;
  label?: string;
  description?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({
  open,
  label = "Working…",
  description,
  progress,
  className,
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md",
            className,
          )}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="glass-panel flex w-full max-w-sm flex-col items-center gap-3 p-6"
          >
            <Loader2 className="h-7 w-7 animate-spin text-[#67e8f4]/80" />
            <p className="text-[13px] font-normal tracking-[0.05em] text-white/90">
              {label}
            </p>
            {description && (
              <p className="text-center text-[11px] leading-relaxed text-white/40">
                {description}
              </p>
            )}
            {typeof progress === "number" && (
              <div className="bg-white/8 mt-1 h-1 w-full overflow-hidden rounded-full">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo via-cyan to-cyan"
                  style={{ boxShadow: "0 0 12px rgba(99,102,241,0.4)" }}
                  animate={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
