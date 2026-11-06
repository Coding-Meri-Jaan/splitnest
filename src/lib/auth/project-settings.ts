import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Read-only view of the project's Auth settings.
 *
 * `null` means "could not determine". Callers that need a security guarantee
 * must treat unknown as unsafe.
 */
export interface AuthProjectSettings {
  /** True only when Supabase requires people to click a confirmation email. */
  emailConfirmationRequired: boolean | null;
  googleEnabled: boolean | null;
  signupEnabled: boolean | null;
}

export type EmailSignupSafety =
  | "allowed"
  | "confirmation-off"
  | "unknown";

/**
 * There is no safe way to create an email/password account when the project
 * auto-confirms addresses: a made-up address would become a fully working
 * account. This decision is deliberately fail-closed.
 */
export function emailSignupSafety(
  settings: AuthProjectSettings,
): EmailSignupSafety {
  if (settings.emailConfirmationRequired === true) {
    return "allowed";
  }
  if (settings.emailConfirmationRequired === false) {
    return "confirmation-off";
  }
  return "unknown";
}

/** Settings change rarely; a short cache avoids a request on every signup. */
const CACHE_TTL_MS = 30_000;

let cached: { value: AuthProjectSettings; expiresAt: number } | null = null;

export async function getAuthProjectSettings(): Promise<AuthProjectSettings> {
  const unknown: AuthProjectSettings = {
    emailConfirmationRequired: null,
    googleEnabled: null,
    signupEnabled: null,
  };

  if (!isSupabaseConfigured()) {
    return unknown;
  }

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { url, anonKey } = getSupabaseEnv();

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const settings = (await response.json()) as {
      mailer_autoconfirm?: unknown;
      disable_signup?: unknown;
      external?: Record<string, unknown>;
    };

    const value: AuthProjectSettings = {
      emailConfirmationRequired:
        typeof settings.mailer_autoconfirm === "boolean"
          ? settings.mailer_autoconfirm === false
          : null,
      googleEnabled:
        typeof settings.external?.google === "boolean"
          ? settings.external.google
          : null,
      signupEnabled:
        typeof settings.disable_signup === "boolean"
          ? settings.disable_signup !== true
          : null,
    };

    cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch (error) {
    console.error("[auth] could not read Supabase auth settings", error);
    return unknown;
  }
}
