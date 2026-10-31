import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Log in · SplitNest",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[420px] rounded-xl border border-border/70 bg-card" />}>
      <LoginForm />
    </Suspense>
  );
}
