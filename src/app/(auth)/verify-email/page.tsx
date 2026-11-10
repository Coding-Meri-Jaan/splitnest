import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { readEmailCooldownSeconds } from "@/lib/auth/email-cooldown-server";
import { getOptionalUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Confirm your email – SplitNest",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[440px] sn-skeleton rounded-3xl" />
      }
    >
      <VerifyEmailScreen />
    </Suspense>
  );
}

async function VerifyEmailScreen() {
  const user = await getOptionalUser();

  if (!user) {
    redirect("/login");
  }

  if (user.emailVerified) {
    redirect("/dashboard");
  }

  const initialCooldownSeconds = await readEmailCooldownSeconds(user.email);

  return (
    <VerifyEmailForm
      email={user.email}
      initialCooldownSeconds={initialCooldownSeconds}
    />
  );
}
