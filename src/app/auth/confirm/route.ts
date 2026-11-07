import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { markSessionActive } from "@/lib/auth/session-server";
import { safePath } from "@/lib/auth/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase auth emails (signup confirmation, password reset)
 * and for OAuth providers such as Google. Exchanges the one-time credential
 * for a session cookie, then forwards on.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safePath(searchParams.get("next"));
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  // Only persist the session when the login form explicitly asked for it.
  // Email links and Google sign-ins default to a browser-session cookie.
  const remember = searchParams.get("remember") === "1";
  const supabase = await createSupabaseServerClient({ remember });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await markSessionActive(remember);
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      await markSessionActive(remember);
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=expired-link", origin));
}
