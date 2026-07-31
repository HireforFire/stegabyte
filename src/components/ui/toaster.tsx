"use client";

import { Toaster as SonnerToaster, toast } from "sonner";
import { CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      richColors={false}
      closeButton
      duration={4500}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            "group toast glass-panel text-foreground border-white/15 rounded-md px-4 py-3.5",
          title: "text-[12px] tracking-[0.05em] font-normal",
          description: "text-[11px] text-white/40",
          actionButton:
            "bg-gradient-to-r from-indigo to-cyan text-white rounded-md px-2.5 py-1 text-xs",
          cancelButton: "bg-white/[0.06] text-foreground rounded-md px-2.5 py-1 text-xs",
          error: "border-crimson/30",
          success: "border-emerald/30",
          warning: "border-amber/30",
          info: "border-cyan/30",
        },
      }}
    />
  );
}

export interface NotifyApi {
  success: (msg: string, opts?: NotifyOpts) => void;
  error: (msg: string, opts?: NotifyOpts) => void;
  info: (msg: string, opts?: NotifyOpts) => void;
  warning: (msg: string, opts?: NotifyOpts) => void;
  crypto: (msg: string, opts?: NotifyOpts) => void;
}

export interface NotifyOpts {
  description?: string;
  duration?: number;
  id?: string | number;
}

const icon = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
  error: <XCircle className="h-4 w-4 text-[#fca5a5]" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-300" />,
  info: <Info className="h-4 w-4 text-[#67e8f4]" />,
  crypto: <ShieldCheck className="h-4 w-4 text-[#67e8f4]" />,
} as const;

export const notify: NotifyApi = {
  success: (msg, opts) => toast(msg, { ...opts, icon: icon.success }),
  error: (msg, opts) => toast.error(msg, { ...opts, icon: icon.error }),
  info: (msg, opts) => toast(msg, { ...opts, icon: icon.info }),
  warning: (msg, opts) => toast(msg, { ...opts, icon: icon.warning }),
  crypto: (msg, opts) => toast(msg, { ...opts, icon: icon.crypto }),
};
