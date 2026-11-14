import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadSidebarStore() {
  return import("./sidebar-store");
}

describe("sidebar store", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  it("starts expanded and remembers a collapse", async () => {
    const { setSidebarCollapsed, toggleSidebar } = await loadSidebarStore();

    setSidebarCollapsed(true);

    expect(window.localStorage.getItem("sn-sidebar-collapsed")).toBe("1");

    toggleSidebar();

    expect(window.localStorage.getItem("sn-sidebar-collapsed")).toBe("0");
  });

  it("keeps the choice across a reload", async () => {
    window.localStorage.setItem("sn-sidebar-collapsed", "1");

    const { useSidebarCollapsed } = await loadSidebarStore();
    const { result } = renderHook(() => useSidebarCollapsed());

    expect(result.current).toBe(true);
  });
});
