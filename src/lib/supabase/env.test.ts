import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSupabaseEnv,
  isSupabaseUrlMisconfigured,
} from "./env";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  vi.unstubAllEnvs();
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_KEY;
});

describe("getSupabaseEnv", () => {
  it("returns the project API URL unchanged", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefghijklmnop.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test");

    expect(getSupabaseEnv()).toEqual({
      url: "https://abcdefghijklmnop.supabase.co",
      anonKey: "sb_publishable_test",
    });
  });

  it("recovers when the dashboard URL was pasted by mistake", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://supabase.com/dashboard/project/abcdefghijklmnop",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_test");

    expect(getSupabaseEnv().url).toBe("https://abcdefghijklmnop.supabase.co");
    expect(isSupabaseUrlMisconfigured()).toBe(true);
  });

  it("throws when the configuration is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() => getSupabaseEnv()).toThrow(/not configured/i);
  });
});
