import { NextResponse } from "next/server";
import { headers } from "next/headers";

import {
  getSupabaseEnv,
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
  // Reading request headers keeps this handler dynamic so it always reflects
  // the currently deployed configuration instead of build-time output.
  await headers();

  const report = {
    configured: isSupabaseConfigured(),
    urlLooksLikeDashboard: isSupabaseUrlMisconfigured(),
    projectRef: null as string | null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    auth: "skipped" as string,
    signupEnabled: null as boolean | null,
    emailConfirmationRequired: null as boolean | null,
    tables: {} as Record<string, string>,
    nextStep: "",
  };

  if (!isSupabaseConfigured()) {
    report.nextStep =
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.";
    return NextResponse.json(report);
  }

  const { url, anonKey } = getSupabaseEnv();
  report.projectRef = /^https:\/\/([a-z0-9]+)\.supabase\.co$/.exec(url)?.[1] ?? null;

  const authHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  try {
    const authResponse = await fetch(`${url}/auth/v1/settings`, {
      headers: authHeaders,
      cache: "no-store",
    });
    report.auth = authResponse.ok ? "ok" : `http-${authResponse.status}`;

    if (authResponse.ok) {
      const settings = (await authResponse.json()) as {
        mailer_autoconfirm?: boolean;
        disable_signup?: boolean;
      };
      report.emailConfirmationRequired = settings.mailer_autoconfirm === false;
      report.signupEnabled = settings.disable_signup !== true;
    }
  } catch {
    report.auth = "unreachable";
  }

  await Promise.all(
    TABLES.map(async (table) => {
      try {
        const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
          headers: authHeaders,
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

  const steps: string[] = [];
  if (report.urlLooksLikeDashboard) {
    steps.push(
      "NEXT_PUBLIC_SUPABASE_URL is the dashboard URL; the app recovered automatically but set it to https://<project-ref>.supabase.co.",
    );
  }
  if (report.auth !== "ok") {
    steps.push("Auth endpoint unreachable. Check the project URL and anon key.");
  }
  if (report.emailConfirmationRequired) {
    steps.push(
      "Email confirmation is ON, so each signup needs an email click and Supabase's built-in sender is rate-limited. For demos turn off Authentication → Sign In / Providers → Email → Confirm email, or confirm users manually in Authentication → Users.",
    );
  }
  if (report.signupEnabled === false) {
    steps.push("Email signups are disabled in Authentication → Sign In / Providers.");
  }
  if (missing.length > 0) {
    steps.push(
      `Run supabase/migrations/0001_init.sql then 0002_expenses_and_invites.sql in the Supabase SQL editor (missing: ${missing.join(", ")}).`,
    );
  }

  report.nextStep =
    steps.length > 0 ? steps.join(" ") : "All good. Sign up and create a group.";

  return NextResponse.json(report);
}
