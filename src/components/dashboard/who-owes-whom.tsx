"use client";

import { SearchIcon } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WhoOwesWhomPerson {
  id: string;
  name: string;
  email?: string;
  /** Positive: they owe you. Negative: you owe them. Zero: settled. */
  amount: number;
  groupCount?: number;
}

type BalanceDirection = "all" | "owe" | "owed" | "settled";

export interface WhoOwesWhomProps {
  people: WhoOwesWhomPerson[];
  title?: string;
  description?: string;
  className?: string;
  emptyMessage?: string;
  searchable?: boolean;
}

const FILTERS: { value: BalanceDirection; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owe", label: "You owe" },
  { value: "owed", label: "Owed to you" },
  { value: "settled", label: "Settled" },
];

const EMPTY_BY_DIRECTION: Record<BalanceDirection, string> = {
  all: "No people to show.",
  owe: "You do not owe anyone right now.",
  owed: "Nobody owes you right now.",
  settled: "No one is settled up yet.",
};

function matchesDirection(amount: number, direction: BalanceDirection) {
  if (direction === "owe") return amount < 0;
  if (direction === "owed") return amount > 0;
  if (direction === "settled") return amount === 0;
  return true;
}

function balanceLabel(amount: number) {
  if (amount > 0) return "Owes you";
  if (amount < 0) return "You owe them";
  return "Settled up";
}

function comparePeople(a: WhoOwesWhomPerson, b: WhoOwesWhomPerson) {
  // Settled people belong at the bottom regardless of the active filter.
  if (a.amount === 0 && b.amount !== 0) return 1;
  if (b.amount === 0 && a.amount !== 0) return -1;

  const byAbsoluteAmount = Math.abs(b.amount) - Math.abs(a.amount);
  if (byAbsoluteAmount !== 0) return byAbsoluteAmount;

  return a.name.localeCompare(b.name);
}

function personMeta(person: WhoOwesWhomPerson) {
  return [
    person.email,
    person.groupCount === undefined
      ? null
      : `${person.groupCount} ${person.groupCount === 1 ? "shared group" : "shared groups"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function WhoOwesWhom({
  people,
  title = "Who owes whom",
  description = "Search and filter by balance direction.",
  className,
  emptyMessage = "No people to show yet.",
  searchable = true,
}: WhoOwesWhomProps) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<BalanceDirection>("all");
  const searchId = useId();

  const counts = useMemo<Record<BalanceDirection, number>>(() => {
    const next: Record<BalanceDirection, number> = {
      all: people.length,
      owe: 0,
      owed: 0,
      settled: 0,
    };

    for (const person of people) {
      if (person.amount > 0) next.owed += 1;
      else if (person.amount < 0) next.owe += 1;
      else next.settled += 1;
    }

    return next;
  }, [people]);

  const totals = useMemo(() => {
    let owedToYou = 0;
    let youOwe = 0;

    for (const person of people) {
      if (person.amount > 0) owedToYou += person.amount;
      else if (person.amount < 0) youOwe += Math.abs(person.amount);
    }

    return { owedToYou, youOwe, net: owedToYou - youOwe };
  }, [people]);

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return people
      .filter(
        (person) =>
          matchesDirection(person.amount, direction) &&
          (!normalizedQuery ||
            person.name.toLowerCase().includes(normalizedQuery) ||
            person.email?.toLowerCase().includes(normalizedQuery)),
      )
      .sort(comparePeople);
  }, [people, direction, query]);

  const emptyText =
    people.length === 0
      ? emptyMessage
      : query.trim()
        ? `No people match “${query.trim()}”.`
        : EMPTY_BY_DIRECTION[direction];

  const resultCount = `${filteredPeople.length} of ${people.length} ${
    people.length === 1 ? "person" : "people"
  }`;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="flex flex-wrap items-start gap-x-6 gap-y-2">
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">Owed to you</dt>
            <dd>
              <Amount
                value={totals.owedToYou}
                signed={false}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">You owe</dt>
            <dd>
              <Amount
                value={totals.youOwe}
                signed={false}
                className="text-rose-600 dark:text-rose-400"
              />
            </dd>
          </div>
          <div className="space-y-0.5">
            <dt className="text-xs text-muted-foreground">Net</dt>
            <dd>
              <Amount value={totals.net} />
            </dd>
          </div>
        </dl>

        {searchable ? (
          <div className="relative">
            <label htmlFor={searchId} className="sr-only">
              Search people
            </label>
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="pl-8"
            />
          </div>
        ) : null}

        <div
          role="group"
          aria-label="Filter by balance direction"
          className="flex flex-wrap gap-1.5"
        >
          {FILTERS.map((filter) => {
            const isActive = direction === filter.value;

            return (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "outline"}
                aria-pressed={isActive}
                onClick={() => setDirection(filter.value)}
              >
                {filter.label}
                <Badge variant="outline" className="tabular-nums">
                  {counts[filter.value]}
                </Badge>
              </Button>
            );
          })}
        </div>

        <p
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-muted-foreground"
        >
          Showing {resultCount}
        </p>

        {filteredPeople.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <ul className="divide-y">
            {filteredPeople.map((person) => {
              const meta = personMeta(person);

              return (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <MemberAvatar name={person.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {person.name}
                      </p>
                      {meta ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {meta}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <Amount value={person.amount} className="block" />
                    <p className="text-xs text-muted-foreground">
                      {balanceLabel(person.amount)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
