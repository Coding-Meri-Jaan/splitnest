import {
  cooldownMessage,
  parseEmailCooldownSeconds,
} from "./email-cooldown";

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
    return "This email is not confirmed yet. Open the confirmation link we emailed you, or use “Resend confirmation email” on the login screen.";
  }
  if (
    message.includes("provider is not enabled") ||
    message.includes("unsupported provider") ||
    error.code === "provider_disabled"
  ) {
    return "Google sign-in is not enabled yet. Turn on the Google provider under Supabase → Authentication → Sign In / Providers.";
  }
  const cooldown = parseEmailCooldownSeconds(error.message);
  if (cooldown !== null) {
    return cooldownMessage(cooldown);
  }
  if (
    message.includes("rate limit") ||
    message.includes("too many") ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  ) {
    return "Too many sign-in emails were sent from this project in the last hour. Wait up to an hour and try again. If you run SplitNest, raise Authentication → Rate Limits → Emails per hour — custom SMTP allows more than the built-in 2/hour.";
  }
  if (
    message.includes("weak password") ||
    message.includes("password should be") ||
    message.includes("password is too short") ||
    error.code === "weak_password"
  ) {
    return "That password is too weak. Use at least 10 characters with uppercase, lowercase, a number, and a symbol.";
  }
  if (
    message.includes("signup is disabled") ||
    message.includes("signups not allowed") ||
    error.code === "signup_disabled"
  ) {
    return "New signups are disabled. Enable them under Supabase → Authentication → Sign In / Providers.";
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
  if (
    message.includes("invalid email") ||
    message.includes("email address") ||
    error.code === "email_address_invalid" ||
    error.code === "email_address_not_authorized"
  ) {
    return "That email address was rejected. Use a real address you can open.";
  }
  if (
    message.includes("token has expired") ||
    message.includes("otp expired") ||
    error.code === "otp_expired"
  ) {
    return "That link has expired. Request a new one.";
  }

  return fallback;
}
