import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { loginActionMock } = vi.hoisted(() => ({
  loginActionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/actions", () => ({
  loginAction: loginActionMock,
  resendVerificationAction: async () => ({ error: null, message: null }),
  switchAccountAction: async () => {},
  signInWithGoogleAction: async () => ({ error: null, message: null }),
}));

import { LoginForm } from "./login-form";

function fillCredentials() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "person@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "SplitNest#2026aa" },
  });
}

function lastSubmittedForm(): FormData {
  const lastCall = loginActionMock.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error("loginAction was not called");
  }
  return lastCall[1] as FormData;
}

describe("LoginForm persistent session option", () => {
  beforeEach(() => {
    loginActionMock.mockReset();
    loginActionMock.mockImplementation(async () => ({
      error: null,
      message: null,
    }));
    window.localStorage.clear();
  });

  it("keeps 'Keep me signed in' checked by default", () => {
    render(<LoginForm />);

    const checkbox = screen.getByRole("checkbox", {
      name: /Keep me signed in/i,
    }) as HTMLInputElement;

    expect(checkbox.checked).toBe(true);
  });

  it("explains both session lifetimes", () => {
    render(<LoginForm />);

    expect(screen.getByText(/up to 30 days/)).toBeTruthy();
    expect(screen.getByText(/7 days without activity/)).toBeTruthy();
    expect(screen.getByText(/30 minutes of inactivity/)).toBeTruthy();
  });

  it("submits the remembered preference by default", async () => {
    render(<LoginForm />);
    fillCredentials();

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(loginActionMock).toHaveBeenCalled());
    expect(lastSubmittedForm().get("remember")).toBe("1");
  });

  it("lets people opt out and submits no remembered preference", async () => {
    render(<LoginForm />);
    const checkbox = screen.getByRole("checkbox", {
      name: /Keep me signed in/i,
    });

    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    fillCredentials();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(loginActionMock).toHaveBeenCalled());
    expect(lastSubmittedForm().get("remember")).toBeNull();
  });

  it("passes the remembered preference to Google sign-in", () => {
    render(<LoginForm />);

    const googleForm = screen
      .getByRole("button", { name: /Continue with Google/i })
      .closest("form");

    expect(
      (googleForm?.querySelector('input[name="remember"]') as HTMLInputElement)
        ?.value,
    ).toBe("1");
  });
});
