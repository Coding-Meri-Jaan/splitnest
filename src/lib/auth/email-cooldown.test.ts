import { describe, expect, it } from "vitest";

import {
  EMAIL_SEND_COOLDOWN_SECONDS,
  cooldownMessage,
  formatCooldown,
  parseEmailCooldownSeconds,
  remainingCooldownSeconds,
} from "./email-cooldown";

describe("parseEmailCooldownSeconds", () => {
  it("reads the exact seconds Supabase reports", () => {
    expect(
      parseEmailCooldownSeconds(
        "For security purposes, you can only request this after 42 seconds.",
      ),
    ).toBe(42);
  });

  it("falls back to the configured window when no number is present", () => {
    expect(
      parseEmailCooldownSeconds(
        "For security purposes, you can only request this after a while.",
      ),
    ).toBe(EMAIL_SEND_COOLDOWN_SECONDS);
  });

  it("ignores unrelated rate-limit errors", () => {
    expect(parseEmailCooldownSeconds("email rate limit exceeded")).toBeNull();
    expect(parseEmailCooldownSeconds("Failed to fetch")).toBeNull();
  });
});

describe("formatCooldown", () => {
  it("uses seconds under a minute", () => {
    expect(formatCooldown(1)).toBe("1 second");
    expect(formatCooldown(42)).toBe("42 seconds");
  });

  it("uses whole minutes and mixed values", () => {
    expect(formatCooldown(60)).toBe("1 minute");
    expect(formatCooldown(125)).toBe("2m 5s");
  });

  it("never shows a negative value", () => {
    expect(formatCooldown(-5)).toBe("0 seconds");
  });
});

describe("cooldownMessage", () => {
  it("points at the inbox and spam folder instead of a dead end", () => {
    const message = cooldownMessage(42);

    expect(message).toContain("42 seconds");
    expect(message).toMatch(/inbox/i);
    expect(message).toMatch(/spam/i);
  });
});

describe("remainingCooldownSeconds", () => {
  it("counts down from the send time", () => {
    const sentAt = 1_700_000_000_000;

    expect(remainingCooldownSeconds(sentAt, sentAt)).toBe(
      EMAIL_SEND_COOLDOWN_SECONDS,
    );
    expect(remainingCooldownSeconds(sentAt, sentAt + 15_000)).toBe(45);
    expect(remainingCooldownSeconds(sentAt, sentAt + 90_000)).toBe(0);
  });

  it("treats a clock skew or missing marker as no wait", () => {
    const now = 1_700_000_000_000;

    expect(remainingCooldownSeconds(0, now)).toBe(0);
    expect(remainingCooldownSeconds(Number.NaN, now)).toBe(0);
    expect(remainingCooldownSeconds(now + 60_000, now)).toBe(
      EMAIL_SEND_COOLDOWN_SECONDS,
    );
  });
});
