"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { SCHEMA_MISSING_DIGEST } from "@/lib/data/errors";

/**
 * Shown when a dashboard query fails - most often because the Supabase
 * migrations have not been applied yet. Production builds strip server error
 * messages, so the cause is detected through the digest set in the data layer.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const looksLikeMissingSchema =
    error.digest === SCHEMA_MISSING_DIGEST ||
    /schema cache|does not exist|could not load/i.test(error.message);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 rounded-xl border bg-card p-6">
      <h1 className="font-heading text-xl font-semibold">
        {looksLikeMissingSchema
          ? "The database is not set up yet"
          : "Something went wrong"}
      </h1>
      <p className="text-sm text-muted-foreground">
        {looksLikeMissingSchema
          ? "Your account is fine and you are signed in. The tables SplitNest needs do not exist yet: run supabase/migrations/0001_init.sql, then 0002_expenses_and_invites.sql, in the Supabase SQL editor, then press Try again."
          : "We could not load this page. Press Try again, and if it keeps happening open the setup report."}
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
