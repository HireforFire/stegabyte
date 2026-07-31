"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Unlock,
  ScanLine,
  Settings,
  Home,
  Info,
  Activity,
  Scale,
  FileLock,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export const PRIMARY: NavItem[] = [
  { href: "/", label: "Home", icon: Home, description: "Landing" },
  { href: "/dashboard", label: "Dashboard", icon: Activity, description: "Overview" },
  { href: "/encrypt", label: "Encrypt", icon: Lock, description: "Hide messages" },
  { href: "/extract", label: "Extract", icon: Unlock, description: "Recover messages" },
  { href: "/analyze", label: "Analyze", icon: ScanLine, description: "Inspect images" },
];

export const SECONDARY: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About", icon: Info },
];

export const LEGAL: NavItem[] = [
  { href: "/privacy", label: "Privacy", icon: FileLock },
  { href: "/terms", label: "Terms", icon: Scale },
  { href: "/security", label: "Security", icon: ShieldCheck },
];

export const ALL_ITEMS: NavItem[] = [...PRIMARY, ...SECONDARY, ...LEGAL];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavListProps {
  pathname: string;
  variant?: "sidebar" | "drawer";
}

export function NavList({ pathname, variant = "sidebar" }: NavListProps) {
  const containerCls =
    variant === "drawer"
      ? "flex-1 space-y-7 overflow-y-auto px-3 pt-2"
      : "flex-1 space-y-7 px-3 pt-2";

  return (
    <nav className={containerCls} aria-label="Primary navigation">
      <NavSection label="Workspace">
        {PRIMARY.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            variant={variant}
          />
        ))}
      </NavSection>
      <NavSection label="Account">
        {SECONDARY.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            variant={variant}
          />
        ))}
      </NavSection>
      <NavSection label="Legal">
        {LEGAL.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            variant={variant}
          />
        ))}
      </NavSection>
    </nav>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-white/25">
        {label}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({
  item,
  active,
  variant,
}: {
  item: NavItem;
  active: boolean;
  variant: "sidebar" | "drawer";
}) {
  const Icon = item.icon;
  const baseCls = cn(
    "group relative flex items-center gap-3 rounded-md px-3 text-sm transition-[background-color,color] duration-200",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo/40",
    variant === "sidebar" ? "py-2" : "py-3 text-base",
    active
      ? "bg-white/[0.06] text-white/90"
      : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
  );
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={baseCls}
      >
        {active && (
          <motion.span
            layoutId="nav-active"
            className="absolute inset-y-1.5 left-0 w-[2px] rounded-r-full bg-indigo/60"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#a5aaff]")} />
        <span className="font-normal">{item.label}</span>
        {item.description && (
          <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-white/20">
            {item.description}
          </span>
        )}
      </Link>
    </li>
  );
}
