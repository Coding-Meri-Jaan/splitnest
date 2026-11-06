import { describe, expect, it } from "vitest";

import {
  ACTIVITY_REFRESH_MS,
  EPHEMERAL_IDLE_TIMEOUT_MS,
  REMEMBERED_IDLE_TIMEOUT_MS,
  REMEMBERED_SESSION_MAX_AGE_SECONDS,
  authCookieOptions,
  isAuthCookie,
  isRemembered,
  isSessionIdleExpired,
  parseActivityCookie,
  providerLabel,
  shouldTouchActivity,
} from "./session";

const NOW = 1_700_000_000_000;

describe("isRemembered", () => {
  it("only treats the marker value 1 as remembered", () => {
    expect(isRemembered("1")).toBe(true);
    expect(isRemembered("0")).toBe(false);
    expect(isRemembered(undefined)).toBe(false);
    expect(isRemembered(null)).toBe(false);
  });
});

describe("isAuthCookie", () => {
  it("matches Supabase auth and PKCE cookies", () => {
    expect(isAuthCookie("sb-ormodcniraaxctqdxunz-auth-token")).toBe(true);
    expect(isAuthCookie("sb-ormodcniraaxctqdxunz-auth-token.0")).toBe(true);
    expect(
      isAuthCookie("sb-ormodcniraaxctqdxunz-auth-token-code-verifier"),
    ).toBe(true);
  });

  it("does not match unrelated or marker cookies", () => {
    expect(isAuthCookie("sn-activity")).toBe(false);
    expect(isAuthCookie("sb-ormodcniraaxctqdxunz-auth-token-other")).toBe(false);
    expect(isAuthCookie("theme")).toBe(false);
  });
});

describe("isSessionIdleExpired", () => {
  it("keeps a session with no marker", () => {
    expect(isSessionIdleExpired(null, true, NOW)).toBe(false);
    expect(isSessionIdleExpired(0, false, NOW)).toBe(false);
  });

  it("expires a remembered session after 14 days", () => {
    expect(
      isSessionIdleExpired(NOW - REMEMBERED_IDLE_TIMEOUT_MS + 1, true, NOW),
    ).toBe(false);
    expect(
      isSessionIdleExpired(NOW - REMEMBERED_IDLE_TIMEOUT_MS - 1, true, NOW),
    ).toBe(true);
  });

  it("expires a session-only session after 12 hours", () => {
    expect(
      isSessionIdleExpired(NOW - EPHEMERAL_IDLE_TIMEOUT_MS + 1, false, NOW),
    ).toBe(false);
    expect(
      isSessionIdleExpired(NOW - EPHEMERAL_IDLE_TIMEOUT_MS - 1, false, NOW),
    ).toBe(true);
  });
});

describe("shouldTouchActivity", () => {
  it("refreshes a missing marker immediately", () => {
    expect(shouldTouchActivity(null, NOW)).toBe(true);
  });

  it("throttles writes", () => {
    expect(shouldTouchActivity(NOW - ACTIVITY_REFRESH_MS + 1, NOW)).toBe(false);
    expect(shouldTouchActivity(NOW - ACTIVITY_REFRESH_MS, NOW)).toBe(true);
  });

  it("refreshes a marker from the future", () => {
    expect(shouldTouchActivity(NOW + 60_000, NOW)).toBe(true);
  });
});

describe("parseActivityCookie", () => {
  it("reads a positive timestamp", () => {
    expect(parseActivityCookie(String(NOW))).toBe(NOW);
  });

  it("ignores invalid values", () => {
    expect(parseActivityCookie(undefined)).toBeNull();
    expect(parseActivityCookie("")).toBeNull();
    expect(parseActivityCookie("nope")).toBeNull();
    expect(parseActivityCookie("-1")).toBeNull();
  });
});

describe("authCookieOptions", () => {
  const incoming = { maxAge: 400 * 24 * 60 * 60, sameSite: "lax" as const };

  it("downgrades an unremembered session to a browser-session cookie", () => {
    const options = authCookieOptions(
      { ...incoming, expires: new Date(NOW) },
      false,
      true,
    );

    expect(options).not.toHaveProperty("maxAge");
    expect(options).not.toHaveProperty("expires");
    expect(options).toMatchObject({ path: "/", secure: true });
  });

  it("caps a remembered session at 30 days", () => {
    const options = authCookieOptions(incoming, true, false);

    expect(options.maxAge).toBe(REMEMBERED_SESSION_MAX_AGE_SECONDS);
    expect(options).toMatchObject({ path: "/", secure: false });
  });

  it("leaves deletion cookies alone", () => {
    const options = authCookieOptions({ maxAge: 0 }, true, true);

    expect(options.maxAge).toBe(0);
  });
});

describe("providerLabel", () => {
  it("labels known providers", () => {
    expect(providerLabel("email")).toBe("Email and password");
    expect(providerLabel("google")).toBe("Google");
    expect(providerLabel(undefined)).toBe("Email and password");
  });

  it("capitalizes unknown providers", () => {
    expect(providerLabel("github")).toBe("Github");
  });
});
