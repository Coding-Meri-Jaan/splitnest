import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import {
  SESSION_REMEMBER_COOKIE,
  authCookieOptions,
  isRemembered,
} from "@/lib/auth/session";
import { isSecureConnection } from "@/lib/auth/session-server";

import { getSupabaseEnv } from "./env";

interface SupabaseServerClientOptions {
  /**
   * Overrides the "remember me" preference for this client. Sign-in needs it
   * because the marker cookie is written in the same action that Supabase uses
   * to write the auth cookies.
   */
  remember?: boolean;
}

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. It reads the auth cookies, so RLS runs as the signed-in user.
 *
 * Create one per request - never cache it in a module-level variable.
 */
export async function createSupabaseServerClient(
  options: SupabaseServerClientOptions = {},
) {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();
  const secure = await isSecureConnection();
  const remembered =
    options.remember ??
    isRemembered(cookieStore.get(SESSION_REMEMBER_COOKIE)?.value);

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options: cookieOptions } of cookiesToSet) {
            cookieStore.set(
              name,
              value,
              authCookieOptions(cookieOptions, remembered, secure),
            );
          }
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes the
          // session on the next request, so this is safe to ignore here.
        }
      },
    },
  });
}
