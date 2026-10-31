import Link from "next/link";
import { ArrowRightIcon, CheckIcon, SparklesIcon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { balances, getMember, summary } from "@/data/sample-data";
import type { Balance, Member } from "@/types";

const trustPoints = [
  "Sample data included",
  "No sign-up needed",
  "Works great on mobile",
];

export function Hero() {
  const previewBalances = balances
    .slice(0, 3)
    .map((balance) => ({ balance, member: getMember(balance.memberId) }))
    .filter(
      (item): item is { balance: Balance; member: Member } =>
        Boolean(item.member)
    );

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-muted/60 to-transparent" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <Badge variant="secondary" className="gap-1.5">
            <SparklesIcon className="size-3" />
            India-first expense sharing
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Split expenses, not friendships.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            SplitNest keeps every trip, flat, and team in sync — track who paid,
            who owes, and settle up in ₹ without the spreadsheet chaos.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
              Open the dashboard
              <ArrowRightIcon />
            </Link>
            <a
              href="#how-it-works"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              See how it works
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm text-muted-foreground">
            {trustPoints.map((point) => (
              <li key={point} className="flex items-center gap-1.5">
                <CheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <Card className="mx-auto w-full max-w-sm shadow-lg">
            <CardHeader>
              <CardDescription>Your net balance</CardDescription>
              <CardTitle className="text-3xl">
                <Amount value={summary.netBalance} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-3">
                  <p className="text-xs text-muted-foreground">You are owed</p>
                  <Amount
                    value={summary.youAreOwed}
                    signed={false}
                    className="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div className="rounded-lg bg-rose-500/10 p-3">
                  <p className="text-xs text-muted-foreground">You owe</p>
                  <Amount
                    value={summary.youOwe}
                    signed={false}
                    className="text-rose-600 dark:text-rose-400"
                  />
                </div>
              </div>
              <ul className="space-y-2.5">
                {previewBalances.map(({ balance, member }) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex items-center gap-2">
                      <MemberAvatar name={member.name} size="sm" />
                      <span className="text-sm">{member.name}</span>
                    </span>
                    <Amount value={balance.amount} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
