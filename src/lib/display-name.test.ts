import { describe, expect, it } from "vitest";

import { displayName, isEmailHandle } from "./display-name";

describe("isEmailHandle", () => {
  it("matches the local part case-insensitively", () => {
    expect(isEmailHandle("SharmaDevesh", "sharmadevesh@example.com")).toBe(true);
  });

  it("does not match a real name", () => {
    expect(isEmailHandle("Devesh Sharma", "devesh@example.com")).toBe(false);
  });

  it("is false when there is no email", () => {
    expect(isEmailHandle("Devesh", "")).toBe(false);
  });
});

describe("displayName", () => {
  it("uses the stored full name", () => {
    expect(
      displayName({ full_name: "Devesh Sharma", email: "devesh@example.com" }),
    ).toBe("Devesh Sharma");
  });

  it("falls back when the name is blank", () => {
    expect(displayName({ full_name: "   ", email: "devesh@example.com" })).toBe(
      "Member",
    );
  });

  it("never exposes the email local part as a name", () => {
    expect(
      displayName({
        full_name: "sharmadeveshkumar2002",
        email: "sharmadeveshkumar2002@gmail.com",
      }),
    ).toBe("Member");
  });

  it("accepts a custom fallback", () => {
    expect(displayName(null, "Unnamed member")).toBe("Unnamed member");
  });
});
