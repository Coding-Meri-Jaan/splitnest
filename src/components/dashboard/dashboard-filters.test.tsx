import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
}));

import { DashboardFilters } from "./dashboard-filters";

const allFilters = {
  range: "all" as const,
  from: null,
  to: null,
  groupId: null,
  category: null,
  granularity: "monthly" as const,
};

describe("DashboardFilters", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("resets a staged custom range even when the URL never changed", () => {
    render(
      <DashboardFilters
        groups={[]}
        categories={[]}
        active={allFilters}
        resultLabel="3 expenses"
      />,
    );

    fireEvent.change(screen.getByLabelText("Period"), {
      target: { value: "custom" },
    });

    // Choosing "Custom range" only reveals the date inputs; it does not
    // navigate, which is why the old link-based reset was a no-op.
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("From")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(replace).toHaveBeenCalledWith("/dashboard", { scroll: false });
    expect(screen.queryByLabelText("From")).toBeNull();
    expect((screen.getByLabelText("Period") as HTMLSelectElement).value).toBe(
      "all",
    );
  });

  it("navigates with the custom dates once one is picked", () => {
    render(
      <DashboardFilters
        groups={[]}
        categories={[]}
        active={allFilters}
        resultLabel="3 expenses"
      />,
    );

    fireEvent.change(screen.getByLabelText("Period"), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-01-01" },
    });

    expect(replace).toHaveBeenLastCalledWith(
      "/dashboard?range=custom&from=2026-01-01",
      { scroll: false },
    );
  });

  it("exposes a busy state for screen readers while filters update", () => {
    const { container } = render(
      <DashboardFilters
        groups={[]}
        categories={[]}
        active={allFilters}
        resultLabel="3 expenses"
      />,
    );

    const section = container.querySelector(
      'section[aria-label="Dashboard filters"]',
    );
    expect(section?.getAttribute("aria-busy")).toBe("false");
  });
});
