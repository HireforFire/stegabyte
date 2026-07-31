"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Sparkles } from "lucide-react";
import { NavList, PRIMARY, isActive } from "./nav-list";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-black/40 backdrop-blur-xl lg:flex"
      aria-label="Primary navigation"
    >
      <SidebarHeader />
      <NavList pathname={pathname} variant="sidebar" />
      <SidebarFooter />
    </aside>
  );
}

export function SidebarHeader() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-6">
      <div className="relative grid h-9 w-9 place-items-center rounded-md border border-indigo/30 bg-black/60">
        <span className="absolute inset-0 rounded-md shadow-[0_0_20px_rgba(99,102,241,0.25)]" />
        <ShieldCheck className="relative h-4 w-4 text-[#a5aaff]" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-extralight tracking-[0.1em] text-white/90">
          Stegabyte
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-white/25">
          v1.0 · beta
        </span>
      </div>
    </div>
  );
}

export function SidebarFooter() {
  return (
    <div className="border-white/8 m-3 mt-auto rounded-md border bg-black/40 p-4 backdrop-blur-xl">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 text-[#a5aaff]/70" />
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/50">
            Local-only encryption
          </p>
          <p className="text-[11px] leading-snug text-white/30">
            No plaintext leaves your browser.{" "}
            <Link
              href="/security"
              className="text-white/50 underline-offset-2 hover:underline"
            >
              Read the security note
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/** Mobile bottom nav — used by the root layout on small screens. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Mobile navigation"
      className="border-white/8 fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-md border bg-black/70 px-1.5 py-1.5 backdrop-blur-xl lg:hidden"
    >
      {PRIMARY.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] tracking-[0.05em] transition-colors",
              active
                ? "bg-white/[0.06] text-white/90"
                : "text-white/40 hover:text-white/70",
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-[#a5aaff]")} />
            <span className="leading-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AboutHint() {
  return (
    <Link
      href="/about"
      className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-white/30 hover:text-white/60"
    >
      <span aria-hidden>📖</span> Learn how this works
    </Link>
  );
}
