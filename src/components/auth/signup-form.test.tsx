import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/actions", () => ({
  signupAction: async (_previous: unknown, formData: FormData) => ({
    error: null,
    message:
      "We sent a confirmation link to new@example.com. Open it to finish signing up.",
    cooldownSeconds: 60,
    signupComplete: true,
    clientToken: String(formData.get("clientToken") ?? ""),
  }),
  resendVerificationAction: async () => ({ error: null, message: null }),
  switchAccountAction: async () => {},
  signInWithGoogleAction: async () => ({ error: null, message: null }),
}));

import { SignupForm } from "./signup-form";

function fillSignupForm() {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Flow Check" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "new@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "SplitNest#2026aa" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "SplitNest#2026aa" },
  });
}

function restoreFromBackForwardCache() {
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: true });
  window.dispatchEvent(event);
}

describe("SignupForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the confirmation screen for a signup from this visit", async () => {
    render(<SignupForm />);

    fillSignupForm();
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() =>
      expect(
        screen.getByText(/Open the link in the confirmation email/),
      ).toBeTruthy(),
    );
  });

  it("returns to the form when the page is restored from the back/forward cache", async () => {
    render(<SignupForm />);

    fillSignupForm();
    fireEvent.click(screen.getByText("Create account"));

    await waitFor(() =>
      expect(
        screen.getByText(/Open the link in the confirmation email/),
      ).toBeTruthy(),
    );

    act(() => restoreFromBackForwardCache());

    await waitFor(() => expect(screen.getByLabelText("Email")).toBeTruthy());
    expect(screen.queryByText(/Open the link in the confirmation email/)).toBe(
      null,
    );
    expect(screen.getByText("Create account")).toBeTruthy();
  });
});
