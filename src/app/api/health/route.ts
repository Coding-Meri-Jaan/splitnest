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
    googleEnabled: null as boolean | null,
    emailSignupAllowed: null as boolean | null,
    passwordPolicy:
      "10+ characters with uppercase, lowercase, number, and symbol; common passwords blocked",
    tables: {} as Record<string, string>,
    splitSchema: "skipped" as string,
    notes: [] as string[],
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
        external?: Record<string, boolean>;
      };
      report.emailConfirmationRequired = settings.mailer_autoconfirm === false;
      report.signupEnabled = settings.disable_signup !== true;
      report.googleEnabled = settings.external?.google === true;
      report.emailSignupAllowed = settings.mailer_autoconfirm === false;
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

  // Custom splits need two new columns. Selecting them is the cheapest way to
  // prove migration 0004 landed; PostgREST answers 400 when a column is unknown.
  try {
    const [splitModeProbe, splitValueProbe] = await Promise.all([
      fetch(`${url}/rest/v1/expenses?select=split_mode&limit=1`, {
        headers: authHeaders,
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/expense_splits?select=split_value&limit=1`, {
        headers: authHeaders,
        cache: "no-store",
      }),
    ]);
    report.splitSchema =
      splitModeProbe.ok && splitValueProbe.ok ? "ok" : "missing";
  } catch {
    report.splitSchema = "unreachable";
  }

  const missing = Object.entries(report.tables)
    .filter(([, status]) => status === "missing")
    .map(([table]) => table);

  const steps: string[] = [];
  if (report.urlLooksLikeDashboard) {
    steps.push(
      "NEXT_PUBLIC_SUPABASE_URL is the dashboard URL. The app recovers automatically, but set it to https://<project-ref>.supabase.co in your host's environment variables to clear this warning.",
    );
  }
  if (report.auth !== "ok") {
    steps.push("Auth endpoint unreachable. Check the project URL and anon key.");
  }
  if (report.emailConfirmationRequired) {
    // Confirmation is the intended state for this app, so it is a note rather
    // than a problem to fix. Verified delivery is covered by a real signup.
    report.notes.push(
      "Email confirmation is ON, so unconfirmed accounts cannot sign in until they open the verification link.",
    );
  } else if (report.emailConfirmationRequired === false) {
    steps.push(
      "Email confirmation is OFF, so email/password sign-up is blocked by the app (Google still works). Turn on Authentication → Sign In / Providers → Email → Confirm email and connect custom SMTP to make verified email sign-up work.",
    );
  } else if (report.auth === "ok") {
    steps.push(
      "Could not read the auth settings, so email/password sign-up is blocked. Check the project URL and anon key.",
    );
  }
  if (report.signupEnabled === false) {
    steps.push("Email signups are disabled in Authentication → Sign In / Providers.");
  }
  if (report.googleEnabled === false) {
    steps.push(
      "Google sign-in is off. Add a Google OAuth client under Authentication → Sign In / Providers → Google and allow <your-site>/auth/confirm as a redirect URL.",
    );
  }
  if (missing.length > 0) {
    steps.push(
      `Run supabase/migrations/0001_init.sql, 0002_expenses_and_invites.sql, 0003_profile_names.sql, then 0004_custom_splits.sql in the Supabase SQL editor (missing: ${missing.join(", ")}).`,
    );
  }
  if (report.auth === "ok" && report.splitSchema === "missing") {
    steps.push(
      "Custom split modes are unavailable: run supabase/migrations/0004_custom_splits.sql in the Supabase SQL editor. Expense pages will error until it is applied.",
    );
  } else if (report.splitSchema === "unreachable") {
    steps.push("Could not check the custom split columns. Is the REST endpoint reachable?");
  }

  report.nextStep =
    steps.length > 0 ? steps.join(" ") : "All good. Sign up and create a group.";

  return NextResponse.json(report);
}
