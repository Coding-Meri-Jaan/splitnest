const MISSING_ENV_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example).";

const DASHBOARD_URL_PATTERN =
  /^https?:\/\/(?:supabase\.com|app\.supabase\.com)\/dashboard\/project\/([a-z0-9]+)/i;

/**
 * Accepts either the project API URL (https://<ref>.supabase.co) or the
 * dashboard URL people often copy by mistake
 * (https://supabase.com/dashboard/project/<ref>) and always returns the API
 * URL. Self-healing here means one wrong env var cannot break every request.
 */
function normalizeSupabaseUrl(rawUrl: string): string {
  const url = rawUrl.trim().replace(/\/+$/, "");
  const dashboardMatch = DASHBOARD_URL_PATTERN.exec(url);

  if (dashboardMatch) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  return url;
}

/** Reads and validates the public Supabase configuration. */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return { url: normalizeSupabaseUrl(url), anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * True when NEXT_PUBLIC_SUPABASE_URL still points at the Supabase dashboard
 * instead of the project's API endpoint. The app recovers from this (see
 * normalizeSupabaseUrl), but the health check reports it so the env var can be
 * corrected properly.
 */
export function isSupabaseUrlMisconfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  return DASHBOARD_URL_PATTERN.test(url.trim());
}
