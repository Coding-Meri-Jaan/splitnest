import { describe, expect, it } from "vitest";

import {
  formatCompactINR,
  formatDate,
  formatINR,
  formatINRPrecise,
  formatPaise,
  formatSignedINR,
  formatSignedPaise,
  getInitials,
} from "./format";

describe("formatINR", () => {
  it("uses Indian digit grouping", () => {
    expect(formatINR(125000)).toBe("₹1,25,000");
  });

  it("rounds to whole rupees by default", () => {
    expect(formatINR(1590)).toBe("₹1,590");
  });

  it("keeps paise instead of rounding a small amount to zero", () => {
    expect(formatINR(0.01)).toBe("₹0.01");
    expect(formatINR(928.5)).toBe("₹928.50");
    expect(formatINR(-0.01)).toBe("-₹0.01");
  });

  it("ignores floating-point residue on whole rupees", () => {
    expect(formatINR(2015.0000000002)).toBe("₹2,015");
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

  it("keeps paise for tiny negative balances", () => {
    expect(formatSignedINR(-0.01)).toBe("-₹0.01");
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

describe("formatPaise", () => {
  it("converts integer paise exactly at the display edge", () => {
    expect(formatPaise(0)).toBe("₹0");
    expect(formatPaise(1)).toBe("₹0.01");
    expect(formatPaise(12_500)).toBe("₹125");
    expect(formatPaise(123_456)).toBe("₹1,234.56");
  });

  it("signs paise values when asked", () => {
    expect(formatSignedPaise(1_000)).toBe("+₹10");
    expect(formatSignedPaise(-1_000)).toBe("-₹10");
    expect(formatSignedPaise(0)).toBe("₹0");
  });
});

describe("formatCompactINR", () => {
  it("keeps small values in whole rupees", () => {
    expect(formatCompactINR(0)).toBe("₹0");
    expect(formatCompactINR(85_000)).toBe("₹850");
  });

  it("compacts thousands, lakhs and crores from paise", () => {
    expect(formatCompactINR(1_20_000)).toBe("₹1.2k");
    expect(formatCompactINR(1_00_00_000)).toBe("₹1L");
    expect(formatCompactINR(2_50_00_000)).toBe("₹2.5L");
    expect(formatCompactINR(1_00_00_00_000)).toBe("₹1Cr");
  });

  it("preserves the sign on negative values", () => {
    expect(formatCompactINR(-1_20_000)).toBe("-₹1.2k");
  });
});
