import type { User } from "@supabase/supabase-js";

/**
 * Request headers written by the session proxy after it has verified the
 * signed-in user. Server Components and Server Actions read these instead of
 * asking Supabase Auth for the same user again.
 *
 * The proxy strips every one of these names from the incoming request before
 * setting them, so a browser cannot forge an identity by sending its own copy.
 */
export const USER_ID_HEADER = "x-sn-user-id";
export const USER_EMAIL_HEADER = "x-sn-user-email";
export const USER_VERIFIED_HEADER = "x-sn-user-verified";
export const USER_PROVIDER_HEADER = "x-sn-user-provider";
export const USER_LAST_SIGNIN_HEADER = "x-sn-user-last-signin";
export const USER_NAME_HEADER = "x-sn-user-name";

export const USER_HEADER_NAMES = [
  USER_ID_HEADER,
  USER_EMAIL_HEADER,
  USER_VERIFIED_HEADER,
  USER_PROVIDER_HEADER,
  USER_LAST_SIGNIN_HEADER,
  USER_NAME_HEADER,
] as const;

/** Header-safe encoding so names with accents or emoji survive the trip. */
export function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value);
}

export function decodeHeaderValue(value: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Google puts the display name in `name`, not `full_name`. */
export function metadataName(user: User): string {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  if (fullName.length > 0) {
    return fullName;
  }

  return typeof user.user_metadata?.name === "string"
    ? user.user_metadata.name.trim()
    : "";
}

export function providerOf(user: User): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.length > 0) {
    return provider;
  }
  return user.identities?.[0]?.provider ?? "email";
}

/** Adds the verified identity to the request headers the app renders with. */
export function setUserRequestHeaders(headers: Headers, user: User): void {
  headers.set(USER_ID_HEADER, user.id);
  headers.set(USER_EMAIL_HEADER, encodeHeaderValue(user.email ?? ""));
  headers.set(USER_VERIFIED_HEADER, user.email_confirmed_at ? "1" : "0");
  headers.set(USER_PROVIDER_HEADER, providerOf(user));
  headers.set(USER_LAST_SIGNIN_HEADER, user.last_sign_in_at ?? "");
  headers.set(USER_NAME_HEADER, encodeHeaderValue(metadataName(user)));
}
