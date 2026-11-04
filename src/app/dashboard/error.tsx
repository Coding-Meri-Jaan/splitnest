"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Shown when a dashboard query fails - most often because the Supabase
 * migrations have not been applied yet. The raw error stays in the server log;
 * visitors get a pointer to the setup check instead of a stack trace.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const looksLikeMissingSchema =
    /could not load|schema cache|does not exist/i.test(error.message);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl border bg-card p-6">
      <h1 className="font-heading text-xl font-semibold">
        {looksLikeMissingSchema
          ? "The database is not set up yet"
          : "Something went wrong"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {looksLikeMissingSchema
          ? "Your account is fine, but the tables SplitNest needs do not exist yet. Run supabase/migrations/0001_init.sql and then 0002_expenses_and_invites.sql in the Supabase SQL editor."
          : "We could not load this page. Try again, and if it keeps happening check the setup report."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/api/health"
          className={buttonVariants({ variant: "outline" })}
        >
          Open setup report
        </Link>
      </div>
    </div>
  );
}
