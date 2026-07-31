"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lock,
  Unlock,
  ScanLine,
  Home,
  Settings,
  Info,
  Activity,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface CommandItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const ITEMS: CommandItem[] = [
  { label: "Home", href: "/", icon: Home, description: "Landing page" },
  { label: "Dashboard", href: "/dashboard", icon: Activity, description: "Overview" },
  {
    label: "Encrypt",
    href: "/encrypt",
    icon: Lock,
    description: "Hide messages in PNGs",
  },
  {
    label: "Extract",
    href: "/extract",
    icon: Unlock,
    description: "Recover hidden messages",
  },
  { label: "Analyze", href: "/analyze", icon: ScanLine, description: "Inspect images" },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "About", href: "/about", icon: Info },
];

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /**
   * Anchor element to position the palette below. The palette is rendered into
   * a portal at document.body so it escapes any clipping/transform context
   * (e.g. the sticky `<header>`), and is positioned absolutely beneath the
   * anchor with a small offset.
   */
  anchorRef?: React.RefObject<HTMLElement | null>;
}

const ANCHOR_GAP = 8; // px below the trigger
const VIEWPORT_PADDING = 12; // px from the viewport edge

export function CommandPalette({ open, onClose, anchorRef }: CommandPaletteProps) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [pos, setPos] = React.useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const panelRef = useFocusTrap<HTMLDivElement>({
    active: open,
    restoreTo: anchorRef,
    autoFocus: true,
  });

  React.useEffect(() => setMounted(true), []);

  // Recompute position whenever the palette opens or the anchor moves.
  React.useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setPos(null);
      return;
    }
    const compute = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const maxWidth = Math.min(rect.width, 560);
      // Prefer aligning with the anchor's left edge, clamped to the viewport.
      let left = rect.left;
      if (left + maxWidth > viewportW - VIEWPORT_PADDING) {
        left = Math.max(VIEWPORT_PADDING, viewportW - maxWidth - VIEWPORT_PADDING);
      }
      setPos({ left, top: rect.bottom + ANCHOR_GAP, width: maxWidth });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchorRef]);

  const filtered = React.useMemo(
    () =>
      ITEMS.filter((i) =>
        q
          ? `${i.label} ${i.description ?? ""}`.toLowerCase().includes(q.toLowerCase())
          : true,
      ),
    [q],
  );

  React.useEffect(() => {
    setActive(0);
  }, [q]);

  const go = React.useCallback(
    (href: string) => {
      onClose();
      window.location.assign(href);
    },
    [onClose],
  );

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === "Enter") {
        const item = filtered[active];
        if (item) go(item.href);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, active, go]);

  if (!mounted || !open) return null;

  const left = pos?.left ?? VIEWPORT_PADDING;
  const top = pos?.top ?? VIEWPORT_PADDING;
  const width = pos?.width ?? 560;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      />
      <motion.div
        key="palette"
        initial={{ y: -6, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -6, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        ref={panelRef}
        style={{ left, top, width, position: "fixed", zIndex: 70 }}
        className="glass-panel overflow-hidden rounded-md"
      >
        <div className="border-white/8 flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            aria-label="Search commands"
            placeholder="Type to search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/40"
          />
          <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white/40">
            esc
          </kbd>
        </div>
        <ul className="scrollbar-thin max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="p-6 text-center text-[12px] text-white/40">No matches.</li>
          ) : (
            filtered.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-[13px]",
                      active === i
                        ? "bg-white/[0.06] text-white/95"
                        : "text-white/60 hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon className="h-4 w-4 text-[#a5aaff]/70" />
                    <span className="flex-1 font-normal">{item.label}</span>
                    {item.description && (
                      <span className="text-[10px] tracking-[0.05em] text-white/30">
                        {item.description}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="border-white/8 flex items-center justify-between border-t bg-black/40 px-4 py-2 text-[10px] tracking-[0.05em] text-white/30">
          <span>↑↓ navigate · ↵ open</span>
          <span>Stegabyte</span>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
