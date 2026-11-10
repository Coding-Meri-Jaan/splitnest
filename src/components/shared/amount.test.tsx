import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Amount } from "./amount";

describe("Amount", () => {
  it("renders a positive balance with a plus sign and positive tone", () => {
    render(<Amount value={1590} />);

    const element = screen.getByText("+₹1,590");
    expect(element).toBeDefined();
    expect(element.className).toContain("text-success");
  });

  it("renders a negative balance with a minus sign and negative tone", () => {
    render(<Amount value={-900} />);

    const element = screen.getByText("-₹900");
    expect(element.className).toContain("text-destructive");
  });

  it("renders an unsigned amount when signed is false", () => {
    render(<Amount value={1590} signed={false} />);

    expect(screen.getByText("₹1,590")).toBeDefined();
  });
});
