"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { PasswordRequirements } from "@/components/auth/password-requirements";
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
import { updatePasswordAction } from "@/lib/auth/actions";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";
import { initialAuthState } from "@/lib/auth/types";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, initialAuthState);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Choose a new password</CardTitle>
        <CardDescription>You&apos;ll be signed in after saving.</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <AuthMessage error={state.error} message={state.message} />

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New password
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
              Confirm new password
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

        <CardFooter className="mt-6 flex flex-col gap-3">
          <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
