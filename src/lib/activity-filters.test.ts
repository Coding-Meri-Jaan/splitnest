import { describe, expect, it } from "vitest";

import {
  ACTIVITY_PAGE_SIZE,
  activityHref,
  activitySearchParams,
  hasActiveActivityFilters,
  resolveActivityFilters,
  type ActivityFilterState,
} from "./activity-filters";

const NOW = new Date("2026-11-14T09:30:00.000Z");
const MEMBERS = new Set(["u1", "u2", "u3"]);

const defaults: ActivityFilterState = {
  kind: "all",
  memberId: null,
  category: null,
  range: "all",
  from: null,
  to: null,
  sort: "newest",
};

describe("resolveActivityFilters", () => {
  it("falls back to safe defaults for empty or bogus params", () => {
    expect(
      resolveActivityFilters(
        {
          kind: "nonsense",
          member: "stranger",
          category: "teleport",
          range: "someday",
          sort: "sideways",
          page: "-4",
        },
        NOW,
        MEMBERS,
      ),
    ).toEqual({ ...defaults, page: 1 });
  });

  it("accepts known filters and narrows the date window", () => {
    expect(
      resolveActivityFilters(
        {
          kind: "expense",
          member: "u2",
          category: "food",
          range: "last-30",
          sort: "amount",
          page: "3",
        },
        NOW,
        MEMBERS,
      ),
    ).toEqual({
      kind: "expense",
      memberId: "u2",
      category: "food",
      range: "last-30",
      from: "2026-10-16",
      to: "2026-11-14",
      sort: "amount",
      page: 3,
    });
  });

  it("drops a category when the timeline narrows to settlements", () => {
    const resolved = resolveActivityFilters(
      { kind: "settlement", category: "travel" },
      NOW,
      MEMBERS,
    );

    expect(resolved.kind).toBe("settlement");
    expect(resolved.category).toBeNull();
  });

  it("keeps a valid custom range and swaps reversed dates", () => {
    expect(
      resolveActivityFilters(
        { range: "custom", from: "2026-11-10", to: "2026-11-01" },
        NOW,
        MEMBERS,
      ),
    ).toMatchObject({
      range: "custom",
      from: "2026-11-01",
      to: "2026-11-10",
    });
  });

  it("collapses a custom range with no usable dates back to all time", () => {
    expect(
      resolveActivityFilters(
        { range: "custom", from: "not-a-date", to: "" },
        NOW,
        MEMBERS,
      ),
    ).toMatchObject({ range: "all", from: null, to: null });
  });

  it("clamps absurd page numbers instead of trusting them", () => {
    expect(
      resolveActivityFilters({ page: "999999" }, NOW, MEMBERS).page,
    ).toBe(10_000);
  });
});

describe("hasActiveActivityFilters", () => {
  it("is false only for the untouched timeline", () => {
    expect(hasActiveActivityFilters(defaults)).toBe(false);
    expect(hasActiveActivityFilters({ ...defaults, kind: "expense" })).toBe(
      true,
    );
    expect(hasActiveActivityFilters({ ...defaults, memberId: "u2" })).toBe(
      true,
    );
    expect(hasActiveActivityFilters({ ...defaults, category: "food" })).toBe(
      true,
    );
    expect(hasActiveActivityFilters({ ...defaults, range: "last-30" })).toBe(
      true,
    );
    expect(hasActiveActivityFilters({ ...defaults, sort: "amount" })).toBe(
      true,
    );
  });
});

describe("activitySearchParams", () => {
  it("omits defaults and page one so links stay short", () => {
    expect(activitySearchParams(defaults)).toBe("");
    expect(activitySearchParams(defaults, 1)).toBe("");
  });

  it("serialises filters and the requested page", () => {
    const search = activitySearchParams(
      {
        kind: "expense",
        memberId: "u2",
        category: "food",
        range: "custom",
        from: "2026-01-01",
        to: "2026-02-01",
        sort: "oldest",
      },
      2,
    );
    const params = new URLSearchParams(search);

    expect(params.get("kind")).toBe("expense");
    expect(params.get("member")).toBe("u2");
    expect(params.get("category")).toBe("food");
    expect(params.get("range")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-02-01");
    expect(params.get("sort")).toBe("oldest");
    expect(params.get("page")).toBe("2");
  });

  it("does not leak stale custom dates into other ranges", () => {
    expect(
      activitySearchParams({
        ...defaults,
        range: "last-30",
        from: "2026-01-01",
        to: "2026-01-31",
      }),
    ).toBe("range=last-30");
  });
});

describe("activityHref", () => {
  it("returns the bare timeline for defaults", () => {
    expect(activityHref(defaults)).toBe("/dashboard/activity");
  });

  it("builds a filtered, paginated URL", () => {
    expect(activityHref({ ...defaults, kind: "settlement" }, 2)).toBe(
      "/dashboard/activity?kind=settlement&page=2",
    );
  });
});

describe("ACTIVITY_PAGE_SIZE", () => {
  it("stays small enough for a readable timeline", () => {
    expect(ACTIVITY_PAGE_SIZE).toBeGreaterThan(0);
    expect(ACTIVITY_PAGE_SIZE).toBeLessThanOrEqual(50);
  });
});
