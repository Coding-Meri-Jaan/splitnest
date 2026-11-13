import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WhoOwesWhom, type WhoOwesWhomPerson } from "./who-owes-whom";

const people: WhoOwesWhomPerson[] = [
  { id: "asha", name: "Asha", email: "asha@example.com", amount: 500, groupCount: 2 },
  { id: "bilal", name: "Bilal", email: "bilal@example.com", amount: -1200, groupCount: 1 },
  { id: "chen", name: "Chen", email: "chen@example.com", amount: 0, groupCount: 3 },
];

describe("WhoOwesWhom", () => {
  it("shows totals and sorts by absolute amount with settled people last", () => {
    render(<WhoOwesWhom people={people} />);

    expect(screen.getAllByText("Owed to you").length).toBeGreaterThan(0);
    expect(screen.getByText("₹500")).toBeDefined();
    expect(screen.getByText("₹1,200")).toBeDefined();
    expect(screen.getByText("-₹700")).toBeDefined();
    expect(screen.getByText("Showing 3 of 3 people")).toBeDefined();

    const names = screen
      .getAllByRole("listitem")
      .map((item) => within(item).getByText(/Asha|Bilal|Chen/).textContent);

    expect(names).toEqual(["Bilal", "Asha", "Chen"]);
  });

  it("filters by direction with pressed state and an updated live count", () => {
    render(<WhoOwesWhom people={people} />);

    const youOwe = screen.getByRole("button", { name: /You owe/ });
    expect(youOwe.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(youOwe);

    expect(youOwe.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Showing 1 of 3 people")).toBeDefined();
    expect(screen.getByText("Bilal")).toBeDefined();
    expect(screen.queryByText("Asha")).toBeNull();
    expect(screen.getByText("You owe them")).toBeDefined();
  });

  it("searches by name or email and reports an empty state per filter", () => {
    render(<WhoOwesWhom people={people} />);

    const search = screen.getByRole("searchbox", { name: "Search people" });
    fireEvent.change(search, { target: { value: "asha@" } });

    expect(screen.getByText("Showing 1 of 3 people")).toBeDefined();
    expect(screen.getByText("Asha")).toBeDefined();
    expect(screen.queryByText("Bilal")).toBeNull();

    fireEvent.change(search, { target: { value: "nobody" } });
    expect(screen.getByText("No people match “nobody”.")).toBeDefined();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Settled/ }));
    expect(screen.getByText("Chen")).toBeDefined();
    expect(screen.getByText("Settled up")).toBeDefined();
  });

  it("keeps settled people visible in the all filter and hides search when disabled", () => {
    render(<WhoOwesWhom people={people} searchable={false} />);

    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByText("Chen")).toBeDefined();
    expect(screen.getAllByText("Settled up").length).toBeGreaterThan(0);
  });

  it("prefills the people search from a global search link", () => {
    render(<WhoOwesWhom people={people} initialQuery="asha@" />);

    const search = screen.getByRole("searchbox", {
      name: "Search people",
    }) as HTMLInputElement;

    expect(search.value).toBe("asha@");
    expect(screen.getByText("Showing 1 of 3 people")).toBeDefined();
    expect(screen.getByText("Asha")).toBeDefined();
    expect(screen.queryByText("Bilal")).toBeNull();
  });
});
