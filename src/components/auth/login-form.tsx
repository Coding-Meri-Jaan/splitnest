"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { loginAction } from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction] = useActionState(loginAction, initialAuthState);

  const next = searchParams.get("next") ?? "/dashboard";
  const linkError =
    searchParams.get("error") === "expired-link"
      ? "That link has expired. Request a new one."
      : null;

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to see who owes whom.</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          <AuthMessage error={state.error ?? linkError} message={state.message} />
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
              required
            />
          </div>

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
        </CardContent>

        <CardFooter className="mt-6 flex flex-col gap-3">
          <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
          <p className="text-center text-sm text-muted-foreground">
            New to SplitNest?{" "}
            <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
