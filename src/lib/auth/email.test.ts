import { describe, expect, it } from "vitest";

import { emailDomain, hasEmailShape, normalizeEmail, validateEmail } from "./email";

describe("validateEmail", () => {
  it("accepts a normal address", () => {
    expect(validateEmail("Ananya.Sharma@SplitNest.in")).toEqual({
      valid: true,
      reason: null,
    });
  });

  it("accepts a plus tag and a multi-part domain", () => {
    expect(validateEmail("ananya+split@mail.company.co.in").valid).toBe(true);
  });

  it("rejects an empty address", () => {
    expect(validateEmail("   ").valid).toBe(false);
  });

  it("rejects a malformed address", () => {
    expect(validateEmail("ananya").valid).toBe(false);
    expect(validateEmail("ananya@").valid).toBe(false);
    expect(validateEmail("ananya@company").valid).toBe(false);
  });

  it("rejects consecutive, leading, and trailing dots", () => {
    expect(validateEmail("an..anya@company.in").valid).toBe(false);
    expect(validateEmail(".ananya@company.in").valid).toBe(false);
    expect(validateEmail("ananya.@company.in").valid).toBe(false);
  });

  it("rejects placeholder and disposable domains", () => {
    expect(validateEmail("ananya@example.com").valid).toBe(false);
    expect(validateEmail("ananya@test.com").valid).toBe(false);
    expect(validateEmail("ananya@mailinator.com").valid).toBe(false);
    expect(validateEmail("ananya@inbox.mailinator.com").valid).toBe(false);
    expect(validateEmail("ananya@yopmail.com").valid).toBe(false);
  });

  it("rejects reserved TLDs", () => {
    expect(validateEmail("ananya@company.test").valid).toBe(false);
    expect(validateEmail("ananya@company.invalid").valid).toBe(false);
    expect(validateEmail("ananya@company.local").valid).toBe(false);
  });

  it("rejects obvious placeholder local parts", () => {
    expect(validateEmail("test@company.in").valid).toBe(false);
    expect(validateEmail("fake@company.in").valid).toBe(false);
    expect(validateEmail("asdf@company.in").valid).toBe(false);
  });

  it("rejects invalid domain labels", () => {
    expect(validateEmail("ananya@-company.in").valid).toBe(false);
    expect(validateEmail("ananya@company-.in").valid).toBe(false);
  });

  it("rejects an over-long local part", () => {
    expect(validateEmail(`${"a".repeat(65)}@company.in`).valid).toBe(false);
  });
});

describe("hasEmailShape", () => {
  it("accepts any well-formed address, including blocked signup domains", () => {
    expect(hasEmailShape("ananya@splitnest.in")).toBe(true);
    expect(hasEmailShape("legacy@test.com")).toBe(true);
    expect(hasEmailShape("  Ananya@SplitNest.IN  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(hasEmailShape("")).toBe(false);
    expect(hasEmailShape("ananya")).toBe(false);
    expect(hasEmailShape("ananya@company")).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Ananya@SplitNest.IN  ")).toBe(
      "ananya@splitnest.in",
    );
  });
});

describe("emailDomain", () => {
  it("returns the domain", () => {
    expect(emailDomain("Ananya@SplitNest.IN")).toBe("splitnest.in");
  });

  it("returns null when there is no domain", () => {
    expect(emailDomain("ananya")).toBeNull();
    expect(emailDomain("ananya@")).toBeNull();
  });
});
