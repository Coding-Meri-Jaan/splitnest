import { describe, expect, it } from "vitest";

import { emailSignupSafety, type AuthProjectSettings } from "./project-settings";

function settings(
  overrides: Partial<AuthProjectSettings> = {},
): AuthProjectSettings {
  return {
    emailConfirmationRequired: true,
    googleEnabled: false,
    signupEnabled: true,
    ...overrides,
  };
}

describe("emailSignupSafety", () => {
  it("allows email signup only when confirmation is required", () => {
    expect(
      emailSignupSafety(settings({ emailConfirmationRequired: true })),
    ).toBe("allowed");
  });

  it("blocks signup when Supabase auto-confirms addresses", () => {
    expect(
      emailSignupSafety(settings({ emailConfirmationRequired: false })),
    ).toBe("confirmation-off");
  });

  it("fails closed when the setting cannot be read", () => {
    expect(
      emailSignupSafety(settings({ emailConfirmationRequired: null })),
    ).toBe("unknown");
  });
});
