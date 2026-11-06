import { describe, expect, it } from "vitest";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "./password";

const STRONG = "SplitNest#2026";

describe("validatePassword", () => {
  it("accepts a password with every required class", () => {
    expect(validatePassword(STRONG)).toEqual({ valid: true });
  });

  it("requires the minimum length", () => {
    const result = validatePassword("Aa1!".padEnd(MIN_PASSWORD_LENGTH - 1, "x"));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/at least 10 characters/i);
    }
  });

  it("rejects a missing uppercase letter", () => {
    const result = validatePassword("splitnest#2026");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/uppercase/i);
    }
  });

  it("rejects a missing lowercase letter", () => {
    const result = validatePassword("SPLITNEST#2026");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/lowercase/i);
    }
  });

  it("rejects a missing number", () => {
    const result = validatePassword("SplitNest#abc");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/number/i);
    }
  });

  it("rejects a missing symbol", () => {
    const result = validatePassword("SplitNest2026");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/symbol/i);
    }
  });

  it("rejects passwords longer than bcrypt can hash", () => {
    const result = validatePassword(`${STRONG}${"x".repeat(MAX_PASSWORD_LENGTH)}`);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/72 characters or fewer/i);
    }
  });

  it("rejects common passwords even when they meet the character rules", () => {
    const result = validatePassword("Password123!");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/too common/i);
    }
  });

  it("rejects the person's email handle", () => {
    const result = validatePassword("Ananya#Split2026", {
      email: "ananya@example.org",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/name or email/i);
    }
  });

  it("rejects a name token", () => {
    const result = validatePassword("Sharma#Split2026", {
      name: "Ananya Sharma",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.message).toMatch(/name or email/i);
    }
  });
});
