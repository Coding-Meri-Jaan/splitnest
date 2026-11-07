import type { AuthActionState } from "./types";

/**
 * The signup confirmation screen only belongs to a form submitted in this
 * visit. The server echoes the per-submit token, so a reply that the router
 * restores after the person leaves the page cannot bring the previous
 * address's confirmation screen back.
 */
export function showsSignupConfirmation(
  state: AuthActionState,
  submissionToken: string | null,
  dismissedState: AuthActionState | null,
): boolean {
  return (
    state.signupComplete === true &&
    state.clientToken != null &&
    state.clientToken === submissionToken &&
    state !== dismissedState
  );
}
