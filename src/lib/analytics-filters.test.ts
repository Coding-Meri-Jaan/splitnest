import { describe, expect, it } from "vitest";

import {
  resolveAnalyticsFilters,
  resolveDateRange,
  type DateRangeKey,
} from "./analytics-filters";

const NOW = new Date("2026-11-14T09:30:00.000Z");

describe("resolveDateRange", () => {
  it("returns an open range for all time", () => {
    expect(resolveDateRange("all", undefined, undefined, NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
  });

  it("starts this month on the first and ends today", () => {
    expect(resolveDateRange("this-month", undefined, undefined, NOW)).toEqual({
      range: "this-month",
      from: "2026-11-01",
      to: "2026-11-14",
    });
  });

  it("counts today inside the rolling windows", () => {
    expect(resolveDateRange("last-30", undefined, undefined, NOW)).toEqual({
      range: "last-30",
      from: "2026-10-16",
      to: "2026-11-14",
    });
    expect(resolveDateRange("last-90", undefined, undefined, NOW)).toEqual({
      range: "last-90",
      from: "2026-08-17",
      to: "2026-11-14",
    });
  });

  it("spans the calendar year to date", () => {
    expect(resolveDateRange("this-year", undefined, undefined, NOW)).toEqual({
      range: "this-year",
      from: "2026-01-01",
      to: "2026-11-14",
    });
  });

  it("covers the whole of last year", () => {
    expect(resolveDateRange("last-year", undefined, undefined, NOW)).toEqual({
      range: "last-year",
      from: "2025-01-01",
      to: "2025-12-31",
    });
  });

  it("keeps a valid custom range", () => {
    expect(
      resolveDateRange("custom", "2026-01-05", "2026-03-09", NOW),
    ).toEqual({
      range: "custom",
      from: "2026-01-05",
      to: "2026-03-09",
    });
  });

  it("accepts a one-sided custom range", () => {
    expect(resolveDateRange("custom", "2026-05-01", undefined, NOW)).toEqual({
      range: "custom",
      from: "2026-05-01",
      to: null,
    });
    expect(resolveDateRange("custom", undefined, "2026-05-31", NOW)).toEqual({
      range: "custom",
      from: null,
      to: "2026-05-31",
    });
  });

  it("swaps a reversed custom range instead of returning nothing", () => {
    expect(
      resolveDateRange("custom", "2026-09-30", "2026-09-01", NOW),
    ).toEqual({
      range: "custom",
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("falls back to all time when custom has no usable dates", () => {
    expect(resolveDateRange("custom", undefined, undefined, NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
    expect(resolveDateRange("custom", "", "", NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
    expect(
      resolveDateRange("custom", "not-a-date", "2026-13-01", NOW),
    ).toEqual({
      range: "all",
      from: null,
      to: null,
    });
  });

  it("rejects impossible calendar dates that JS would roll over", () => {
    expect(resolveDateRange("custom", "2026-02-31", undefined, NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
    expect(resolveDateRange("custom", "2026-04-31", undefined, NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
  });

  it("is not thrown off by unknown range keys", () => {
    expect(resolveDateRange("bogus" as DateRangeKey, undefined, undefined, NOW)).toEqual({
      range: "all",
      from: null,
      to: null,
    });
  });
});

describe("resolveAnalyticsFilters", () => {
  const groups = new Set(["g1", "g2"]);

  it("defaults to an unfiltered monthly view", () => {
    expect(resolveAnalyticsFilters({}, NOW, groups)).toEqual({
      range: "all",
      from: null,
      to: null,
      groupId: null,
      category: null,
      granularity: "monthly",
    });
  });

  it("keeps only known groups and categories", () => {
    expect(
      resolveAnalyticsFilters(
        { group: "g2", category: "food", view: "yearly" },
        NOW,
        groups,
      ),
    ).toMatchObject({
      groupId: "g2",
      category: "food",
      granularity: "yearly",
    });

    expect(
      resolveAnalyticsFilters(
        { group: "deleted-group", category: "not-a-category" },
        NOW,
        groups,
      ),
    ).toMatchObject({
      groupId: null,
      category: null,
      granularity: "monthly",
    });
  });

  it("treats an unknown period as all time", () => {
    expect(
      resolveAnalyticsFilters({ range: "last-decade" }, NOW, groups),
    ).toMatchObject({ range: "all", from: null, to: null });
  });

  it("passes custom dates through the resolver", () => {
    expect(
      resolveAnalyticsFilters(
        { range: "custom", from: "2026-02-01", to: "2026-02-28" },
        NOW,
        groups,
      ),
    ).toMatchObject({
      range: "custom",
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });
});
