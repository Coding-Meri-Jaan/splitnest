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

  it("explains the project email rate limit", () => {
    const message = describeAuthError(
      { message: "email rate limit exceeded", status: 429 },
      "Could not create your account.",
    );

    expect(message).toMatch(/per hour/i);
    expect(message).toMatch(/SMTP/i);
  });

  it("explains the per-address cooldown separately", () => {
    const message = describeAuthError(
      {
        message:
          "For security purposes, you can only request this after 42 seconds.",
        status: 429,
      },
      "fallback",
    );

    expect(message).toMatch(/42 seconds/);
    expect(message).toMatch(/inbox/i);
    expect(message).toMatch(/spam/i);
    expect(message).not.toMatch(/per hour/i);
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
