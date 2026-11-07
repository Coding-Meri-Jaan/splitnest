/** Who the browser is currently signed in as, for the auth screens. */
export interface CurrentSession {
  email: string;
  fullName: string;
  emailVerified: boolean;
}

export interface AuthActionState {
  error: string | null;
  message: string | null;
  /**
   * Optional machine-readable hint for the UI. It is never shown directly;
   * `error` carries the human-readable text.
   */
  errorCode?: "email_not_confirmed" | "email_cooldown" | null;
  /**
   * Seconds until another auth email may be requested for this address.
   * Present after a send and when Supabase reports its per-address cooldown.
   */
  cooldownSeconds?: number | null;
  /** True once signup has sent a confirmation email for a pending account. */
  signupComplete?: boolean;
}

export const initialAuthState: AuthActionState = { error: null, message: null };
