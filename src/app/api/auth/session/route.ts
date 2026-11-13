import { connection, NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A tiny signed-in/signed-out probe for the shared marketing and auth headers.
 * It returns nothing but the boolean, and caches for nobody.
 */
export async function GET() {
  await connection();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ signedIn: false });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json(
    { signedIn: Boolean(user) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
