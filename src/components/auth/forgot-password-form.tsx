"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
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
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialAuthState);

  return (
    <Card className="sn-glass rounded-3xl">
      <CardHeader>
        <p className="sn-eyebrow">Account recovery</p>
        <CardTitle className="font-heading text-3xl tracking-tight">Reset your password</CardTitle>
        <CardDescription>We&apos;ll email you a link to set a new one.</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <AuthMessage error={state.error} message={state.message} />

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
              required
            />
          </div>
        </CardContent>

        <CardFooter className="mt-6 flex flex-col gap-3">
          <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
