import { describe, expect, it } from "vitest";

import { showsSignupConfirmation } from "./signup-state";
import type { AuthActionState } from "./types";

const success = (clientToken: string | null): AuthActionState => ({
  error: null,
  message: "We sent a confirmation link.",
  signupComplete: true,
  clientToken,
});

describe("showsSignupConfirmation", () => {
  it("shows a success reply from this submission", () => {
    expect(showsSignupConfirmation(success("token-a"), "token-a", null)).toBe(
      true,
    );
  });

  it("hides a reply restored from an earlier submission", () => {
    // The router restored the old reply, but this visit has no token (or a new
    // one), so the form must be shown instead of the old confirmation screen.
    expect(showsSignupConfirmation(success("token-a"), null, null)).toBe(false);
    expect(showsSignupConfirmation(success("token-a"), "token-b", null)).toBe(
      false,
    );
  });

  it("hides replies that are not a completed signup", () => {
    expect(
      showsSignupConfirmation(
        { error: null, message: null, clientToken: "token-a" },
        "token-a",
        null,
      ),
    ).toBe(false);
    expect(showsSignupConfirmation(success(null), null, null)).toBe(false);
  });

  it("hides the reply after the person starts over", () => {
    const state = success("token-a");
    expect(showsSignupConfirmation(state, "token-a", state)).toBe(false);
  });
});
