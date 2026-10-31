import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatINR,
  formatINRPrecise,
  formatSignedINR,
  getInitials,
} from "./format";

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
  });

  it("rounds to whole rupees by default", () => {
    expect(formatINR(1590)).toBe("₹1,590");
  });
});

describe("formatINRPrecise", () => {
  it("always shows two decimal places", () => {
    expect(formatINRPrecise(1590.5)).toBe("₹1,590.50");
  });
});

describe("formatSignedINR", () => {
  it("prefixes a plus for money owed to you", () => {
    expect(formatSignedINR(1590)).toBe("+₹1,590");
  });

  it("prefixes a minus for money you owe", () => {
    expect(formatSignedINR(-900)).toBe("-₹900");
  });

  it("leaves zero unsigned", () => {
    expect(formatSignedINR(0)).toBe("₹0");
  });
});

describe("formatDate", () => {
  it("formats an ISO date for an Indian audience", () => {
    expect(formatDate("2026-10-04")).toBe("04 Oct 2026");
  });

  it("returns the input unchanged when the date is invalid", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("getInitials", () => {
  it("uses the first and last name", () => {
    expect(getInitials("Aarav Sharma")).toBe("AS");
  });

  it("uses two letters for a single name", () => {
    expect(getInitials("Priya")).toBe("PR");
  });

  it("falls back to a question mark for empty input", () => {
    expect(getInitials("   ")).toBe("?");
  });
});
