import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
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

  return {
    id: user.id,
    email,
    fullName: profile?.full_name?.trim() || email.split("@")[0] || "there",
    city: profile?.city ?? null,
    upiId: profile?.upi_id ?? null,
  };
});
