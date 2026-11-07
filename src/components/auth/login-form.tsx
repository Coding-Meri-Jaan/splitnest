"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SubmitButton } from "@/components/auth/submit-button";
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
  loginAction,
  resendVerificationAction,
  switchAccountAction,
} from "@/lib/auth/actions";
import { formatCooldown } from "@/lib/auth/email-cooldown";
import { safePath } from "@/lib/auth/safe-path";
import {
  EPHEMERAL_IDLE_TIMEOUT_MS,
  REMEMBERED_IDLE_TIMEOUT_MS,
  REMEMBERED_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import {
  initialAuthState,
  type AuthActionState,
  type CurrentSession,
} from "@/lib/auth/types";
import { useEmailCooldown } from "@/lib/auth/use-email-cooldown";

interface LoginFormProps {
  currentUser?: CurrentSession | null;
}

const LINK_ERRORS: Record<string, string> = {
  "expired-link": "That link has expired. Request a new one.",
  "session-expired":
    "Your session expired after a period of inactivity. Sign in again.",
  oauth: "Google sign-in didn't finish. Please try again.",
  "oauth-failed":
    "Google sign-in could not be completed because the sign-in request expired. Please try again.",
};

const MESSAGES: Record<string, string> = {
  "switched-account":
    "You've been signed out on this device. Sign in with another account.",
  "signed-out-everywhere": "You've been signed out on every device.",
};

export function LoginForm({ currentUser = null }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState(loginAction, initialAuthState);
  const [resendState, resendFormAction] = useActionState(
    resendVerificationAction,
    initialAuthState,
  );
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const {
    remainingSeconds: resendRemaining,
    active: resendActive,
    start: startResendCooldown,
  } = useEmailCooldown(email);
  const handledResendState = useRef<AuthActionState>(resendState);

  useEffect(() => {
    // The state object is new for every reply, so a second send with the same
    // number of seconds still restarts the countdown.
    if (handledResendState.current === resendState) {
      return;
    }

    handledResendState.current = resendState;
    if (resendState.cooldownSeconds) {
      startResendCooldown(resendState.cooldownSeconds);
    }
  }, [resendState, startResendCooldown]);

  const next = safePath(searchParams.get("next"));
  const linkError = LINK_ERRORS[searchParams.get("error") ?? ""] ?? null;
  const linkMessage = MESSAGES[searchParams.get("message") ?? ""] ?? null;

  const ephemeralMinutes = Math.round(EPHEMERAL_IDLE_TIMEOUT_MS / 60_000);
  const rememberedDays = Math.round(
    REMEMBERED_SESSION_MAX_AGE_SECONDS / (24 * 60 * 60),
  );
  const rememberedIdleDays = Math.round(
    REMEMBERED_IDLE_TIMEOUT_MS / (24 * 60 * 60 * 1000),
  );

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to see who owes whom.</CardDescription>
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
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href={currentUser.emailVerified ? next : "/verify-email"}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {currentUser.emailVerified ? "Continue to dashboard" : "Verify email"}
            </Link>
            <form action={switchAccountAction}>
              <input type="hidden" name="next" value={next} />
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

      <CardContent className="pb-0">
        <GoogleSignInButton next={next} remember={remember} />
      </CardContent>

      <div className="my-4 flex items-center gap-3 px-6">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          or
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <AuthMessage
            error={state.error ?? linkError}
            message={state.message ?? linkMessage}
          />
          <input type="hidden" name="next" value={next} />

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

          {state.errorCode === "email_not_confirmed" ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">
                Need a fresh confirmation link?
              </p>
              <AuthMessage
                error={resendState.error}
                message={resendState.message}
              />
              <button
                type="submit"
                formAction={resendFormAction}
                formNoValidate
                disabled={resendActive}
                className="font-medium text-foreground underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resendActive
                  ? `Resend in ${formatCooldown(resendRemaining)}`
                  : "Resend confirmation email"}
              </button>
              <p className="text-xs text-muted-foreground">
                Emails to the same address can be resent once a minute. Check
                your inbox and spam folder first.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Keep me signed in on this device
              <span className="block text-xs text-muted-foreground">
                Off signs you out when the browser closes or after{" "}
                {ephemeralMinutes} minutes of inactivity. On lasts up to{" "}
                {rememberedDays} days, and ends after {rememberedIdleDays} days
                without activity.
              </span>
            </span>
          </label>
        </CardContent>

        <CardFooter className="mt-6 flex flex-col gap-3">
          <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            New to SplitNest?{" "}
            {/* A full document load guarantees a clean signup form; a client
                navigation can restore the previous address's confirmation
                state from the router cache. */}
            <a
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
