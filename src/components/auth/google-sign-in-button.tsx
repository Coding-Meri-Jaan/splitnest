"use client";

import { useActionState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { signInWithGoogleAction } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.28a12 12 0 0 0 0 10.78l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  next?: string;
  remember?: boolean;
}

export function GoogleSignInButton({
  next = "/dashboard",
  remember = true,
}: GoogleSignInButtonProps) {
  const [state, formAction] = useActionState(
    signInWithGoogleAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="remember" value={remember ? "1" : "0"} />
      <AuthMessage error={state.error} message={state.message} />
      <SubmitButton
        variant="outline"
        pendingLabel="Redirecting to Google…"
      >
        <GoogleMark />
        Continue with Google
      </SubmitButton>
    </form>
  );
}
