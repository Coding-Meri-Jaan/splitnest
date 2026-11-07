"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  resendVerificationAction,
  switchAccountAction,
} from "@/lib/auth/actions";
import { formatCooldown } from "@/lib/auth/email-cooldown";
import { initialAuthState, type AuthActionState } from "@/lib/auth/types";
import { useEmailCooldown } from "@/lib/auth/use-email-cooldown";
import { cn } from "@/lib/utils";

interface VerifyEmailFormProps {
  email: string;
  initialCooldownSeconds?: number;
}

export function VerifyEmailForm({
  email,
  initialCooldownSeconds = 0,
}: VerifyEmailFormProps) {
  const [state, formAction] = useActionState(
    resendVerificationAction,
    initialAuthState,
  );
  const { remainingSeconds, active, start } = useEmailCooldown(
    email,
    initialCooldownSeconds,
  );
  const handledState = useRef<AuthActionState>(state);

  useEffect(() => {
    // A new state object means a new server reply, even when the cooldown
    // happens to be the same number of seconds as last time.
    if (handledState.current === state) {
      return;
    }

    handledState.current = state;
    if (state.cooldownSeconds) {
      start(state.cooldownSeconds);
    }
  }, [state, start]);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Confirm your email</CardTitle>
        <CardDescription>
          We need to confirm that <span className="font-medium">{email}</span> is
          yours before you can open your nests.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AuthMessage error={state.error} message={state.message} />
        <p className="text-sm text-muted-foreground">
          Open the link in the confirmation email, then come back to this page.
          If it never arrived, check spam first — delivery can take a minute.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <form action={formAction} className="w-full space-y-2">
          <input type="hidden" name="email" value={email} />
          <SubmitButton pendingLabel="Sending…" disabled={active}>
            {active
              ? `Resend in ${formatCooldown(remainingSeconds)}`
              : "Resend confirmation email"}
          </SubmitButton>
          <p className="text-center text-xs text-muted-foreground">
            Emails to the same address can be resent once a minute.
          </p>
        </form>

        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          I&apos;ve confirmed my email
        </Link>

        <form action={switchAccountAction} className="w-full">
          <button
            type="submit"
            className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Sign in with a different account
          </button>
        </form>
      </CardFooter>
    </Card>
  );
}
