"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { SidebarHeader, SidebarFooter } from "./sidebar";
import { NavList } from "./nav-list";
import { useFocusTrap } from "@/hooks/use-focus-trap";

export interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Trigger element to restore focus to when the drawer closes. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Slide-in drawer for mobile navigation. Shows the full sidebar contents
 * (workspace + account + legal) so phone users can reach Settings/About
 * and the legal pages.
 */
export function MobileDrawer({ open, onClose, triggerRef }: MobileDrawerProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const panelRef = useFocusTrap<HTMLElement>({
    active: open,
    restoreTo: triggerRef,
    autoFocus: true,
  });
  React.useEffect(() => setMounted(true), []);

  // Auto-close on route change.
  React.useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[55] bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="drawer-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="border-white/8 fixed inset-y-0 left-0 z-[56] flex w-[min(320px,90vw)] flex-col border-r bg-black/85 backdrop-blur-2xl lg:hidden"
          >
            <div className="flex items-center justify-between pr-2">
              <SidebarHeader />
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="mr-2 grid h-11 w-11 place-items-center rounded-md text-white/40 hover:bg-white/[0.04] hover:text-white/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList pathname={pathname} variant="drawer" />
            <SidebarFooter />
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
