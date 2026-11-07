/**
 * Route decisions shared by the session proxy and its tests.
 *
 * Keeping these as plain data makes the rules easy to reason about - and just
 * as importantly, easy to test. `/signup` is deliberately absent from both
 * redirect lists: a person who is already signed in must still be able to open
 * the create-account page, add another account, or switch to a different
 * account after following a confirmation link.
 */

/** Signed out? These routes are unavailable. */
export const PROTECTED_PREFIXES = ["/dashboard", "/verify-email"] as const;

/**
 * Signed in and verified? These routes would only confuse, so redirect to the
 * dashboard. `/login` and `/signup` stay reachable so the person can see who
 * they are signed in as and switch accounts.
 */
export const SIGNED_IN_REDIRECT_PREFIXES = [
  "/forgot-password",
  "/verify-email",
] as const;

/**
 * Signed in but not yet email-verified? These routes need a real address, so
 * redirect to the verification screen. `/signup` stays reachable so someone
 * holding a stale or wrong unverified session can get out of it.
 */
export const UNVERIFIED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/forgot-password",
] as const;

export function pathMatches(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}
