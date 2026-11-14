import { describe, expect, it } from "vitest";

import {
  arePollResultsLocked,
  defaultPollDeadline,
  fromDateTimeLocalValue,
  isValidPollImageUrl,
  percentageSplit,
  pollTiming,
  pollWinnerIds,
  toDateTimeLocalValue,
  validatePollDraft,
} from "@/lib/polls";

const NOW = new Date("2026-11-15T10:00:00.000Z");

describe("percentageSplit", () => {
  it("returns zeroes when nobody voted", () => {
    expect(percentageSplit([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it("always totals 100 and gives the leftover point to the largest remainder", () => {
    const shares = percentageSplit([1, 1, 1]);
    expect(shares.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(shares.sort()).toEqual([33, 33, 34]);
  });

  it("keeps clear majorities intact", () => {
    expect(percentageSplit([4, 1])).toEqual([80, 20]);
  });

  it("handles a single option", () => {
    expect(percentageSplit([7])).toEqual([100]);
  });
});

describe("pollWinnerIds", () => {
  it("returns no winner when nobody voted", () => {
    expect(pollWinnerIds([{ id: "a", count: 0 }, { id: "b", count: 0 }])).toEqual(
      [],
    );
  });

  it("returns the unique leader", () => {
    expect(
      pollWinnerIds([
        { id: "a", count: 1 },
        { id: "b", count: 5 },
        { id: "c", count: 2 },
      ]),
    ).toEqual(["b"]);
  });

  it("returns every option in a tie", () => {
    expect(
      pollWinnerIds([
        { id: "a", count: 3 },
        { id: "b", count: 3 },
        { id: "c", count: 1 },
      ]),
    ).toEqual(["a", "b"]);
  });
});

describe("arePollResultsLocked", () => {
  const base = { hasVoted: false, isManager: false } as const;

  it("never locks a closed poll", () => {
    expect(
      arePollResultsLocked({
        ...base,
        status: "closed",
        visibility: "after_close",
      }),
    ).toBe(false);
  });

  it("unlocks after_vote only for someone who voted", () => {
    expect(
      arePollResultsLocked({
        ...base,
        status: "open",
        visibility: "after_vote",
      }),
    ).toBe(true);
    expect(
      arePollResultsLocked({
        ...base,
        hasVoted: true,
        status: "open",
        visibility: "after_vote",
      }),
    ).toBe(false);
  });

  it("keeps after_close hidden while voting is open", () => {
    expect(
      arePollResultsLocked({
        ...base,
        hasVoted: true,
        status: "open",
        visibility: "after_close",
      }),
    ).toBe(true);
  });

  it("lets a manager see progress while voting is open", () => {
    expect(
      arePollResultsLocked({
        ...base,
        isManager: true,
        status: "open",
        visibility: "after_close",
      }),
    ).toBe(false);
  });
});

describe("pollTiming", () => {
  it("counts down in minutes, hours, and days", () => {
    expect(
      pollTiming("2026-11-15T10:20:00.000Z", "open", NOW).label,
    ).toBe("Closes in 20 min");
    expect(
      pollTiming("2026-11-15T14:00:00.000Z", "open", NOW).label,
    ).toBe("Closes in 4 hours");
    expect(
      pollTiming("2026-11-18T10:00:00.000Z", "open", NOW).label,
    ).toBe("Closes in 3 days");
  });

  it("flags the final 24 hours", () => {
    expect(
      pollTiming("2026-11-16T09:00:00.000Z", "open", NOW).isClosingSoon,
    ).toBe(true);
    expect(
      pollTiming("2026-11-18T10:00:00.000Z", "open", NOW).isClosingSoon,
    ).toBe(false);
  });

  it("treats an expired open poll as closed", () => {
    const timing = pollTiming("2026-11-15T09:59:00.000Z", "open", NOW);
    expect(timing.label).toBe("Voting closed");
    expect(timing.isExpired).toBe(true);
  });

  it("labels cancelled and closed polls", () => {
    expect(
      pollTiming("2026-11-18T10:00:00.000Z", "cancelled", NOW).label,
    ).toBe("Poll cancelled");
    expect(pollTiming("2026-11-18T10:00:00.000Z", "closed", NOW).label).toBe(
      "Voting closed",
    );
  });
});

describe("datetime-local helpers", () => {
  it("round-trips a local value", () => {
    const iso = toDateTimeLocalValue("2026-11-18T10:30:00.000Z");
    expect(fromDateTimeLocalValue(iso)).toBe("2026-11-18T10:30:00.000Z");
  });

  it("returns null for empty or invalid values", () => {
    expect(fromDateTimeLocalValue("")).toBeNull();
    expect(fromDateTimeLocalValue("not-a-date")).toBeNull();
  });

  it("offers a future default deadline", () => {
    const value = defaultPollDeadline(NOW);
    const parsed = fromDateTimeLocalValue(value);
    expect(parsed).not.toBeNull();
    expect(new Date(parsed as string).getTime()).toBeGreaterThan(NOW.getTime());
  });
});

describe("isValidPollImageUrl", () => {
  it("accepts http and https image links", () => {
    expect(isValidPollImageUrl("https://example.com/a.jpg")).toBe(true);
    expect(isValidPollImageUrl("http://example.com/a.jpg")).toBe(true);
  });

  it("rejects other schemes and blank values", () => {
    expect(isValidPollImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidPollImageUrl("ftp://example.com/a.jpg")).toBe(false);
    expect(isValidPollImageUrl("")).toBe(false);
  });
});

describe("validatePollDraft", () => {
  const draft = {
    title: "Where should we eat?",
    description: "Pick one for Friday.",
    closesAt: "2026-11-18T10:00",
    selection: "single" as const,
    anonymous: false,
    resultsVisibility: "after_vote" as const,
    options: [
      { label: "Pizza" },
      { label: "Sushi" },
      { label: "Thali", imageUrl: "https://example.com/thali.jpg" },
    ],
  };

  it("accepts a complete draft", () => {
    expect(validatePollDraft(draft, NOW)).toBeNull();
  });

  it("requires a meaningful title", () => {
    expect(validatePollDraft({ ...draft, title: "  x  " }, NOW)).toMatch(
      /at least 3/,
    );
  });

  it("requires a future deadline", () => {
    expect(
      validatePollDraft({ ...draft, closesAt: "2026-11-15T09:00" }, NOW),
    ).toMatch(/future/);
  });

  it("requires two distinct option labels", () => {
    expect(
      validatePollDraft(
        { ...draft, options: [{ label: "Pizza" }, { label: "pizza" }] },
        NOW,
      ),
    ).toMatch(/different/);
    expect(
      validatePollDraft({ ...draft, options: [{ label: "Pizza" }] }, NOW),
    ).toMatch(/at least two/);
  });

  it("rejects unsafe image links", () => {
    expect(
      validatePollDraft(
        {
          ...draft,
          options: [
            { label: "Pizza", imageUrl: "javascript:alert(1)" },
            { label: "Sushi" },
          ],
        },
        NOW,
      ),
    ).toMatch(/http/);
  });
});
