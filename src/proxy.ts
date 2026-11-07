import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Only routes that care about the session. The marketing pages are static
   * and must not pay for an auth round-trip on every visit.
   *
   * `/auth/confirm` is deliberately absent. When the browser still holds an
   * expired session, `getUser()` calls `_removeSession()`, which deletes every
   * in-flight PKCE code verifier. Matching the OAuth callback would wipe the
   * verifier before the route could exchange the code, so Google sign-in would
   * always fail for anyone whose old session had expired.
   */
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
  ],
};
