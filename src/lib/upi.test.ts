import { describe, expect, it } from "vitest";

import { buildUpiUri } from "./upi";

describe("buildUpiUri", () => {
  it("builds a valid UPI deep link with a fixed two-decimal amount", () => {
    const uri = buildUpiUri({
      upiId: "priya@okhdfcbank",
      payeeName: "Priya Nair",
      amountRupees: 1250.5,
      note: "Goa Trip 2026",
    });

    expect(uri.startsWith("upi://pay?")).toBe(true);

    const params = new URLSearchParams(uri.split("?")[1]);
    expect(params.get("pa")).toBe("priya@okhdfcbank");
    expect(params.get("pn")).toBe("Priya Nair");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("am")).toBe("1250.50");
    expect(params.get("tn")).toBe("Goa Trip 2026");
  });

  it("omits the note when none is given", () => {
    const uri = buildUpiUri({
      upiId: "a@okaxis",
      payeeName: "A",
      amountRupees: 10,
    });

    expect(uri).not.toContain("tn=");
    expect(new URLSearchParams(uri.split("?")[1]).get("am")).toBe("10.00");
  });
});
