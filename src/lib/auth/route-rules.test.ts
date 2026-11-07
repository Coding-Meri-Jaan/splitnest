import { describe, expect, it } from "vitest";

import {
  PROTECTED_PREFIXES,
  SIGNED_IN_REDIRECT_PREFIXES,
  UNVERIFIED_REDIRECT_PREFIXES,
  pathMatches,
} from "./route-rules";

describe("auth route rules", () => {
  it("keeps /signup open for a signed-in, verified person", () => {
    expect(pathMatches("/signup", SIGNED_IN_REDIRECT_PREFIXES)).toBe(false);
  });

  it("keeps /signup open for a signed-in, unverified person", () => {
    expect(pathMatches("/signup", UNVERIFIED_REDIRECT_PREFIXES)).toBe(false);
  });

  it("still sends signed-in people away from forgot-password", () => {
    expect(pathMatches("/forgot-password", SIGNED_IN_REDIRECT_PREFIXES)).toBe(
      true,
    );
  });

  it("still sends unverified people away from the dashboard", () => {
    expect(pathMatches("/dashboard", UNVERIFIED_REDIRECT_PREFIXES)).toBe(true);
    expect(
      pathMatches("/dashboard/groups/123", UNVERIFIED_REDIRECT_PREFIXES),
    ).toBe(true);
  });

  it("still protects application routes when signed out", () => {
    expect(pathMatches("/dashboard", PROTECTED_PREFIXES)).toBe(true);
    expect(pathMatches("/verify-email", PROTECTED_PREFIXES)).toBe(true);
    expect(pathMatches("/signup", PROTECTED_PREFIXES)).toBe(false);
  });
});
