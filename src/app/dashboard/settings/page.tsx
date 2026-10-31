import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileForm } from "@/components/dashboard/profile-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Settings" description="How you appear to the people you split with." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>Signed in as {user.email}</CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileForm fullName={user.fullName} city={user.city} upiId={user.upiId} />
      </CardContent>
    </Card>
  );
}
