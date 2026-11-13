import { describe, expect, it } from "vitest";

import {
  buildOutstandingEntries,
  computeDashboardAnalytics,
  type AnalyticsExpense,
  type AnalyticsInput,
  type AnalyticsSettlement,
  type AnalyticsFilters,
  type GroupNetSnapshot,
} from "./analytics";

const USER = "u1";

const people: Record<string, string> = {
  u1: "You",
  u2: "Ravi",
  u3: "Meera",
};

const filters: AnalyticsFilters = {
  from: null,
  to: null,
  groupId: null,
  category: null,
  granularity: "monthly",
};

const snapshots: GroupNetSnapshot[] = [
  {
    group: { id: "g1", name: "Goa", emoji: "🏖️", canEdit: true },
    // e1 +20,000, e2 -4,000, e3 -6,000, e4 +6,000, s1 -5,000 = +11,000
    memberNetPaise: { u1: 11_000, u2: -7_000, u3: -4_000 },
  },
  {
    group: { id: "g2", name: "Flat", emoji: "🏠", canEdit: false },
    // e5 -20,000, e6 +3,000, s2 +7,000 = -10,000
    memberNetPaise: { u1: -10_000, u2: 10_000 },
  },
];

const expenses: AnalyticsExpense[] = [
  {
    id: "e1",
    groupId: "g1",
    title: "Beach hotel",
    amountPaise: 30_000,
    paidBy: "u1",
    category: "travel",
    spentAt: "2026-10-05",
    createdAt: "2026-10-05T10:00:00.000Z",
    splitMode: "equal",
    splits: [
      { userId: "u1", sharePaise: 10_000 },
      { userId: "u2", sharePaise: 10_000 },
      { userId: "u3", sharePaise: 10_000 },
    ],
  },
  {
    id: "e2",
    groupId: "g1",
    title: "Dinner",
    amountPaise: 12_000,
    paidBy: "u2",
    category: "food",
    spentAt: "2026-10-20",
    createdAt: "2026-10-20T10:00:00.000Z",
    splitMode: "amount",
    splits: [
      { userId: "u1", sharePaise: 4_000 },
      { userId: "u2", sharePaise: 4_000 },
      { userId: "u3", sharePaise: 4_000 },
    ],
  },
  {
    id: "e3",
    groupId: "g1",
    title: "Cab",
    amountPaise: 10_000,
    paidBy: "u3",
    category: "travel",
    spentAt: "2026-11-02",
    createdAt: "2026-11-02T10:00:00.000Z",
    splitMode: "percentage",
    splits: [
      { userId: "u1", sharePaise: 6_000 },
      { userId: "u2", sharePaise: 4_000 },
    ],
  },
  {
    id: "e4",
    groupId: "g1",
    title: "Souvenirs",
    amountPaise: 8_000,
    paidBy: "u1",
    category: "shopping",
    spentAt: "2026-09-15",
    createdAt: "2026-09-15T10:00:00.000Z",
    splitMode: "shares",
    splits: [
      { userId: "u1", sharePaise: 2_000 },
      { userId: "u2", sharePaise: 6_000 },
    ],
  },
  {
    id: "e5",
    groupId: "g2",
    title: "November rent",
    amountPaise: 40_000,
    paidBy: "u2",
    category: "rent",
    spentAt: "2026-11-10",
    createdAt: "2026-11-10T10:00:00.000Z",
    splitMode: "equal",
    splits: [
      { userId: "u1", sharePaise: 20_000 },
      { userId: "u2", sharePaise: 20_000 },
    ],
  },
  {
    id: "e6",
    groupId: "g2",
    title: "Electricity",
    amountPaise: 6_000,
    paidBy: "u1",
    category: "utilities",
    spentAt: "2026-11-12",
    createdAt: "2026-11-12T10:00:00.000Z",
    splitMode: "equal",
    splits: [
      { userId: "u1", sharePaise: 3_000 },
      { userId: "u2", sharePaise: 3_000 },
    ],
  },
];

const settlements: AnalyticsSettlement[] = [
  {
    id: "s1",
    groupId: "g1",
    fromUser: "u2",
    toUser: "u1",
    amountPaise: 5_000,
    settledAt: "2026-10-25",
    method: "upi",
  },
  {
    id: "s2",
    groupId: "g2",
    fromUser: "u1",
    toUser: "u2",
    amountPaise: 7_000,
    settledAt: "2026-11-13",
    method: "cash",
  },
];

function makeInput(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    userId: USER,
    expenses,
    settlements,
    snapshots,
    people,
    filters,
    ...overrides,
  };
}

describe("computeDashboardAnalytics", () => {
  it("summarises paid, personal share, averages and the paid-vs-share gap", () => {
    const result = computeDashboardAnalytics(makeInput());

    expect(result.overview).toEqual({
      totalPaidPaise: 44_000,
      personalSharePaise: 45_000,
      totalSpentPaise: 106_000,
      averageExpensePaise: 17_667,
      averageSharePaise: 7_500,
      expenseCount: 6,
    });
    expect(result.comparison).toEqual({
      paidPaise: 44_000,
      sharePaise: 45_000,
      differencePaise: -1_000,
    });
  });

  it("builds a continuous monthly trend and a single yearly bucket", () => {
    const monthly = computeDashboardAnalytics(makeInput());

    expect(monthly.trend.points.map((point) => point.key)).toEqual([
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(monthly.trend.points.map((point) => point.label)).toEqual([
      "Sep 26",
      "Oct 26",
      "Nov 26",
    ]);
    expect(
      monthly.trend.points.reduce((sum, point) => sum + point.paidPaise, 0),
    ).toBe(44_000);
    expect(
      monthly.trend.points.reduce((sum, point) => sum + point.sharePaise, 0),
    ).toBe(45_000);
    expect(monthly.trend.maxPaise).toBe(30_000);

    const yearly = computeDashboardAnalytics(
      makeInput({ filters: { ...filters, granularity: "yearly" } }),
    );
    expect(yearly.trend.points).toHaveLength(1);
    expect(yearly.trend.points[0]).toMatchObject({
      key: "2026",
      label: "2026",
      paidPaise: 44_000,
      sharePaise: 45_000,
    });
  });

  it("splits the personal share across categories and groups without losing a paisa", () => {
    const result = computeDashboardAnalytics(makeInput());

    expect(result.categories.slices.map((slice) => slice.category)).toEqual([
      "rent",
      "travel",
      "food",
      "utilities",
      "shopping",
    ]);
    expect(
      result.categories.slices.reduce(
        (sum, slice) => sum + slice.sharePaise,
        0,
      ),
    ).toBe(45_000);
    expect(result.categories.totalSharePaise).toBe(45_000);
    expect(
      result.categories.slices.find((slice) => slice.category === "travel"),
    ).toMatchObject({ sharePaise: 16_000, paidPaise: 30_000, count: 2 });

    expect(result.groups.slices).toHaveLength(2);
    expect(
      result.groups.slices.find((slice) => slice.groupId === "g1"),
    ).toMatchObject({
      name: "Goa",
      sharePaise: 22_000,
      paidPaise: 38_000,
      count: 4,
    });
    expect(
      result.groups.slices.reduce((sum, slice) => sum + slice.sharePaise, 0),
    ).toBe(45_000);
  });

  it("applies date, group and category filters to flow but keeps live balances", () => {
    const october = computeDashboardAnalytics(
      makeInput({ filters: { ...filters, from: "2026-10-01", to: "2026-10-31" } }),
    );
    expect(october.overview).toMatchObject({
      totalPaidPaise: 30_000,
      personalSharePaise: 14_000,
      expenseCount: 2,
    });
    // Balances ignore the date range on purpose.
    expect(october.balances).toEqual({
      youOwePaise: 10_000,
      youAreOwedPaise: 11_000,
      netOutstandingPaise: 1_000,
      groupCount: 2,
    });

    const flat = computeDashboardAnalytics(
      makeInput({ filters: { ...filters, groupId: "g2" } }),
    );
    expect(flat.overview).toMatchObject({
      totalPaidPaise: 6_000,
      personalSharePaise: 23_000,
      expenseCount: 2,
    });
    expect(flat.balances).toMatchObject({
      youOwePaise: 10_000,
      youAreOwedPaise: 0,
      netOutstandingPaise: -10_000,
      groupCount: 1,
    });
    expect(flat.outstanding).toHaveLength(1);
    expect(flat.outstanding[0]).toMatchObject({
      groupId: "g2",
      memberId: "u2",
      amountPaise: -10_000,
      kind: "payable",
    });

    const travel = computeDashboardAnalytics(
      makeInput({ filters: { ...filters, category: "travel" } }),
    );
    expect(travel.overview).toMatchObject({
      totalPaidPaise: 30_000,
      personalSharePaise: 16_000,
      expenseCount: 2,
    });
    // Category filters also hide settlements from the activity feed.
    expect(
      travel.activity.every((entry) => entry.kind === "expense"),
    ).toBe(true);
    expect(travel.activity).toHaveLength(2);
  });

  it("counts an excluded member's payment without inventing a share", () => {
    const result = computeDashboardAnalytics(
      makeInput({
        userId: "u3",
        filters: { ...filters, groupId: "g1" },
      }),
    );

    // Meera paid the cab but was excluded from its split, so she has no share
    // in that expense. Her paid total still includes it.
    expect(result.overview.totalPaidPaise).toBe(10_000);
    expect(result.overview.personalSharePaise).toBe(14_000);
    expect(
      result.activity.find((entry) => entry.title === "Cab"),
    ).toMatchObject({ userSharePaise: null, isUserPayer: true });
    expect(
      result.trend.points.find((point) => point.key === "2026-11"),
    ).toMatchObject({ paidPaise: 10_000 });
  });

  it("builds outstanding entries that reconcile with group nets", () => {
    const entries = buildOutstandingEntries(snapshots, USER, people);
    const owed = entries
      .filter((entry) => entry.amountPaise > 0)
      .reduce((sum, entry) => sum + entry.amountPaise, 0);
    const owes = entries
      .filter((entry) => entry.amountPaise < 0)
      .reduce((sum, entry) => sum + -entry.amountPaise, 0);

    expect(owed).toBe(11_000);
    expect(owes).toBe(10_000);
    expect(owed - owes).toBe(1_000);
    expect(entries[0]).toMatchObject({
      kind: "payable",
      groupName: "Flat",
      memberName: "Ravi",
      amountPaise: -10_000,
    });
    expect(entries.find((entry) => entry.kind === "receivable" && entry.groupId === "g1"))
      .toMatchObject({ memberName: "Ravi", amountPaise: 7_000 });
  });

  it("reflects a partial settlement in balances without changing spending totals", () => {
    const before = computeDashboardAnalytics(
      makeInput({
        snapshots: [
          {
            group: snapshots[0].group,
            memberNetPaise: { u1: 16_000, u2: -12_000, u3: -4_000 },
          },
        ],
      }),
    );
    const after = computeDashboardAnalytics(makeInput({ snapshots: [snapshots[0]] }));

    expect(before.balances.youAreOwedPaise).toBe(16_000);
    expect(after.balances.youAreOwedPaise).toBe(11_000);
    expect(after.overview.totalPaidPaise).toBe(before.overview.totalPaidPaise);
    expect(after.overview.personalSharePaise).toBe(
      before.overview.personalSharePaise,
    );
  });

  it("lists recent expenses and settlements with each expense's own share", () => {
    const result = computeDashboardAnalytics(makeInput());

    expect(result.activity).toHaveLength(8);
    expect(result.activity[0]).toMatchObject({
      kind: "settlement",
      direction: "out",
      date: "2026-11-13",
      amountPaise: 7_000,
    });
    expect(result.activity[1]).toMatchObject({
      kind: "expense",
      title: "Electricity",
      userSharePaise: 3_000,
      isUserPayer: true,
    });
    expect(
      result.activity.find((entry) => entry.title === "Dinner"),
    ).toMatchObject({ userSharePaise: 4_000, isUserPayer: false });

    const received = computeDashboardAnalytics(
      makeInput({ filters: { ...filters, from: "2026-10-25", to: "2026-10-25" } }),
    );
    expect(received.activity).toHaveLength(1);
    expect(received.activity[0]).toMatchObject({
      kind: "settlement",
      direction: "in",
      amountPaise: 5_000,
    });
  });

  it("returns a calm empty state for a brand-new account", () => {
    const result = computeDashboardAnalytics({
      userId: USER,
      expenses: [],
      settlements: [],
      snapshots: [],
      people,
      filters,
    });

    expect(result.hasAnyExpenses).toBe(false);
    expect(result.hasAnyLedger).toBe(false);
    expect(result.hasFilteredData).toBe(false);
    expect(result.overview.expenseCount).toBe(0);
    expect(result.trend.points).toEqual([]);
    expect(result.categories.slices).toEqual([]);
    expect(result.groups.slices).toEqual([]);
    expect(result.activity).toEqual([]);
    expect(result.outstanding).toEqual([]);
    expect(result.balances.netOutstandingPaise).toBe(0);
  });
});
