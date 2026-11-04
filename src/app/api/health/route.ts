import { NextResponse } from "next/server";

import {
  isSupabaseConfigured,
  isSupabaseUrlMisconfigured,
} from "@/lib/supabase/env";

const TABLES = [
  "profiles",
  "groups",
  "group_members",
  "expenses",
  "expense_splits",
  "settlements",
] as const;

/**
 * Setup self-check. Open /api/health after deploying to see whether the
 * environment variables point at a real Supabase project and whether the
 * migrations have been applied.
 *
 * It only reports booleans and public identifiers - never keys or data.
 */
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const projectRef = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(url)?.[1] ?? null;

  const report = {
    configured: isSupabaseConfigured(),
    urlLooksLikeDashboard: isSupabaseUrlMisconfigured(),
    projectRef,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    auth: "skipped" as string,
    tables: {} as Record<string, string>,
    nextStep: "",
  };

  if (!isSupabaseConfigured() || isSupabaseUrlMisconfigured()) {
    report.nextStep = report.urlLooksLikeDashboard
      ? "NEXT_PUBLIC_SUPABASE_URL must be https://<project-ref>.supabase.co, not the supabase.com/dashboard URL."
      : "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.";
    return NextResponse.json(report);
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    const authResponse = await fetch(`${url}/auth/v1/settings`, {
      headers,
      cache: "no-store",
    });
    report.auth = authResponse.ok ? "ok" : `http-${authResponse.status}`;
  } catch {
    report.auth = "unreachable";
  }

  await Promise.all(
    TABLES.map(async (table) => {
      try {
        const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
          headers,
          cache: "no-store",
        });
        report.tables[table] = response.ok
          ? "ok"
          : response.status === 404
            ? "missing"
            : `http-${response.status}`;
      } catch {
        report.tables[table] = "unreachable";
      }
    }),
  );

  const missing = Object.entries(report.tables)
    .filter(([, status]) => status === "missing")
    .map(([table]) => table);

  report.nextStep =
    report.auth !== "ok"
      ? "Auth endpoint unreachable. Check the project URL and anon key."
      : missing.length > 0
        ? `Run supabase/migrations/0001_init.sql then 0002_expenses_and_invites.sql in the Supabase SQL editor (missing: ${missing.join(", ")}).`
        : "All good. Sign up and create a group.";

  return NextResponse.json(report);
}
