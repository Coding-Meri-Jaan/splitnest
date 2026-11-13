import { describe, expect, it } from "vitest";

import {
  matchesSearch,
  normalizeSearchQuery,
  rankSearchResults,
  type SearchResult,
} from "./search";

function result(
  id: string,
  kind: SearchResult["kind"],
  title: string,
  extra: Partial<SearchResult> = {},
): SearchResult {
  return {
    id,
    kind,
    title,
    subtitle: "",
    href: `/dashboard/${kind}/${id}`,
    ...extra,
  };
}

describe("normalizeSearchQuery", () => {
  it("collapses whitespace and accepts the first URL value", () => {
    expect(normalizeSearchQuery("  goa   trip  ")).toBe("goa trip");
    expect(normalizeSearchQuery(["pizza", "dinner"])).toBe("pizza");
    expect(normalizeSearchQuery(undefined)).toBe("");
  });
});

describe("matchesSearch", () => {
  it("matches every word across different fields, case-insensitively", () => {
    expect(
      matchesSearch("goa pizza", ["Pizza night", "Goa Trip", "food"]),
    ).toBe(true);
    expect(matchesSearch("goa pizza", ["Pizza night", "Rishikesh"])).toBe(false);
  });

  it("ignores empty fields and returns false for an empty query", () => {
    expect(matchesSearch("asha", [null, undefined, "Asha Verma"])).toBe(true);
    expect(matchesSearch("   ", ["Asha Verma"])).toBe(false);
  });
});

describe("rankSearchResults", () => {
  it("puts exact and prefix title matches ahead of incidental mentions", () => {
    const ranked = rankSearchResults("goa", [
      result("expense-1", "expense", "Dinner", { date: "2026-11-01" }),
      result("group-1", "group", "Goa Trip"),
      result("group-2", "group", "Goa"),
    ]);

    expect(ranked.map((item) => item.id)).toEqual([
      "group-2",
      "group-1",
      "expense-1",
    ]);
  });

  it("keeps newest activity first when title scores tie", () => {
    const ranked = rankSearchResults("dinner", [
      result("old", "expense", "Dinner", { date: "2026-01-01" }),
      result("new", "expense", "Dinner", { date: "2026-11-01" }),
    ]);

    expect(ranked.map((item) => item.id)).toEqual(["new", "old"]);
  });
});
