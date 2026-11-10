import type { Metadata } from "next";
import { Suspense } from "react";
import { BadgeCheckIcon, MailIcon } from "lucide-react";

import { ProfileForm } from "@/components/dashboard/profile-form";
import { SecuritySettings } from "@/components/dashboard/security-settings";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile, sign-in details, and sessions."
      />
      <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}

async function SettingsContent() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div className="sn-surface sn-rise relative flex items-center gap-4 overflow-hidden rounded-2xl p-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-8 size-32 rounded-full bg-brand/15 blur-2xl"
        />
        <MemberAvatar
          name={user.fullName || user.email}
          size="lg"
          className="size-14 text-base"
        />
        <div className="relative min-w-0">
          <p className="truncate font-heading text-lg font-semibold tracking-tight">
            {user.fullName || "Add your name"}
          </p>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <MailIcon className="size-3.5 shrink-0" aria-hidden />
            {user.email}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant={user.emailVerified ? "secondary" : "destructive"}>
              {user.emailVerified ? (
                <BadgeCheckIcon aria-hidden />
              ) : null}
              {user.emailVerified ? "Email verified" : "Email not verified"}
            </Badge>
            <Badge variant="outline">{user.provider}</Badge>
          </div>
        </div>
      </div>

      <Card className="sn-rise sn-delay-1">
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

      <Card className="sn-rise sn-delay-2">
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
