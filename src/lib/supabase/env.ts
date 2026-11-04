const MISSING_ENV_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.example).";

/** Reads and validates the public Supabase configuration. */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(MISSING_ENV_MESSAGE);
  }

  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * True when NEXT_PUBLIC_SUPABASE_URL points at the Supabase dashboard
 * (https://supabase.com/dashboard/project/<ref>) instead of the project's
 * API endpoint (https://<ref>.supabase.co). This is the single most common
 * setup mistake and it makes every auth call fail with a confusing error.
 */
export function isSupabaseUrlMisconfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;

  return /supabase\.com\/dashboard/i.test(url);
}
