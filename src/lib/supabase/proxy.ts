import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_REMEMBER_COOKIE,
  SESSION_STARTED_COOKIE,
  activityCookieOptions,
  authCookieOptions,
  isAuthCookie,
  isRemembered,
  isSessionExpired,
  parseActivityCookie,
  shouldTouchActivity,
} from "@/lib/auth/session";

import { getSupabaseEnv, isSupabaseConfigured } from "./env";

const PROTECTED_PREFIXES = ["/dashboard", "/verify-email"];
const AUTH_ROUTES_REDIRECTED_WHEN_SIGNED_IN = [
  "/signup",
  "/forgot-password",
  "/verify-email",
];

/**
 * Refreshes the Supabase session cookie on every request and performs
 * optimistic route protection.
 *
 * This is deliberately not the only auth check: every page, Server Action
 * and query re-verifies the user close to the data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Keep the marketing site up even before Supabase is configured.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const { url, anonKey } = getSupabaseEnv();
  const secure = isSecureRequest(request);
  const remembered = isRemembered(
    request.cookies.get(SESSION_REMEMBER_COOKIE)?.value,
  );

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options: cookieOptions } of cookiesToSet) {
          response.cookies.set(
            name,
            value,
            authCookieOptions(cookieOptions, remembered, secure),
          );
        }
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not trust getSession() here - getUser() validates the token with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const now = Date.now();

  // Legacy sessions created before the activity marker existed fall back to
  // Supabase's last sign-in time, so shortening the policy applies immediately
  // instead of leaving an old session valid forever.
  const lastSignIn = user?.last_sign_in_at
    ? Date.parse(user.last_sign_in_at)
    : Number.NaN;
  const signInFallback =
    Number.isFinite(lastSignIn) && lastSignIn > 0 ? lastSignIn : null;

  const activityMarker = parseActivityCookie(
    request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value,
  );
  const startedMarker = parseActivityCookie(
    request.cookies.get(SESSION_STARTED_COOKIE)?.value,
  );
  const lastActive = activityMarker ?? signInFallback;
  const startedAt = startedMarker ?? signInFallback;

  // A remembered session from before the hard-limit marker existed has not
  // opted into the new policy yet. Hold it to the strict 30-minute idle rule
  // until the next sign-in writes `sn-started`; this makes a missing marker
  // fail closed instead of granting an indefinite session.
  const effectiveRemembered = remembered && startedMarker !== null;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isConfirmationRoute = pathname.startsWith("/auth/confirm");
  const isPasswordReset = pathname.startsWith("/reset-password");

  // An email link or a password-reset link must keep working even if the
  // browser still holds an old, idle session. Those routes are handled first.
  const shouldCheckIdle = !isConfirmationRoute && !isPasswordReset;

  if (
    user &&
    shouldCheckIdle &&
    isSessionExpired(lastActive, startedAt, effectiveRemembered, now)
  ) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("[auth] idle sign-out failed", error);
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "session-expired");
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/verify-email")) {
      redirectUrl.searchParams.set("next", pathname);
    }

    const redirect = NextResponse.redirect(redirectUrl);
    withCookies(redirect, response);
    clearSessionCookiesOnResponse(redirect, request);
    return redirect;
  }

  const emailVerified = Boolean(user?.email_confirmed_at);

  if (user && !emailVerified) {
    // Email confirmation is the real anti-fake-address gate. The auth/confirm
    // route itself must be reachable so the link can be exchanged first.
    const needsVerification =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/forgot-password");

    if (needsVerification) {
      return redirectTo(request, response, "/verify-email");
    }
  }

  if (
    user &&
    emailVerified &&
    AUTH_ROUTES_REDIRECTED_WHEN_SIGNED_IN.some((route) =>
      pathname.startsWith(route),
    )
  ) {
    return redirectTo(request, response, "/dashboard");
  }

  if (!user && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (pathname !== "/dashboard" && !pathname.startsWith("/verify-email")) {
      redirectUrl.searchParams.set("next", pathname);
    }
    return withCookies(NextResponse.redirect(redirectUrl), response);
  }

  // Signed-in people are allowed to open /login so they can see who they are
  // signed in as and switch accounts. Only refresh the idle marker here.
  if (user && shouldTouchActivity(activityMarker, now)) {
    response.cookies.set(
      SESSION_ACTIVITY_COOKIE,
      String(now),
      activityCookieOptions(remembered, secure),
    );
  }

  return response;
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  return request.nextUrl.protocol === "https:";
}

function redirectTo(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return withCookies(NextResponse.redirect(redirectUrl), source);
}

function withCookies(redirect: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

function clearSessionCookiesOnResponse(
  response: NextResponse,
  request: NextRequest,
) {
  for (const cookie of request.cookies.getAll()) {
    if (isAuthCookie(cookie.name)) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }

  response.cookies.set(SESSION_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(SESSION_REMEMBER_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(SESSION_STARTED_COOKIE, "", { path: "/", maxAge: 0 });
}
