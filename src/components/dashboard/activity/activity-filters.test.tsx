import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard/activity",
}));

import { ActivityFilters } from "./activity-filters";
import type { ResolvedActivityFilters } from "@/lib/activity-filters";

const allFilters: ResolvedActivityFilters = {
  kind: "all",
  memberId: null,
  category: null,
  range: "all",
  from: null,
  to: null,
  sort: "newest",
  page: 1,
};

const members = [
  { id: "u1", name: "Aarav" },
  { id: "u2", name: "Meera" },
];

const categories = ["food", "travel"] as const;

describe("ActivityFilters", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("reveals a staged custom range without navigating, then resets", () => {
    render(
      <ActivityFilters
        members={members}
        categories={[...categories]}
        active={allFilters}
        resultLabel="12 entries"
      />,
    );

    fireEvent.change(screen.getByLabelText("Period"), {
      target: { value: "custom" },
    });

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText("From")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    expect(replace).toHaveBeenCalledWith("/dashboard/activity", {
      scroll: false,
    });
    expect(screen.queryByLabelText("From")).toBeNull();
    expect((screen.getByLabelText("Period") as HTMLSelectElement).value).toBe(
      "all",
    );
  });

  it("navigates with the custom dates once one is picked", () => {
    render(
      <ActivityFilters
        members={members}
        categories={[...categories]}
        active={allFilters}
        resultLabel="12 entries"
      />,
    );

    fireEvent.change(screen.getByLabelText("Period"), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-01-01" },
    });

    expect(replace).toHaveBeenLastCalledWith(
      "/dashboard/activity?range=custom&from=2026-01-01",
      { scroll: false },
    );
  });

  it("clears a category when narrowing to settlements", () => {
    render(
      <ActivityFilters
        members={members}
        categories={[...categories]}
        active={{ ...allFilters, category: "food" }}
        resultLabel="12 entries"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /settlements/i }));

    expect(replace).toHaveBeenLastCalledWith(
      "/dashboard/activity?kind=settlement",
      { scroll: false },
    );
    expect(screen.queryByLabelText("Category")).toBeNull();
  });

  it("combines member and sort changes into one URL", () => {
    render(
      <ActivityFilters
        members={members}
        categories={[...categories]}
        active={allFilters}
        resultLabel="12 entries"
      />,
    );

    fireEvent.change(screen.getByLabelText("Member"), {
      target: { value: "u2" },
    });
    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "amount" },
    });

    expect(replace).toHaveBeenLastCalledWith(
      "/dashboard/activity?member=u2&sort=amount",
      { scroll: false },
    );
  });

  it("exposes a busy state for screen readers while filters update", () => {
    const { container } = render(
      <ActivityFilters
        members={members}
        categories={[...categories]}
        active={allFilters}
        resultLabel="12 entries"
      />,
    );

    const section = container.querySelector(
      'section[aria-label="Activity filters"]',
    );
    expect(section?.getAttribute("aria-busy")).toBe("false");
  });
});
