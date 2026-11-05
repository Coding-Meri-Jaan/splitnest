import { cache } from "react";
import { redirect } from "next/navigation";

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
}

/**
 * Reads and verifies the signed-in user. Cached per request so a page can call
 * it from several Server Components without repeating the auth round-trip.
 *
 * Must be rendered behind a <Suspense> boundary: reading cookies is request
 * data, which Cache Components requires to stream.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser> => {
  // Without configuration there is no session to read; send people to the
  // login screen, which explains what is missing instead of crashing.
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city, upi_id")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const storedName = profile?.full_name?.trim() ?? "";
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  // Older profile triggers copied the email local part into full_name. Treat
  // that as "no name" so shared screens never show an email handle.
  const storedNameIsUsable =
    storedName.length > 0 && !isEmailHandle(storedName, email);
  const metadataNameIsUsable =
    metadataName.length > 0 && !isEmailHandle(metadataName, email);

  const fullName = storedNameIsUsable
    ? storedName
    : metadataNameIsUsable
      ? metadataName
      : "";

  // One-time repair: if auth still has the name the person typed at signup,
  // copy it back into the profile so every group sees the right name.
  if (metadataNameIsUsable && !storedNameIsUsable) {
    await supabase
      .from("profiles")
      .update({ full_name: metadataName })
      .eq("id", user.id);
  }

  return {
    id: user.id,
    email,
    fullName,
    needsName: fullName.length === 0,
    city: profile?.city ?? null,
    upiId: profile?.upi_id ?? null,
  };
});
