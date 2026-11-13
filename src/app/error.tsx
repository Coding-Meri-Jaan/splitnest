"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Catches errors thrown while rendering a root-level page. This boundary sits
 * inside the root layout, so it keeps the app's fonts and styles; failures in
 * the layout itself are handled by global-error.tsx instead.
 */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col justify-center gap-4 px-6 py-12">
      <p className="sn-eyebrow">Something went wrong</p>
      <h1 className="font-heading text-2xl font-semibold">
        SplitNest hit an unexpected error
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Nothing was saved or deleted. Try again; if the page keeps failing,
        head back home and reload.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={retry}>Try again</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
