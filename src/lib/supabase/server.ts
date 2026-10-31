import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { getSupabaseEnv } from "./env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. It reads the auth cookies, so RLS runs as the signed-in user.
 *
 * Create one per request - never cache it in a module-level variable.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The Proxy refreshes the
          // session on the next request, so this is safe to ignore here.
        }
      },
    },
  });
}
