import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { clearEmailSent } from "@/lib/auth/email-cooldown-server";
import { markSessionActive } from "@/lib/auth/session-server";
import { getSiteUrl, safePath } from "@/lib/auth/site-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for Supabase auth emails (signup confirmation, password reset)
 * and for OAuth providers such as Google. Exchanges the one-time credential
 * for a session cookie, then forwards on.
 *
 * Redirects are built from the configured public site URL rather than
 * `request.url`. On Netlify the request URL is rewritten to the internal branch
 * host (`main--<site>.netlify.app`), while the browser is on the public alias.
 * Bouncing to that internal host would leave the freshly written session cookie
 * on the wrong host, so the person would look signed out right after
 * confirming an email or returning from Google.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safePath(searchParams.get("next"));
  const oauthError = searchParams.get("error");
  const siteUrl = await getSiteUrl();
  const go = (path: string) => NextResponse.redirect(new URL(path, siteUrl));

  if (oauthError) {
    return go("/login?error=oauth");
  }

  // Only persist the session when the login form explicitly asked for it.
  // Email links and Google sign-ins default to a browser-session cookie.
  const remember = searchParams.get("remember") === "1";
  const supabase = await createSupabaseServerClient({ remember });

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await markSessionActive(remember);
      await clearEmailSent(data.user?.email);
      return go(next);
    }

    // The code arrives from Google/OAuth, so "expired email link" would be
    // misleading. The code and verifier are single-use; a retry is the fix.
    console.error("[auth] OAuth code exchange failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    return go("/login?error=oauth-failed");
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      await markSessionActive(remember);
      await clearEmailSent(data.user?.email);
      return go(next);
    }

    console.error("[auth] email link verification failed", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
  }

  return go("/login?error=expired-link");
}
