import { describe, expect, it } from "vitest";

import {
  compareActivity,
  expenseMatchesMember,
  paginateActivity,
  settlementMatchesMember,
  summarizeActivityAmounts,
  type ActivityExpenseSource,
  type ActivitySettlementSource,
  type SortableActivity,
} from "./activity";

function expense(
  overrides: Partial<ActivityExpenseSource> = {},
): ActivityExpenseSource {
  return {
    id: "e1",
    groupId: "g1",
    title: "Dinner",
    amountPaise: 10_000,
    paidBy: "u1",
    category: "food",
    spentAt: "2026-11-10",
    notes: null,
    createdBy: "u1",
    createdAt: "2026-11-10T10:00:00.000Z",
    splitMode: "equal",
    ...overrides,
  };
}

function settlement(
  overrides: Partial<ActivitySettlementSource> = {},
): ActivitySettlementSource {
  return {
    id: "s1",
    groupId: "g1",
    fromUser: "u2",
    toUser: "u1",
    amountPaise: 5_000,
    method: "upi",
    note: null,
    settledAt: "2026-11-11",
    createdBy: "u2",
    createdAt: "2026-11-11T10:00:00.000Z",
    ...overrides,
  };
}

function sortable(
  overrides: Partial<SortableActivity> = {},
): SortableActivity {
  return {
    id: "e1",
    kind: "expense",
    date: "2026-11-10",
    createdAt: "2026-11-10T10:00:00.000Z",
    amountPaise: 10_000,
    ...overrides,
  };
}

describe("member matching", () => {
  it("treats a missing member filter as everyone", () => {
    expect(expenseMatchesMember(expense(), null, new Set())).toBe(true);
    expect(settlementMatchesMember(settlement(), null)).toBe(true);
  });

  it("matches expenses where the member paid or holds a split", () => {
    expect(expenseMatchesMember(expense(), "u1", new Set())).toBe(true);
    expect(expenseMatchesMember(expense(), "u2", new Set(["e1"]))).toBe(true);
    expect(expenseMatchesMember(expense(), "u3", new Set(["e2"]))).toBe(false);
  });

  it("matches settlements on either side of the payment", () => {
    expect(settlementMatchesMember(settlement(), "u2")).toBe(true);
    expect(settlementMatchesMember(settlement(), "u1")).toBe(true);
    expect(settlementMatchesMember(settlement(), "u3")).toBe(false);
  });
});

describe("compareActivity", () => {
  it("sorts newest first, breaking ties on when the row was recorded", () => {
    const older = sortable({ id: "a", date: "2026-11-09" });
    const sameDayEarlier = sortable({
      id: "b",
      date: "2026-11-10",
      createdAt: "2026-11-10T09:00:00.000Z",
    });
    const sameDayLater = sortable({
      id: "c",
      date: "2026-11-10",
      createdAt: "2026-11-10T12:00:00.000Z",
    });

    expect(
      [older, sameDayEarlier, sameDayLater].sort((a, b) =>
        compareActivity(a, b, "newest"),
      ),
    ).toEqual([sameDayLater, sameDayEarlier, older]);
  });

  it("reverses direction for oldest first", () => {
    const first = sortable({ id: "a", date: "2026-11-09" });
    const second = sortable({ id: "b", date: "2026-11-10" });

    expect(
      [second, first].sort((a, b) => compareActivity(a, b, "oldest")),
    ).toEqual([first, second]);
  });

  it("puts the largest amount first and keeps deterministic tie-breaks", () => {
    const small = sortable({ id: "a", amountPaise: 1_000 });
    const largeOld = sortable({
      id: "b",
      amountPaise: 50_000,
      date: "2026-11-01",
    });
    const largeNew = sortable({
      id: "c",
      amountPaise: 50_000,
      date: "2026-11-05",
    });

    expect(
      [small, largeOld, largeNew].sort((a, b) =>
        compareActivity(a, b, "amount"),
      ),
    ).toEqual([largeNew, largeOld, small]);
  });
});

describe("summarizeActivityAmounts", () => {
  it("keeps settlements out of the expenditure total", () => {
    const result = summarizeActivityAmounts(
      [
        expense({ id: "e1", amountPaise: 10_000, category: "food" }),
        expense({ id: "e2", amountPaise: 5_000, category: "food" }),
        expense({ id: "e3", amountPaise: 20_000, category: "travel" }),
      ],
      [
        settlement({ id: "s1", amountPaise: 4_000 }),
        settlement({ id: "s2", amountPaise: 6_000 }),
      ],
    );

    expect(result.totalSpentPaise).toBe(35_000);
    expect(result.expenseCount).toBe(3);
    expect(result.totalSettledPaise).toBe(10_000);
    expect(result.settlementCount).toBe(2);
  });

  it("ranks categories by amount and reports their share of spend", () => {
    const result = summarizeActivityAmounts(
      [
        expense({ id: "e1", amountPaise: 10_000, category: "food" }),
        expense({ id: "e2", amountPaise: 5_000, category: "food" }),
        expense({ id: "e3", amountPaise: 20_000, category: "travel" }),
      ],
      [],
    );

    expect(result.categoryTotals.map((entry) => entry.category)).toEqual([
      "travel",
      "food",
    ]);
    expect(result.categoryTotals[0]).toMatchObject({
      amountPaise: 20_000,
      count: 1,
      fraction: 20_000 / 35_000,
    });
    expect(result.categoryTotals[1]).toMatchObject({
      amountPaise: 15_000,
      count: 2,
      fraction: 15_000 / 35_000,
    });
  });

  it("returns a zero summary for an empty ledger", () => {
    const result = summarizeActivityAmounts([], []);

    expect(result).toEqual({
      totalSpentPaise: 0,
      expenseCount: 0,
      totalSettledPaise: 0,
      settlementCount: 0,
      categoryTotals: [],
    });
  });
});

describe("paginateActivity", () => {
  const items = Array.from({ length: 45 }, (_, index) => index + 1);

  it("slices the requested page and reports its range", () => {
    expect(paginateActivity(items, 1, 20)).toEqual({
      items: items.slice(0, 20),
      page: 1,
      pageCount: 3,
      totalCount: 45,
      from: 1,
      to: 20,
    });

    expect(paginateActivity(items, 3, 20)).toMatchObject({
      items: items.slice(40),
      page: 3,
      from: 41,
      to: 45,
    });
  });

  it("clamps out-of-range pages to real pages", () => {
    expect(paginateActivity(items, 99, 20)).toMatchObject({
      page: 3,
      from: 41,
      to: 45,
    });
    expect(paginateActivity(items, 0, 20).page).toBe(1);
    expect(paginateActivity(items, -3, 20).page).toBe(1);
  });

  it("handles an empty result without dividing by zero", () => {
    expect(paginateActivity([], 1, 20)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      totalCount: 0,
      from: 0,
      to: 0,
    });
  });
});
