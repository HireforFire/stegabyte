"use client";

import * as React from "react";
import { Bell, ShieldCheck, Search, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./command-palette";
import { MobileDrawer } from "./mobile-drawer";

export interface NavbarProps {
  onOpenMobileNav?: () => void;
}

export function Navbar({ onOpenMobileNav }: NavbarProps) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const drawerTriggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-white/[0.06] bg-black/40 px-4 backdrop-blur-xl sm:gap-3 lg:px-8",
      )}
    >
      {/* Mobile menu — 44×44 to meet touch-target minimum */}
      <button
        ref={drawerTriggerRef}
        type="button"
        aria-label="Open navigation"
        aria-expanded={drawerOpen}
        aria-controls="mobile-drawer"
        onClick={onOpenMobileNav ?? (() => setDrawerOpen(true))}
        className="border-white/8 grid h-11 w-11 place-items-center rounded-md border bg-white/[0.03] text-white/40 hover:text-white/80 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search trigger — desktop inline, mobile icon button */}
      <div className="hidden flex-1 items-center gap-2 lg:flex">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "border-white/8 group flex w-full max-w-md items-center gap-2 rounded-md border bg-white/[0.03] px-3 py-2 text-sm text-white/40",
            "hover:border-white/15 hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo/40",
          )}
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="hidden rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white/40 md:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Mobile search icon — opens command palette */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => setPaletteOpen(true)}
        className="border-white/8 grid h-11 w-11 place-items-center rounded-md border bg-white/[0.03] text-white/40 hover:text-white/80 lg:hidden"
      >
        <Search className="h-5 w-5" />
      </button>

      <div className="ml-auto flex items-center gap-2">
        <PrivacyPill />
        {/* Notifications — desktop only; mobile chrome is too narrow. */}
        <button
          type="button"
          aria-label="View release notes"
          title="Release notes"
          onClick={() => window.dispatchEvent(new CustomEvent("stegabyte:about"))}
          className="border-white/8 hidden h-11 w-11 place-items-center rounded-md border bg-white/[0.03] text-white/40 hover:text-white/80 lg:grid"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        anchorRef={triggerRef}
      />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        triggerRef={drawerTriggerRef}
      />
    </header>
  );
}

function PrivacyPill() {
  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-300 sm:inline-flex">
      <ShieldCheck className="h-3.5 w-3.5" />
      Local-only
    </div>
  );
}
