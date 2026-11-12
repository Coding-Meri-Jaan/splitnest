import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getOptionalUser } from "@/lib/auth/user";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[560px] sn-skeleton rounded-3xl" />
      }
    >
      <LoginScreen />
    </Suspense>
  );
}

async function LoginScreen() {
  const user = await getOptionalUser();

  return (
    <LoginForm
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
