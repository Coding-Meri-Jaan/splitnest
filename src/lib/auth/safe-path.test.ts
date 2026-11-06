import { describe, expect, it } from "vitest";

import { safePath } from "./safe-path";

describe("safePath", () => {
  it("keeps a same-origin path", () => {
    expect(safePath("/dashboard")).toBe("/dashboard");
    expect(safePath("/groups/123?tab=expenses#top")).toBe(
      "/groups/123?tab=expenses#top",
    );
  });

  it("falls back for absolute URLs", () => {
    expect(safePath("https://evil.example")).toBe("/dashboard");
    expect(safePath("http://evil.example/path")).toBe("/dashboard");
  });

  it("falls back for protocol-relative URLs", () => {
    expect(safePath("//evil.example")).toBe("/dashboard");
  });

  it("falls back for backslash tricks that browsers treat as slashes", () => {
    expect(safePath("/\\evil.example")).toBe("/dashboard");
    expect(safePath("/\\\\evil.example")).toBe("/dashboard");
  });

  it("falls back for empty or relative paths", () => {
    expect(safePath(null)).toBe("/dashboard");
    expect(safePath(undefined)).toBe("/dashboard");
    expect(safePath("")).toBe("/dashboard");
    expect(safePath("dashboard")).toBe("/dashboard");
  });
});
