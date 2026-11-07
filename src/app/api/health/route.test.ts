import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

import { GET } from "./route";

const PROJECT_REF = "abcdefghijklmnop";
const API_URL = `https://${PROJECT_REF}.supabase.co`;

interface HealthReport {
  urlLooksLikeDashboard: boolean;
  tables: Record<string, string>;
  splitSchema: string;
  notes: string[];
  nextStep: string;
}

function mockSupabase(settings: Record<string, unknown>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/settings")) {
      return new Response(JSON.stringify(settings), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

async function readReport(): Promise<HealthReport> {
  const response = await GET();
  return (await response.json()) as HealthReport;
}

const CONFIRMED_SIGNUPS = {
  mailer_autoconfirm: false,
  disable_signup: false,
  external: { google: true },
};

describe("health report", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("treats email confirmation as a note, not a problem to fix", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", API_URL);
    mockSupabase(CONFIRMED_SIGNUPS);

    const report = await readReport();

    expect(report.nextStep).toBe("All good. Sign up and create a group.");
    expect(report.notes.join(" ")).toContain("Email confirmation is ON");
    expect(report.nextStep).not.toContain("custom SMTP");
    expect(report.nextStep).not.toContain("Test one real signup");
  });

  it("still reports a dashboard URL as an actionable problem", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      `https://supabase.com/dashboard/project/${PROJECT_REF}`,
    );
    mockSupabase(CONFIRMED_SIGNUPS);

    const report = await readReport();

    expect(report.urlLooksLikeDashboard).toBe(true);
    expect(report.nextStep).toContain("NEXT_PUBLIC_SUPABASE_URL is the dashboard URL");
    expect(report.nextStep).not.toContain("custom SMTP");
  });
});
