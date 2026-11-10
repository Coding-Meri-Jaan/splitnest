import {
  ActivityIcon,
  CheckIcon,
  EqualIcon,
  HandCoinsIcon,
  IndianRupeeIcon,
  LockKeyholeIcon,
  PercentIcon,
  PieChartIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
  SplitIcon,
  UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { balancePreview, proofMembers } from "@/components/landing/preview-data";
import { Amount } from "@/components/shared/amount";
import { Logo } from "@/components/shared/logo";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

const splitModes = [
  { icon: EqualIcon, label: "Equal", hint: "The same amount for everyone" },
  {
    icon: SlidersHorizontalIcon,
    label: "Unequal",
    hint: "Exact amounts per person",
  },
  { icon: PieChartIcon, label: "Shares", hint: "Split by portions" },
  { icon: PercentIcon, label: "Percentages", hint: "Split by percent" },
];

const activityPreview = [
  {
    label: "Dinner by the beach",
    detail: "Aarav paid · split equally",
    amount: 2400,
  },
  {
    label: "Cab to the airport",
    detail: "Priya paid · split by shares",
    amount: 860,
  },
  {
    label: "Settlement recorded",
    detail: "Rohan paid Priya",
    amount: 900,
  },
];

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mt-1 flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/15">
      {children}
    </span>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
          Less chasing, more living
        </p>
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to stay square
        </h2>
        <p className="text-muted-foreground">
          SplitNest focuses on the few things that make group money painless,
          and does them well.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden md:col-span-2 lg:row-span-2">
          <div
            aria-hidden
            className="absolute -top-24 -right-20 size-64 rounded-full bg-brand/10 blur-3xl"
          />
          <CardHeader>
            <FeatureIcon>
              <HandCoinsIcon className="size-5" aria-hidden />
            </FeatureIcon>
            <h3 className="font-heading text-xl leading-snug font-medium">
              Balances that settle themselves
            </h3>
            <CardDescription className="max-w-md text-base">
              See who owes whom at a glance, then clear the whole nest with the
              fewest possible transfers.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="rounded-2xl border bg-background/80 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Logo showText={false} />
                  <div>
                    <p className="text-sm font-medium">Goa trip</p>
                    <p className="text-xs text-muted-foreground">
                      5 people · 1 nest
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1 rounded-full">
                  <ScaleIcon aria-hidden />
                  Simplified
                </Badge>
              </div>

              <ul className="mt-3 space-y-2.5">
                {balancePreview.map(({ balance, member }) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MemberAvatar name={member.name} size="sm" />
                      <span className="truncate text-sm">{member.name}</span>
                    </span>
                    <Amount
                      value={balance.amount}
                      className="shrink-0 text-sm"
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-xs font-medium text-success">
                <CheckIcon className="size-3.5 shrink-0" aria-hidden />
                Fewest transfers, no loops
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UsersIcon className="size-3.5" aria-hidden />
                  Groups for every crew
                </p>
                <p className="mt-1.5 text-sm font-medium">
                  Trips, flats, office lunches
                </p>
              </div>
              <div className="rounded-xl border bg-muted/40 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IndianRupeeIcon className="size-3.5" aria-hidden />
                  Made for India
                </p>
                <p className="mt-1.5 text-sm font-medium">
                  Indian numbering, UPI-era flows
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden md:col-span-2 lg:col-span-1 lg:row-span-2">
          <div
            aria-hidden
            className="absolute -bottom-20 -left-16 size-56 rounded-full bg-success/10 blur-3xl"
          />
          <CardHeader>
            <FeatureIcon>
              <SplitIcon className="size-5" aria-hidden />
            </FeatureIcon>
            <h3 className="font-heading text-xl leading-snug font-medium">
              Split it your way
            </h3>
            <CardDescription className="text-base">
              Equal, unequal, shares, or percentages. Pick whatever fits the
              expense.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-3">
            <ul className="space-y-2">
              {splitModes.map(({ icon: Icon, label, hint }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border bg-background/70 px-3 py-2"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  Dinner · ₹2,400 split equally
                </span>
                <Badge variant="secondary" className="rounded-full">
                  ₹600 each
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <AvatarGroup aria-hidden>
                  {proofMembers.map((member) => (
                    <MemberAvatar
                      key={member.id}
                      name={member.name}
                      size="sm"
                    />
                  ))}
                </AvatarGroup>
                <span className="text-xs text-muted-foreground">4 ways</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-10 -right-10 size-32 rounded-full bg-brand/10 blur-2xl"
          />
          <CardHeader>
            <FeatureIcon>
              <SmartphoneIcon className="size-5" aria-hidden />
            </FeatureIcon>
            <h3 className="font-heading text-base leading-snug font-medium">
              UPI-ready handoffs
            </h3>
            <CardDescription>
              Settlement links open your own payment app. SplitNest records
              payments; it never holds your money.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-background text-brand ring-1 ring-border">
                  <SmartphoneIcon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-medium">Pay via UPI</p>
                  <p className="text-xs text-muted-foreground">
                    Opens your payment app
                  </p>
                </div>
              </div>
              <LockKeyholeIcon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <FeatureIcon>
              <ActivityIcon className="size-5" aria-hidden />
            </FeatureIcon>
            <h3 className="font-heading text-base leading-snug font-medium">
              One shared timeline
            </h3>
            <CardDescription>
              Every expense and settlement lands in the same feed, so nothing
              gets lost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {activityPreview.map(({ label, detail, amount }) => (
                <li key={label} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                  <Amount
                    value={amount}
                    signed={false}
                    className="shrink-0 text-xs"
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card
          id="security"
          className="relative scroll-mt-24 overflow-hidden md:col-span-2 lg:col-span-1"
        >
          <div
            aria-hidden
            className="absolute -bottom-12 -left-12 size-40 rounded-full bg-success/10 blur-2xl"
          />
          <CardHeader>
            <FeatureIcon>
              <ShieldCheckIcon className="size-5" aria-hidden />
            </FeatureIcon>
            <h3 className="font-heading text-base leading-snug font-medium">
              Private by design
            </h3>
            <CardDescription>
              A clean data boundary from day one, so adding real accounts later
              stays safe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <LockKeyholeIcon
                  className="size-4 text-success"
                  aria-hidden
                />
                Your nest, your data
              </p>
              <p className="text-xs text-muted-foreground">
                Designed so real accounts can be added safely later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
