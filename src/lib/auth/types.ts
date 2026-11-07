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
  errorCode?: "email_not_confirmed" | null;
}

export const initialAuthState: AuthActionState = { error: null, message: null };
