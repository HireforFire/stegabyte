"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Trash2,
  ShieldCheck,
  BellRing,
  Cpu,
  Layers,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TechButton } from "@/components/ui/tech-button";
import { TechLabel } from "@/components/ui/tech-label";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/ui/toaster";

const STORAGE_KEY = "Stegabyte.settings.v1";

interface Settings {
  reducedMotion: boolean;
  showEntropyHints: boolean;
  autoAnalyze: boolean;
  experimentalWorkers: boolean;
}

const defaults: Settings = {
  reducedMotion: false,
  showEntropyHints: true,
  autoAnalyze: true,
  experimentalWorkers: false,
};

export function SettingsPage() {
  const [settings, setSettings] = React.useState<Settings>(defaults);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>;
        setSettings({ ...defaults, ...parsed });
      }
    } catch {
      // Ignore corrupt storage.
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.style.scrollBehavior = settings.reducedMotion
      ? "auto"
      : "smooth";
  }, [settings]);

  const clearVault = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("Stegabyte.")) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
    setSettings(defaults);
    notify.success("Local Stegabyte data cleared.");
  }, []);

  const rows: Array<{
    key: keyof Settings;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: "reducedMotion",
      label: "Reduce motion",
      description: "Disable non-essential animations across the interface.",
      icon: Layers,
    },
    {
      key: "showEntropyHints",
      label: "Show entropy hints",
      description: "Surface cryptographic quality tips on encrypt/extract pages.",
      icon: ShieldCheck,
    },
    {
      key: "autoAnalyze",
      label: "Auto-analyze uploads",
      description: "Run an entropy/suspicion scan as soon as an image is selected.",
      icon: BellRing,
    },
    {
      key: "experimentalWorkers",
      label: "Experimental worker offloading",
      description: "Offload the heaviest LSB scans to a background worker.",
      icon: Cpu,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-5 py-10 sm:px-6 lg:px-8 lg:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="space-y-3"
      >
        <TechLabel color="indigo">Account · Settings</TechLabel>
        <h1 className="flex items-center gap-3 text-3xl font-extralight tracking-tight text-white/90 md:text-4xl">
          <SettingsIcon className="h-5 w-5 text-[#a5aaff]/70" />
          Settings
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/40">
          Preferences are stored locally in your browser only.
        </p>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle>Interface</CardTitle>
          <CardDescription>Visual and behavioral preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <label
              key={row.key}
              htmlFor={row.key}
              className="border-white/8 flex cursor-pointer items-center justify-between gap-4 rounded-md border bg-white/[0.02] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            >
              <div className="flex items-start gap-3">
                <row.icon className="mt-0.5 h-4 w-4 text-[#67e8f4]/70" />
                <div className="space-y-0.5">
                  <span className="block text-xs font-normal uppercase tracking-[0.2em] text-white/40">
                    {row.label}
                  </span>
                  <span className="block text-sm leading-relaxed text-white/50">
                    {row.description}
                  </span>
                </div>
              </div>
              <Switch
                id={row.key}
                checked={settings[row.key]}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({ ...prev, [row.key]: checked }))
                }
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>
            Stegabyte stores preferences in{" "}
            <span className="font-mono text-white/80">localStorage</span>. Messages and
            images never leave your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="border-white/8 flex items-center justify-between gap-4 rounded-md border bg-white/[0.02] p-4">
          <div className="space-y-0.5">
            <span className="flex items-center gap-2 text-xs font-normal uppercase tracking-[0.2em] text-[#fca5a5]/80">
              <Trash2 className="h-3.5 w-3.5" />
              Clear local Stegabyte data
            </span>
            <p className="text-sm leading-relaxed text-white/50">
              Removes preferences and any cached data. Cannot be undone.
            </p>
          </div>
          <TechButton variant="destructive" onClick={clearVault}>
            <Trash2 className="h-4 w-4" /> Clear
          </TechButton>
        </CardContent>
      </Card>

      <div className="text-center text-[11px] tracking-[0.05em] text-white/30">
        Stegabyte is open-source and operates with no backend.
        <Badge variant="neutral" className="ml-2">
          v1.0 · beta
        </Badge>
      </div>
    </div>
  );
}
