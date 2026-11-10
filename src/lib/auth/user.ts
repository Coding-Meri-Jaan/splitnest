import { cache } from "react";
import { redirect } from "next/navigation";
import { io } from "next/cache";
import { headers } from "next/headers";

import { isEmailHandle } from "@/lib/display-name";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  USER_EMAIL_HEADER,
  USER_ID_HEADER,
  USER_LAST_SIGNIN_HEADER,
  USER_NAME_HEADER,
  USER_PROVIDER_HEADER,
  USER_VERIFIED_HEADER,
  decodeHeaderValue,
  metadataName,
  providerOf,
} from "@/lib/auth/user-headers";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  /** True when the account has no usable name yet. */
  needsName: boolean;
  city: string | null;
  upiId: string | null;
  /** False for accounts that have not clicked their confirmation email. */
  emailVerified: boolean;
  /** `email`, `google`, or another Supabase provider id. */
  provider: string;
  lastSignInAt: string | null;
}

/**
 * Reads the signed-in user without redirecting. Returns null when nobody is
 * signed in or Supabase is not configured, which lets screens such as /login
 * and /verify-email decide what to show.
 *
 * The session proxy has already verified the token and passed the identity
 * down as request headers, so this normally costs one profile read instead of
 * a second Auth round-trip. If the headers are missing (for example on an
 * unmatched route), it falls back to verifying with Supabase itself.
 *
 * Cached per request so several Server Components can call it once.
 */
export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Mark this as request-time work before touching the session. Supabase
  // refreshes auth cookies while reading the user, and writing a cookie reads
  // the clock. During prerendering that read is flagged as unstable, which
  // would otherwise abort the render and leave the page stuck on its
  // Suspense fallback.
  await io();

  const requestHeaders = await headers();
  const supabase = await createSupabaseServerClient();

  let userId = requestHeaders.get(USER_ID_HEADER);
  let email = decodeHeaderValue(requestHeaders.get(USER_EMAIL_HEADER));
  let emailVerified = requestHeaders.get(USER_VERIFIED_HEADER) === "1";
  let provider = requestHeaders.get(USER_PROVIDER_HEADER) || "email";
  let lastSignInAt = requestHeaders.get(USER_LAST_SIGNIN_HEADER) || null;
  let metadataDisplayName = decodeHeaderValue(
    requestHeaders.get(USER_NAME_HEADER),
  );

  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    userId = user.id;
    email = user.email ?? "";
    emailVerified = Boolean(user.email_confirmed_at);
    provider = providerOf(user);
    lastSignInAt = user.last_sign_in_at ?? null;
    metadataDisplayName = metadataName(user);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city, upi_id")
    .eq("id", userId)
    .maybeSingle();

  const storedName = profile?.full_name?.trim() ?? "";

  // Older profile triggers copied the email local part into full_name. Treat
  // that as "no name" so shared screens never show an email handle.
  const storedNameIsUsable =
    storedName.length > 0 && !isEmailHandle(storedName, email);
  const metadataNameIsUsable =
    metadataDisplayName.length > 0 &&
    !isEmailHandle(metadataDisplayName, email);

  const fullName = storedNameIsUsable
    ? storedName
    : metadataNameIsUsable
      ? metadataDisplayName
      : "";

  // One-time repair: if auth still has the name the person typed at signup or
  // the name Google returned, copy it back into the profile so every group
  // sees the right name.
  if (metadataNameIsUsable && !storedNameIsUsable) {
    await supabase
      .from("profiles")
      .update({ full_name: metadataDisplayName })
      .eq("id", userId);
  }

  return {
    id: userId,
    email,
    fullName,
    needsName: fullName.length === 0,
    city: profile?.city ?? null,
    upiId: profile?.upi_id ?? null,
    emailVerified,
    provider,
    lastSignInAt,
  };
});

/**
 * Reads and verifies the signed-in user for protected screens. Redirects to
 * the login screen when signed out and to the verification screen when the
 * email has not been confirmed.
 *
 * Must be rendered behind a <Suspense> boundary: reading cookies is request
 * data, which Cache Components requires to stream.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.emailVerified) {
    redirect("/verify-email");
  }

  return user;
});

/**
 * The cheap identity check for Server Actions. Actions only need the user id,
 * and the proxy already verified the session, so this skips both the Auth
 * round-trip and the profile query. Falls back to the full check when the
 * identity header is unavailable.
 */
export async function requireUserId(): Promise<string> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);

  if (userId) {
    return userId;
  }

  const user = await getCurrentUser();
  return user.id;
}
