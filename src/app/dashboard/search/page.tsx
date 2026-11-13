import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ComponentType } from "react";
import {
  ArrowRightIcon,
  HandshakeIcon,
  ReceiptTextIcon,
  SearchIcon,
  UserRoundIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { PageHeader } from "@/components/shared/page-header";
import { SearchSuggest } from "@/components/search/search-suggest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { searchEverything } from "@/lib/data/search";
import type { SearchResult } from "@/lib/search";

export const metadata: Metadata = {
  title: "Search",
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Find anything"
        title="Search"
        description="Look through every nest, person, expense, and settlement you can see."
      />

      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ searchParams }: SearchPageProps) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  const outcome = await searchEverything(user.id, params.q);
  const total = outcome.results.length;

  const sections = [
    {
      kind: "group" as const,
      title: "Groups",
      results: outcome.groups,
      icon: UsersRoundIcon,
      tint: "sn-tint-brand",
    },
    {
      kind: "person" as const,
      title: "People",
      results: outcome.people,
      icon: UserRoundIcon,
      tint: "bg-sky-500/10 text-sky-600 ring-sky-500/15",
    },
    {
      kind: "expense" as const,
      title: "Expenses",
      results: outcome.expenses,
      icon: ReceiptTextIcon,
      tint: "bg-amber-500/10 text-amber-600 ring-amber-500/15",
    },
    {
      kind: "settlement" as const,
      title: "Settlements",
      results: outcome.settlements,
      icon: HandshakeIcon,
      tint: "bg-success/10 text-success ring-success/15",
    },
  ].filter((section) => section.results.length > 0);

  return (
    <div className="space-y-5">
      <SearchSuggest
        initialQuery={outcome.query}
        autoFocus={!outcome.query}
        showSubmitButton
        placeholder="Search expenses, groups, people"
        ariaLabel="Search expenses, groups, people"
        inputClassName="h-11"
      />

      {!outcome.query ? (
        <SearchPrompt />
      ) : total === 0 ? (
        <Card className="sn-rise">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl sn-tint-brand">
              <SearchIcon className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">
              No matches for &ldquo;{outcome.query}&rdquo;.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Try a group name, a friend&apos;s name or email, an expense title,
              a category like &ldquo;food&rdquo;, or a settlement note.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/groups" />}
              >
                Browse groups
              </Button>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/dashboard/people" />}
              >
                Browse people
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-muted-foreground"
          >
            {total} {total === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-foreground">
              &ldquo;{outcome.query}&rdquo;
            </span>
          </p>

          <div className="space-y-5">
            {sections.map((section) => (
              <section
                key={section.kind}
                aria-labelledby={`search-${section.kind}-heading`}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <h2
                    id={`search-${section.kind}-heading`}
                    className="font-heading text-base font-semibold tracking-tight"
                  >
                    {section.title}
                  </h2>
                  <Badge variant="outline">{section.results.length}</Badge>
                </div>
                <Card className="overflow-hidden">
                  <ul className="divide-y divide-border/50">
                    {section.results.map((result) => (
                      <li key={result.id}>
                        <SearchResultRow
                          result={result}
                          icon={section.icon}
                          tint={section.tint}
                        />
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface SearchResultRowProps {
  result: SearchResult;
  icon: ComponentType<{ className?: string }>;
  tint: string;
}

function SearchResultRow({ result, icon: Icon, tint }: SearchResultRowProps) {
  return (
    <Link
      href={result.href}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand/[0.03]"
    >
      <span
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tint}`}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {result.subtitle}
        </p>
      </div>

      {result.amount !== undefined ? (
        <Amount
          value={result.amount}
          signed={false}
          className="shrink-0 text-sm"
        />
      ) : (
        <ArrowRightIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      )}
    </Link>
  );
}

function SearchPrompt() {
  return (
    <Card className="sn-rise">
      <CardHeader>
        <CardTitle>Search everything in your nests</CardTitle>
        <CardDescription>
          Start with a name, a nest, an expense, or a category. Results appear
          as soon as you press Enter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li className="rounded-xl border border-border/60 bg-card/50 px-3.5 py-3">
            <span className="font-medium text-foreground">Goa Trip</span> — jump
            straight to a nest.
          </li>
          <li className="rounded-xl border border-border/60 bg-card/50 px-3.5 py-3">
            <span className="font-medium text-foreground">Rishikesh</span> — find
            a person by name or email.
          </li>
          <li className="rounded-xl border border-border/60 bg-card/50 px-3.5 py-3">
            <span className="font-medium text-foreground">dinner</span> — find an
            expense by title or note.
          </li>
          <li className="rounded-xl border border-border/60 bg-card/50 px-3.5 py-3">
            <span className="font-medium text-foreground">food</span> — find
            expenses by category.
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/people" />}
          >
            <UserRoundIcon />
            Search people
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/groups" />}
          >
            <UsersRoundIcon />
            Browse groups
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/activity" />}
          >
            <ReceiptTextIcon />
            View activity
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-11 sn-skeleton rounded-xl" />
      <div className="h-64 sn-skeleton rounded-2xl" />
    </div>
  );
}
