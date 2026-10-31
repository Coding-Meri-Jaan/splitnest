export interface AuthActionState {
  error: string | null;
  message: string | null;
}

export const initialAuthState: AuthActionState = { error: null, message: null };
