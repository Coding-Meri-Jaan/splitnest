"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthMessage } from "@/components/auth/auth-message";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
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
import { signupAction } from "@/lib/auth/actions";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";
import { initialAuthState } from "@/lib/auth/types";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, initialAuthState);

  const confirmed = Boolean(state.message);

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Create your account</CardTitle>
        <CardDescription>Free to start, no card needed.</CardDescription>
      </CardHeader>

      {confirmed ? (
        <CardContent>
          <AuthMessage error={state.error} message={state.message} />
        </CardContent>
      ) : (
        <>
          <CardContent className="pb-0">
            <GoogleSignInButton next="/dashboard" remember />
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
              <AuthMessage error={state.error} message={state.message} />

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
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
