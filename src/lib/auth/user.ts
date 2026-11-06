import { cache } from "react";
import { redirect } from "next/navigation";
import { io } from "next/cache";
import type { User } from "@supabase/supabase-js";

import { isEmailHandle } from "@/lib/display-name";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function metadataName(user: User): string {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  if (fullName.length > 0) {
    return fullName;
  }

  // Google puts the display name in `name`, not `full_name`.
  return typeof user.user_metadata?.name === "string"
    ? user.user_metadata.name.trim()
    : "";
}

function providerOf(user: User): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.length > 0) {
    return provider;
  }
  return user.identities?.[0]?.provider ?? "email";
}

/**
 * Reads the signed-in user without redirecting. Returns null when nobody is
 * signed in or Supabase is not configured, which lets screens such as /login
 * and /verify-email decide what to show.
 *
 * Cached per request so a page can call it from several Server Components
 * without repeating the auth round-trip.
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city, upi_id")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const storedName = profile?.full_name?.trim() ?? "";
  const metadataDisplayName = metadataName(user);

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
      .eq("id", user.id);
  }

  return {
    id: user.id,
    email,
    fullName,
    needsName: fullName.length === 0,
    city: profile?.city ?? null,
    upiId: profile?.upi_id ?? null,
    emailVerified: Boolean(user.email_confirmed_at),
    provider: providerOf(user),
    lastSignInAt: user.last_sign_in_at ?? null,
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
