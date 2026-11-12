import type { Metadata } from "next";
import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";
import { getOptionalUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[680px] sn-skeleton rounded-3xl" />
      }
    >
      <SignupScreen />
    </Suspense>
  );
}

async function SignupScreen() {
  const user = await getOptionalUser();

  return (
    <SignupForm
      currentUser={
        user
          ? {
              email: user.email,
              fullName: user.fullName,
              emailVerified: user.emailVerified,
            }
          : null
      }
    />
  );
}
