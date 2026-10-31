import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /**
   * Only routes that care about the session. The marketing pages are static
   * and must not pay for an auth round-trip on every visit.
   */
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/confirm",
  ],
};
