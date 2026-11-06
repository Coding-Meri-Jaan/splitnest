import { describe, expect, it } from "vitest";

import {
  computeNetBalances,
  parseRupeesToPaise,
  parseRupeesToPaiseAllowZero,
  simplifyDebts,
  splitEqually,
} from "./money";

describe("parseRupeesToPaise", () => {
  it("parses plain, formatted and prefixed rupee amounts", () => {
    expect(parseRupeesToPaise("1234")).toBe(123_400);
    expect(parseRupeesToPaise("1,234.5")).toBe(123_450);
    expect(parseRupeesToPaise("₹ 1234.56")).toBe(123_456);
    expect(parseRupeesToPaise("0.01")).toBe(1);
  });

  it("rejects invalid or non-positive input", () => {
    expect(parseRupeesToPaise("")).toBeNull();
    expect(parseRupeesToPaise("0")).toBeNull();
    expect(parseRupeesToPaise("-50")).toBeNull();
    expect(parseRupeesToPaise("12.345")).toBeNull();
    expect(parseRupeesToPaise("abc")).toBeNull();
  });
});

describe("parseRupeesToPaiseAllowZero", () => {
  it("accepts zero for exact split amounts", () => {
    expect(parseRupeesToPaiseAllowZero("0")).toBe(0);
    expect(parseRupeesToPaiseAllowZero("0.00")).toBe(0);
    expect(parseRupeesToPaiseAllowZero("1,234.5")).toBe(123_450);
  });

  it("still rejects invalid input", () => {
    expect(parseRupeesToPaiseAllowZero("")).toBeNull();
    expect(parseRupeesToPaiseAllowZero("-1")).toBeNull();
    expect(parseRupeesToPaiseAllowZero("12.345")).toBeNull();
  });
});

describe("splitEqually", () => {
  it("splits evenly when the amount divides cleanly", () => {
    expect(splitEqually(90_000, ["a", "b", "c"])).toEqual({
      a: 30_000,
      b: 30_000,
      c: 30_000,
    });
  });

  it("distributes leftover paise without losing or inventing money", () => {
    const shares = splitEqually(10_000, ["c", "a", "b"]);

    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(10_000);
    expect(shares).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("is deterministic regardless of member order", () => {
    expect(splitEqually(1_001, ["z", "y", "x"])).toEqual(
      splitEqually(1_001, ["x", "y", "z"]),
    );
  });

  it("deduplicates members and ignores nothing", () => {
    expect(splitEqually(100, ["a", "a", "b"])).toEqual({ a: 50, b: 50 });
  });

  it("throws on empty members or non-positive totals", () => {
    expect(() => splitEqually(100, [])).toThrow();
    expect(() => splitEqually(0, ["a"])).toThrow();
  });
});

describe("computeNetBalances", () => {
  it("credits the payer and debits each share", () => {
    const net = computeNetBalances(
      [
        {
          paidBy: "a",
          amountPaise: 90_000,
          splits: [
            { userId: "a", sharePaise: 30_000 },
            { userId: "b", sharePaise: 30_000 },
            { userId: "c", sharePaise: 30_000 },
          ],
        },
      ],
      [],
    );

    expect(net).toEqual({ a: 60_000, b: -30_000, c: -30_000 });
  });

  it("nets settlements against expense debt", () => {
    const net = computeNetBalances(
      [
        {
          paidBy: "a",
          amountPaise: 60_000,
          splits: [
            { userId: "a", sharePaise: 30_000 },
            { userId: "b", sharePaise: 30_000 },
          ],
        },
      ],
      [{ fromUser: "b", toUser: "a", amountPaise: 30_000 }],
    );

    expect(net).toEqual({ a: 0, b: 0 });
  });

  it("always sums to zero", () => {
    const net = computeNetBalances(
      [
        {
          paidBy: "a",
          amountPaise: 10_001,
          splits: [
            { userId: "a", sharePaise: 3_334 },
            { userId: "b", sharePaise: 3_333 },
            { userId: "c", sharePaise: 3_334 },
          ],
        },
        {
          paidBy: "b",
          amountPaise: 5_000,
          splits: [
            { userId: "a", sharePaise: 2_500 },
            { userId: "b", sharePaise: 2_500 },
          ],
        },
      ],
      [{ fromUser: "c", toUser: "b", amountPaise: 1_000 }],
    );

    expect(Object.values(net).reduce((sum, value) => sum + value, 0)).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("produces one transfer per debtor when possible", () => {
    expect(simplifyDebts({ a: 60_000, b: -30_000, c: -30_000 })).toEqual([
      { fromUser: "b", toUser: "a", amountPaise: 30_000 },
      { fromUser: "c", toUser: "a", amountPaise: 30_000 },
    ]);
  });

  it("chains payments when a debtor owes two creditors", () => {
    expect(simplifyDebts({ a: 50_000, b: 25_000, c: -75_000 })).toEqual([
      { fromUser: "c", toUser: "a", amountPaise: 50_000 },
      { fromUser: "c", toUser: "b", amountPaise: 25_000 },
    ]);
  });

  it("returns nothing when everyone is settled", () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });

  it("leaves no debtor or creditor behind", () => {
    const net = { a: 12_345, b: -4_000, c: -8_345 };

    const transfers = simplifyDebts(net);
    const applied: Record<string, number> = { ...net };

    for (const transfer of transfers) {
      applied[transfer.fromUser] += transfer.amountPaise;
      applied[transfer.toUser] -= transfer.amountPaise;
    }

    expect(Object.values(applied).every((value) => value === 0)).toBe(true);
  });
});
