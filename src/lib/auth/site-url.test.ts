import { afterEach, describe, expect, it, vi } from "vitest";

const headerStore = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => headerStore,
}));

import { getSiteUrl } from "./site-url";

function requestHeaders(values: Record<string, string>) {
  headerStore.get.mockImplementation((name: string) => values[name]);
}

afterEach(() => {
  headerStore.get.mockReset();
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("keeps a local dev request on localhost even with a production URL set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://splitnest-payments.netlify.app/");
    requestHeaders({
      "x-forwarded-host": "localhost:3000",
      "x-forwarded-proto": "http",
      host: "localhost:3000",
    });

    await expect(getSiteUrl()).resolves.toBe("http://localhost:3000");
  });

  it("uses the configured public URL on a deployed request", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://splitnest-payments.netlify.app/");
    requestHeaders({
      // Netlify rewrites the request host to its internal branch host.
      "x-forwarded-host": "main--splitnest-payments.netlify.app",
      "x-forwarded-proto": "https",
    });

    await expect(getSiteUrl()).resolves.toBe(
      "https://splitnest-payments.netlify.app",
    );
  });

  it("falls back to the request host when no public URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    requestHeaders({
      "x-forwarded-host": "splitnest.example.com",
      "x-forwarded-proto": "https",
    });

    await expect(getSiteUrl()).resolves.toBe("https://splitnest.example.com");
  });
});
