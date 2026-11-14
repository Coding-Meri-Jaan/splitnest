"use client";

import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

import { setTheme, toggleTheme, useTheme } from "./theme-store";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, ready } = useTheme();
  const dark = ready && resolved === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-sm" }),
        "text-muted-foreground",
        className,
      )}
    >
      {dark ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
    </button>
  );
}

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof SunIcon;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Always bright",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: MoonIcon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device",
    icon: MonitorIcon,
  },
];

export function ThemePreferenceControl() {
  const { preference } = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      className="grid gap-2.5 sm:grid-cols-3"
    >
      {THEME_OPTIONS.map((option) => {
        const selected = preference === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
              selected
                ? "border-brand/35 bg-brand/10 text-foreground ring-1 ring-brand/20"
                : "border-border/60 bg-card/50 text-muted-foreground hover:border-brand/25 hover:bg-card hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                selected
                  ? "bg-brand/15 text-brand"
                  : "bg-foreground/[0.04] text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
            {selected ? (
              <CheckIcon className="size-4 shrink-0 text-brand" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
