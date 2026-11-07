import { describe, expect, it } from "vitest";

import { config } from "./proxy";

describe("session proxy matcher", () => {
  it("never intercepts the OAuth/email callback", () => {
    // getUser() clears PKCE verifier cookies when the browser holds a dead
    // session. Running that on /auth/confirm breaks Google sign-in.
    expect(config.matcher).not.toContain("/auth/confirm");
    expect(
      config.matcher.some((route) => route.startsWith("/auth/confirm")),
    ).toBe(false);
  });

  it("still protects the application routes", () => {
    expect(config.matcher).toContain("/dashboard/:path*");
    expect(config.matcher).toContain("/login");
    expect(config.matcher).toContain("/signup");
  });
});
