"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/shared/logo";

interface SmartLogoLinkProps {
  className?: string;
  showText?: boolean;
  ariaLabel?: string;
}

/**
 * The marketing header and auth pages are shared by signed-in and signed-out
 * visitors. Ask the server once which one this is, then send signed-in people
 * to their dashboard and everyone else to the home page.
 *
 * The default is home, so an unfinished lookup can never bounce anyone to
 * /login - which is the bug this component exists to prevent.
 */
export function SmartLogoLink({
  className,
  showText = true,
  ariaLabel = "SplitNest home",
}: SmartLogoLinkProps) {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { signedIn?: unknown } | null) => {
        if (data?.signedIn === true) setSignedIn(true);
      })
      .catch(() => {
        // Home stays the safe fallback when the status check fails.
      });

    return () => controller.abort();
  }, []);

  return (
    <Link
      href={signedIn ? "/dashboard" : "/"}
      aria-label={ariaLabel}
      className={className}
    >
      <Logo showText={showText} />
    </Link>
  );
}
