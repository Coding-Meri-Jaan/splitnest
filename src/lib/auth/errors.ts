export interface AuthErrorLike {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Turns a Supabase auth error into something a human can act on.
 * The raw error is logged so it also shows up in the server logs.
 */
export function describeAuthError(
  error: AuthErrorLike,
  fallback: string,
): string {
  console.error("[auth] supabase error", {
    status: error.status,
    code: error.code,
    message: error.message,
  });

  const message = error.message.toLowerCase();

  if (
    message.includes("email not confirmed") ||
    error.code === "email_not_confirmed"
  ) {
    return "This email is not confirmed yet. Open the confirmation link in your inbox, or in Supabase open Authentication → Users and confirm the account. Turning off Authentication → Sign In / Providers → Email → Confirm email removes this step entirely.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Supabase's built-in email service hit its hourly limit, so it stopped sending signup emails. Wait about an hour, or open Supabase → Authentication → Sign In / Providers → Email and turn off Confirm email (then no email is needed), or connect your own SMTP provider. Accounts you already created can be confirmed from Authentication → Users.";
  }
  if (message.includes("redirect") && message.includes("not allowed")) {
    return "Supabase rejected the confirmation link. Add <your-site>/auth/confirm to Authentication → URL Configuration in Supabase.";
  }
  if (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    error.status === 0
  ) {
    return "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and the anon key.";
  }
  if (message.includes("invalid api key") || message.includes("no api key")) {
    return "Supabase rejected the anon key. Copy it again from Project Settings → API.";
  }
  if (message.includes("invalid email")) {
    return "That email address was rejected by Supabase. Try a different one.";
  }

  return fallback;
}
