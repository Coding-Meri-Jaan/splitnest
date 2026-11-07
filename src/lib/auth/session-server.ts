import { cookies, headers } from "next/headers";

import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_REMEMBER_COOKIE,
  SESSION_STARTED_COOKIE,
  activityCookieOptions,
  isAuthCookie,
  isRemembered,
  rememberCookieOptions,
  startedCookieOptions,
} from "./session";

/**
 * Cookies are only marked Secure on an HTTPS request. Hard-coding
 * `NODE_ENV === "production"` breaks a production build served over plain
 * HTTP on localhost.
 */
export async function isSecureConnection(): Promise<boolean> {
  const headerList = await headers();
  const forwardedProto = headerList
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  const host = headerList.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.")) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export async function readRememberPreference(): Promise<boolean> {
  const cookieStore = await cookies();
  return isRemembered(cookieStore.get(SESSION_REMEMBER_COOKIE)?.value);
}

/**
 * Called after a successful sign-in or email/OAuth exchange. The auth cookies
 * themselves are written by Supabase; these markers let later requests keep
 * the same lifetime policy and enforce inactivity.
 */
export async function markSessionActive(remember: boolean): Promise<void> {
  const cookieStore = await cookies();
  const secure = await isSecureConnection();

  if (remember) {
    cookieStore.set(
      SESSION_REMEMBER_COOKIE,
      "1",
      rememberCookieOptions(secure),
    );
  } else {
    cookieStore.delete(SESSION_REMEMBER_COOKIE);
  }

  const now = Date.now();
  cookieStore.set(
    SESSION_ACTIVITY_COOKIE,
    String(now),
    activityCookieOptions(remember, secure),
  );
  cookieStore.set(
    SESSION_STARTED_COOKIE,
    String(now),
    startedCookieOptions(remember, secure),
  );
}

/**
 * Removes Supabase auth cookies plus our markers. Used after sign-out and when
 * an idle session is rejected, so a failed network call cannot leave the
 * browser holding a usable refresh token.
 */
export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();

  for (const cookie of cookieStore.getAll()) {
    if (isAuthCookie(cookie.name)) {
      cookieStore.delete(cookie.name);
    }
  }

  cookieStore.delete(SESSION_ACTIVITY_COOKIE);
  cookieStore.delete(SESSION_REMEMBER_COOKIE);
  cookieStore.delete(SESSION_STARTED_COOKIE);
}
