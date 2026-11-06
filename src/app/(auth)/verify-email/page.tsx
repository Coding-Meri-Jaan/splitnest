import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getOptionalUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Confirm your email – SplitNest",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[420px] rounded-xl border border-border/70 bg-card" />
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

  return <VerifyEmailForm email={user.email} />;
}
