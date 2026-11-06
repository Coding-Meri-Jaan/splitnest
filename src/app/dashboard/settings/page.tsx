import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileForm } from "@/components/dashboard/profile-form";
import { SecuritySettings } from "@/components/dashboard/security-settings";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile, sign-in details, and sessions."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>
            {user.needsName
              ? "Add your name so friends see it in “Paid by” and balances."
              : `Signed in as ${user.email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={user.fullName} city={user.city} upiId={user.upiId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Who is signed in here and how to end a session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SecuritySettings
            email={user.email}
            emailVerified={user.emailVerified}
            provider={user.provider}
            lastSignInAt={user.lastSignInAt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
