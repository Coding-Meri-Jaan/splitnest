import { describe, expect, it } from "vitest";

import {
  buildDefaultSplitValues,
  buildSplitShares,
  splitProportionally,
} from "./splits";

const users = ["a", "b", "c"];

function sharesOf(
  result: ReturnType<typeof buildSplitShares>,
): Record<string, number> {
  if ("error" in result) throw new Error(result.error);
  return Object.fromEntries(
    result.splits.map((split) => [split.userId, split.sharePaise]),
  );
}

describe("splitProportionally", () => {
  it("splits by weight and preserves every paise", () => {
    expect(
      splitProportionally(10_000, [
        { userId: "a", weight: 2 },
        { userId: "b", weight: 1 },
      ]),
    ).toEqual({ a: 6667, b: 3333 });
  });

  it("distributes a three-way remainder deterministically", () => {
    const result = splitProportionally(100, [
      { userId: "c", weight: 1 },
      { userId: "a", weight: 1 },
      { userId: "b", weight: 1 },
    ]);

    expect(result).toEqual({ a: 34, b: 33, c: 33 });
    expect(Object.values(result).reduce((sum, value) => sum + value, 0)).toBe(
      100,
    );
  });

  it("keeps zero-weight people at zero", () => {
    expect(
      splitProportionally(1_000, [
        { userId: "a", weight: 1 },
        { userId: "b", weight: 0 },
      ]),
    ).toEqual({ a: 1000, b: 0 });
  });

  it("rejects invalid totals and weights", () => {
    expect(() => splitProportionally(0, [{ userId: "a", weight: 1 }])).toThrow();
    expect(() =>
      splitProportionally(100, [{ userId: "a", weight: 0 }]),
    ).toThrow();
    expect(() =>
      splitProportionally(100, [{ userId: "a", weight: -1 }]),
    ).toThrow();
  });
});

describe("buildSplitShares", () => {
  it("keeps equal splits deterministic", () => {
    expect(
      sharesOf(
        buildSplitShares({
          totalPaise: 100,
          mode: "equal",
          participants: users.map((userId) => ({ userId })),
        }),
      ),
    ).toEqual({ a: 34, b: 33, c: 33 });
  });

  it("accepts exact amounts that add up to the total", () => {
    const result = buildSplitShares({
      totalPaise: 100_000,
      mode: "amount",
      participants: [
        { userId: "a", value: "600" },
        { userId: "b", value: "300.50" },
        { userId: "c", value: "99.50" },
      ],
    });

    expect(sharesOf(result)).toEqual({ a: 60_000, b: 30_050, c: 9_950 });
    if ("error" in result) throw new Error(result.error);
    expect(result.splits.every((split) => split.splitValue === null)).toBe(true);
  });

  it("allows a zero exact amount", () => {
    expect(
      sharesOf(
        buildSplitShares({
          totalPaise: 1_000,
          mode: "amount",
          participants: [
            { userId: "a", value: "10" },
            { userId: "b", value: "0" },
          ],
        }),
      ),
    ).toEqual({ a: 1000, b: 0 });
  });

  it("rejects exact amounts that do not match the total", () => {
    const short = buildSplitShares({
      totalPaise: 10_000,
      mode: "amount",
      participants: [
        { userId: "a", value: "40" },
        { userId: "b", value: "50" },
      ],
    });
    expect(short).toEqual({
      error: "Exact amounts must add up to ₹100.00 (currently ₹90.00).",
    });

    const over = buildSplitShares({
      totalPaise: 10_000,
      mode: "amount",
      participants: [
        { userId: "a", value: "60" },
        { userId: "b", value: "50" },
      ],
    });
    expect(over).toEqual({
      error: "Exact amounts must add up to ₹100.00 (currently ₹110.00).",
    });
  });

  it("rejects invalid exact amounts", () => {
    expect(
      buildSplitShares({
        totalPaise: 10_000,
        mode: "amount",
        participants: [
          { userId: "a", value: "abc" },
          { userId: "b", value: "10000" },
        ],
      }),
    ).toEqual({ error: "Enter a valid amount for every selected person." });
  });

  it("splits by percentages and stores the percentages", () => {
    const result = buildSplitShares({
      totalPaise: 100_000,
      mode: "percentage",
      participants: [
        { userId: "a", value: "50" },
        { userId: "b", value: "30" },
        { userId: "c", value: "20" },
      ],
    });

    expect(sharesOf(result)).toEqual({ a: 50_000, b: 30_000, c: 20_000 });
    if ("error" in result) throw new Error(result.error);
    expect(result.splits.map((split) => split.splitValue)).toEqual([
      50, 30, 20,
    ]);
  });

  it("handles percentages with decimals and rounding", () => {
    const result = buildSplitShares({
      totalPaise: 100,
      mode: "percentage",
      participants: [
        { userId: "a", value: "33.33" },
        { userId: "b", value: "33.33" },
        { userId: "c", value: "33.34" },
      ],
    });

    expect(sharesOf(result)).toEqual({ a: 33, b: 33, c: 34 });
    if ("error" in result) throw new Error(result.error);
    expect(result.splits.map((split) => split.splitValue)).toEqual([
      33.33, 33.33, 33.34,
    ]);
  });

  it("rejects percentages that do not add up to 100", () => {
    expect(
      buildSplitShares({
        totalPaise: 10_000,
        mode: "percentage",
        participants: [
          { userId: "a", value: "33.33" },
          { userId: "b", value: "33.33" },
          { userId: "c", value: "33.33" },
        ],
      }),
    ).toEqual({ error: "Percentages must add up to 100% (currently 99.99%)." });
  });

  it("rejects a percentage above 100", () => {
    expect(
      buildSplitShares({
        totalPaise: 10_000,
        mode: "percentage",
        participants: [
          { userId: "a", value: "100.01" },
          { userId: "b", value: "0" },
        ],
      }),
    ).toEqual({ error: "Enter a percentage between 0 and 100 for every person." });
  });

  it("splits by shares and stores the weights", () => {
    const result = buildSplitShares({
      totalPaise: 90_000,
      mode: "shares",
      participants: [
        { userId: "a", value: "2" },
        { userId: "b", value: "1" },
      ],
    });

    expect(sharesOf(result)).toEqual({ a: 60_000, b: 30_000 });
    if ("error" in result) throw new Error(result.error);
    expect(result.splits.map((split) => split.splitValue)).toEqual([2, 1]);
  });

  it("supports fractional shares", () => {
    expect(
      sharesOf(
        buildSplitShares({
          totalPaise: 100,
          mode: "shares",
          participants: [
            { userId: "a", value: "1.5" },
            { userId: "b", value: "0.5" },
          ],
        }),
      ),
    ).toEqual({ a: 75, b: 25 });
  });

  it("rejects shares when nobody has a positive weight", () => {
    expect(
      buildSplitShares({
        totalPaise: 10_000,
        mode: "shares",
        participants: [
          { userId: "a", value: "0" },
          { userId: "b", value: "0" },
        ],
      }),
    ).toEqual({ error: "Add at least one share greater than 0." });
  });

  it("deduplicates people and requires a participant", () => {
    expect(
      sharesOf(
        buildSplitShares({
          totalPaise: 100,
          mode: "equal",
          participants: [
            { userId: "a" },
            { userId: "a" },
            { userId: "b" },
          ],
        }),
      ),
    ).toEqual({ a: 50, b: 50 });

    expect(
      buildSplitShares({ totalPaise: 100, mode: "equal", participants: [] }),
    ).toEqual({ error: "Select at least one person to split with." });
  });
});

describe("buildDefaultSplitValues", () => {
  it("returns empty values for equal splits", () => {
    expect(buildDefaultSplitValues("equal", 10_000, users)).toEqual({});
  });

  it("creates exact amounts that sum to the total", () => {
    expect(buildDefaultSplitValues("amount", 10_000, users)).toEqual({
      a: "33.34",
      b: "33.33",
      c: "33.33",
    });
  });

  it("creates percentages that sum to 100", () => {
    expect(buildDefaultSplitValues("percentage", 10_000, users)).toEqual({
      a: "33.34",
      b: "33.33",
      c: "33.33",
    });
  });

  it("starts every share at one", () => {
    expect(buildDefaultSplitValues("shares", 10_000, users)).toEqual({
      a: "1",
      b: "1",
      c: "1",
    });
  });
});
