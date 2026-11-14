"use client";

import { useSyncExternalStore } from "react";

import {
  THEME_STORAGE_KEY,
  isThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeSnapshot {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  /** False until the browser preference has been read. */
  ready: boolean;
}

const SERVER_SNAPSHOT: ThemeSnapshot = {
  preference: "system",
  resolved: "light",
  ready: false,
};

const listeners = new Set<() => void>();
let initialized = false;
let mediaQuery: MediaQueryList | null = null;
let snapshot: ThemeSnapshot = SERVER_SNAPSHOT;

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return prefersDark() ? "dark" : "light";
  return preference;
}

function applyToDocument() {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const dark = snapshot.resolved === "dark";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.setAttribute("data-theme", snapshot.preference);
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function initialize() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const preference = readStoredPreference();
  snapshot = {
    preference,
    resolved: resolve(preference),
    ready: true,
  };

  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    // An explicit choice always wins over the OS setting.
    if (snapshot.preference !== "system") return;
    snapshot = {
      ...snapshot,
      resolved: resolve("system"),
    };
    applyToDocument();
    emit();
  });
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  initialize();
  // Re-apply after hydration in case the boot script was skipped.
  applyToDocument();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ThemeSnapshot {
  initialize();
  return snapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

export function setTheme(preference: ThemePreference) {
  initialize();

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode can reject writes; the choice still applies this session.
  }

  snapshot = {
    preference,
    resolved: resolve(preference),
    ready: true,
  };
  applyToDocument();
  emit();
}

export function toggleTheme() {
  setTheme(getSnapshot().resolved === "dark" ? "light" : "dark");
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export type { ThemeSnapshot };
