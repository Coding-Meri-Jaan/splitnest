import { describe, expect, it, vi } from "vitest";

import { describeAuthError } from "./errors";

vi.spyOn(console, "error").mockImplementation(() => {});

describe("describeAuthError", () => {
  it("explains an unconfirmed email", () => {
    const message = describeAuthError(
      { message: "Email not confirmed", code: "email_not_confirmed" },
      "Incorrect email or password.",
    );

    expect(message).toMatch(/not confirmed/i);
    expect(message).toMatch(/confirmation link/i);
  });

  it("explains the built-in email rate limit", () => {
    const message = describeAuthError(
      { message: "email rate limit exceeded", status: 429 },
      "Could not create your account.",
    );

    expect(message).toMatch(/rate limit/i);
    expect(message).toMatch(/SMTP/i);
  });

  it("keeps the fallback for invalid credentials", () => {
    expect(
      describeAuthError(
        { message: "Invalid login credentials", code: "invalid_credentials" },
        "Incorrect email or password.",
      ),
    ).toBe("Incorrect email or password.");
  });

  it("detects an unreachable project", () => {
    expect(
      describeAuthError({ message: "Failed to fetch", status: 0 }, "fallback"),
    ).toMatch(/Cannot reach Supabase/);
  });
});
