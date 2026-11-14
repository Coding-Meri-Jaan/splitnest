import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      media: DARK_QUERY,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
}

async function loadThemeStore() {
  return import("./theme-store");
}

describe("theme store", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.style.colorScheme = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies and persists an explicit dark preference", async () => {
    stubMatchMedia(false);
    const { setTheme } = await loadThemeStore();

    setTheme("dark");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem("sn-theme")).toBe("dark");
  });

  it("follows the system setting when the preference is system", async () => {
    stubMatchMedia(true);
    const { setTheme } = await loadThemeStore();

    setTheme("system");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("sn-theme")).toBe("system");
  });

  it("toggles between light and dark from the resolved theme", async () => {
    stubMatchMedia(false);
    const { setTheme, toggleTheme } = await loadThemeStore();

    setTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    toggleTheme();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("sn-theme")).toBe("dark");
  });

  it("falls back to system when storage holds an unknown value", async () => {
    stubMatchMedia(false);
    window.localStorage.setItem("sn-theme", "neon");
    const { useTheme } = await loadThemeStore();

    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("system");
  });
});
