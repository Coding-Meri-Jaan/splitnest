/**
 * Session lifetime rules.
 *
 * Supabase signs the auth cookies and refreshes the access token, but it does
 * not apply an inactivity timeout. SplitNest adds two small, non-secret
 * cookies:
 *
 * - `sn-remember` records whether the person asked to stay signed in.
 * - `sn-activity` records the last protected request, so an abandoned session
 *   stops working even if the refresh token is still valid.
 */
export const SESSION_ACTIVITY_COOKIE = "sn-activity";
export const SESSION_REMEMBER_COOKIE = "sn-remember";

/** Persistent sessions last 30 days, then the browser drops the cookie. */
export const REMEMBERED_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** A remembered session that is unused for 14 days is signed out. */
export const REMEMBERED_IDLE_TIMEOUT_MS = 14 * 24 * 60 * 60 * 1000;

/** Without "remember me" the cookie dies with the browser; this also caps a
 * browser left open overnight at 12 hours of inactivity. */
export const EPHEMERAL_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000;

/** Writing the activity cookie on every request would be noisy. */
export const ACTIVITY_REFRESH_MS = 5 * 60 * 1000;

export function isRemembered(value: string | undefined | null): boolean {
  return value === "1";
}

/** True for every auth cookie Supabase may write, including chunked ones. */
export function isAuthCookie(name: string): boolean {
  return (
    /^sb-.+-auth-token(\.\d+)?$/.test(name) ||
    /^sb-.+-auth-token-code-verifier$/.test(name)
  );
}

export function isSessionIdleExpired(
  lastActiveMs: number | null | undefined,
  remembered: boolean,
  nowMs: number = Date.now(),
): boolean {
  if (
    lastActiveMs === null ||
    lastActiveMs === undefined ||
    !Number.isFinite(lastActiveMs) ||
    lastActiveMs <= 0
  ) {
    // Sessions created before this feature existed have no marker yet.
    return false;
  }

  const limit = remembered
    ? REMEMBERED_IDLE_TIMEOUT_MS
    : EPHEMERAL_IDLE_TIMEOUT_MS;

  return nowMs - lastActiveMs > limit;
}

export function shouldTouchActivity(
  lastActiveMs: number | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (
    lastActiveMs === null ||
    lastActiveMs === undefined ||
    !Number.isFinite(lastActiveMs) ||
    lastActiveMs <= 0
  ) {
    return true;
  }

  // A clock that moved backwards (or a tampered cookie) should be reset.
  if (lastActiveMs > nowMs) {
    return true;
  }

  return nowMs - lastActiveMs >= ACTIVITY_REFRESH_MS;
}

export function parseActivityCookie(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Applies SplitNest's cookie lifetime to the options Supabase hands us.
 *
 * `@supabase/ssr` always sets a 400-day maxAge, so this is the only place we
 * can downgrade an unremembered session to a real browser-session cookie.
 * Removal cookies (`maxAge: 0`) are left alone.
 */
export function authCookieOptions<T extends object>(
  options: T,
  remembered: boolean,
  secure: boolean,
): T {
  const next: Record<string, unknown> = {
    ...options,
    path: "/",
    sameSite: "lax",
    secure,
  };

  if (next.maxAge === 0) {
    return next as T;
  }

  if (remembered) {
    next.maxAge = REMEMBERED_SESSION_MAX_AGE_SECONDS;
  } else {
    delete next.maxAge;
    delete next.expires;
  }

  return next as T;
}

export function activityCookieOptions(remembered: boolean, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    ...(remembered ? { maxAge: REMEMBERED_SESSION_MAX_AGE_SECONDS } : {}),
  };
}

export function rememberCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: REMEMBERED_SESSION_MAX_AGE_SECONDS,
  };
}

/** A short, human label for the provider stored on the Supabase user. */
export function providerLabel(provider: string | undefined): string {
  if (provider === "google") {
    return "Google";
  }
  if (provider === "email" || !provider) {
    return "Email and password";
  }
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
