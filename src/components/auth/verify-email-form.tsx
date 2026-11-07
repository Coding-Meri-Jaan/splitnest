"use client";

import Link from "next/link";
import { useActionState } from "react";

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
import { initialAuthState } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

interface VerifyEmailFormProps {
  email: string;
}

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const [state, formAction] = useActionState(
    resendVerificationAction,
    initialAuthState,
  );

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
          If it never arrived, check spam or send a new one.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <form action={formAction} className="w-full">
          <input type="hidden" name="email" value={email} />
          <SubmitButton pendingLabel="Sending…">
            Resend confirmation email
          </SubmitButton>
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
