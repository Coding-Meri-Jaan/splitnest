"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  resendVerificationAction,
  signupAction,
  switchAccountAction,
} from "@/lib/auth/actions";
import { formatCooldown } from "@/lib/auth/email-cooldown";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";
import { showsSignupConfirmation } from "@/lib/auth/signup-state";
import {
  initialAuthState,
  type AuthActionState,
  type CurrentSession,
} from "@/lib/auth/types";
import { useEmailCooldown } from "@/lib/auth/use-email-cooldown";

interface SignupFormProps {
  currentUser?: CurrentSession | null;
}

const MESSAGES: Record<string, string> = {
  "switched-account":
    "You've been signed out on this device. Create your account below or log in with another one.",
};

export function SignupForm({ currentUser = null }: SignupFormProps) {
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState(signupAction, initialAuthState);
  const [resendState, resendFormAction] = useActionState(
    resendVerificationAction,
    initialAuthState,
  );
  const [email, setEmail] = useState("");
  const [dismissedState, setDismissedState] = useState<AuthActionState | null>(
    null,
  );
  // Each submit gets a fresh token that the server echoes back. A reply
  // restored by the router after leaving the page carries an old token, so it
  // can never show the previous address's confirmation screen again.
  const [submissionToken, setSubmissionToken] = useState<string | null>(null);
  const tokenInput = useRef<HTMLInputElement>(null);
  const {
    remainingSeconds,
    active,
    start,
  } = useEmailCooldown(email);
  const handledSignupState = useRef<AuthActionState>(state);
  const handledResendState = useRef<AuthActionState>(resendState);
  const linkMessage = MESSAGES[searchParams.get("message") ?? ""] ?? null;

  // The success screen is tied to the address that was submitted. Once the
  // person asks to start over, hide that reply so a new address gets a clean
  // form instead of the previous address's confirmation screen.
  const confirmed = showsSignupConfirmation(
    state,
    submissionToken,
    dismissedState,
  );

  const startOver = () => {
    setDismissedState(state);
    setEmail("");
  };

  const handleSubmit = () => {
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
    setSubmissionToken(token);
    if (tokenInput.current) {
      tokenInput.current.value = token;
    }
  };

  useEffect(() => {
    // Compare the state object, not the number: a repeat send can report the
    // same 60 seconds and still needs a fresh countdown.
    if (handledSignupState.current === state) {
      return;
    }

    handledSignupState.current = state;
    if (state.cooldownSeconds) {
      start(state.cooldownSeconds);
    }
  }, [state, start]);

  useEffect(() => {
    if (handledResendState.current === resendState) {
      return;
    }

    handledResendState.current = resendState;
    if (resendState.cooldownSeconds) {
      start(resendState.cooldownSeconds);
    }
  }, [resendState, start]);

  useEffect(() => {
    // A page restored from the back/forward cache keeps the DOM and state it
    // had when the person left. Drop the previous reply on a restore so going
    // Back never resurrects the old address's confirmation screen.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      setSubmissionToken(null);
      setDismissedState(null);
      setEmail("");
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>Free to start, no card needed.</CardDescription>
      </CardHeader>

      {currentUser ? (
        <div className="mx-6 mb-4 rounded-lg border border-border/70 bg-muted/40 px-3 py-3 text-sm">
          <p>
            You&apos;re already signed in as{" "}
            <span className="font-medium">{currentUser.email}</span>
            {currentUser.emailVerified ? null : (
              <span className="text-muted-foreground"> (email not verified)</span>
            )}
            .
          </p>
          <p className="mt-1 text-muted-foreground">
            Create a new account below, or switch so the two do not get mixed
            up.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={currentUser.emailVerified ? "/dashboard" : "/verify-email"}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {currentUser.emailVerified ? "Continue to dashboard" : "Verify email"}
            </Link>
            <form action={switchAccountAction}>
              <input type="hidden" name="returnTo" value="signup" />
              <button
                type="submit"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Use another account
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {confirmed ? (
        <>
          <CardContent className="space-y-4">
            <AuthMessage error={state.error} message={state.message} />
            <p className="text-sm text-muted-foreground">
              Open the link in the confirmation email to finish creating your
              account. Check your spam folder if it does not arrive within a
              minute.
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <form action={resendFormAction} className="w-full space-y-2">
              <input type="hidden" name="email" value={email} />
              <AuthMessage
                error={resendState.error}
                message={resendState.message}
              />
              <SubmitButton pendingLabel="Sending…" disabled={active}>
                {active
                  ? `Resend in ${formatCooldown(remainingSeconds)}`
                  : "Resend confirmation email"}
              </SubmitButton>
              <p className="text-center text-xs text-muted-foreground">
                Emails to the same address can be resent once a minute.
              </p>
            </form>

            <Button
              type="button"
              variant="outline"
              onClick={startOver}
              className="w-full"
            >
              Use a different email address
            </Button>
          </CardFooter>
        </>
      ) : (
        <>
          <CardContent className="pb-0">
            <GoogleSignInButton next="/dashboard" />
          </CardContent>

          <div className="my-4 flex items-center gap-3 px-6">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form action={formAction} onSubmit={handleSubmit}>
            <input type="hidden" name="clientToken" ref={tokenInput} />
            <CardContent className="space-y-4">
              <AuthMessage
                error={state === dismissedState ? null : state.error}
                message={
                  (state === dismissedState ? null : state.message) ??
                  linkMessage
                }
              />

              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Ananya Sharma"
                  maxLength={80}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
                <PasswordRequirements />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                  maxLength={MAX_PASSWORD_LENGTH}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="mt-6">
              <SubmitButton pendingLabel="Creating account…">
                Create account
              </SubmitButton>
            </CardFooter>
          </form>
        </>
      )}

      <CardFooter className="flex flex-col gap-3 border-t pt-6">
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          {/* Full reload so the previous signup reply cannot be restored. */}
          <a
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
