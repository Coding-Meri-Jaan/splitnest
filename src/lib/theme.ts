export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** localStorage key shared by the boot script and the React store. */
export const THEME_STORAGE_KEY = "sn-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Runs before hydration (via next/script `beforeInteractive`) so the first
 * paint already has the right palette. Keep this dependency-free and tiny.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var p=s==="light"||s==="dark"||s==="system"?s:"system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";e.setAttribute("data-theme",p)}catch(e){}})();`;
