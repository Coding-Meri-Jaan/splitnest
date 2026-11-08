"use client";

import { SubmitButton } from "@/components/auth/submit-button";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import {
  logoutAction,
  signOutEverywhereAction,
} from "@/lib/auth/actions";
import {
  EPHEMERAL_IDLE_TIMEOUT_MS,
  REMEMBERED_IDLE_TIMEOUT_MS,
  REMEMBERED_SESSION_MAX_AGE_SECONDS,
  providerLabel,
} from "@/lib/auth/session";

interface SecuritySettingsProps {
  email: string;
  emailVerified: boolean;
  provider: string;
  lastSignInAt: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

function formatDate(value: string | null): string {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function days(ms: number): number {
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function minutes(ms: number): number {
  return Math.round(ms / (60 * 1000));
}

export function SecuritySettings({
  email,
  emailVerified,
  provider,
  lastSignInAt,
}: SecuritySettingsProps) {
  const rememberedDays = Math.round(
    REMEMBERED_SESSION_MAX_AGE_SECONDS / (24 * 60 * 60),
  );

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all font-medium">{email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email status</dt>
          <dd className="font-medium">
            {emailVerified ? "Confirmed" : "Not confirmed"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sign-in method</dt>
          <dd className="font-medium">{providerLabel(provider)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last sign-in</dt>
          <dd className="font-medium">{formatDate(lastSignInAt)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <form action={logoutAction}>
          <SubmitButton
            variant="outline"
            className="w-auto"
            pendingLabel="Signing out…"
          >
            Sign out of this device
          </SubmitButton>
        </form>

        <form action={signOutEverywhereAction}>
          <ConfirmSubmitButton
            variant="destructive"
            className="w-auto"
            confirmLabel="Sign out everywhere"
            confirmTitle="Sign out everywhere?"
            confirmMessage="Every browser and device signed in to this account will need to log in again."
            pendingLabel="Signing out…"
          >
            Sign out everywhere
          </ConfirmSubmitButton>
        </form>
      </div>

      <p className="text-xs text-muted-foreground">
        Sessions refresh automatically. A remembered session lasts up to{" "}
        {rememberedDays} days and ends after {days(REMEMBERED_IDLE_TIMEOUT_MS)}{" "}
        days without activity. Without &ldquo;Keep me signed in&rdquo;, the
        session ends when the browser closes or after{" "}
        {minutes(EPHEMERAL_IDLE_TIMEOUT_MS)} minutes of inactivity. Supabase
        does not expose a list of other active sessions, so the only way to
        revoke them is to sign out everywhere.
      </p>
    </div>
  );
}
