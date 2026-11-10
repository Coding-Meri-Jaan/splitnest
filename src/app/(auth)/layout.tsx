import Link from "next/link";
import {
  LockKeyholeIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  ZapIcon,
} from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { Logo } from "@/components/shared/logo";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar";

const proofPoints = [
  {
    icon: ZapIcon,
    title: "Settle in seconds",
    detail: "The fewest transfers that clear every balance.",
  },
  {
    icon: SmartphoneIcon,
    title: "UPI-ready",
    detail: "Hand off to your payment app without leaving the flow.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Private by design",
    detail: "Your nests are visible only to the people in them.",
  },
];

const sampleBalances = [
  { name: "Aarav", amount: 1240 },
  { name: "Priya", amount: -680 },
  { name: "Rohan", amount: 420 },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sn-aurora relative flex min-h-svh flex-col">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
        <Link
          href="/"
          aria-label="SplitNest home"
          className="sn-focus-ring rounded-xl"
        >
          <Logo />
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          Back to home
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_minmax(0,430px)]">
          <section className="hidden lg:block">
            <div className="sn-rise">
              <Badge
                variant="outline"
                className="h-7 gap-1.5 rounded-full border-brand/20 bg-brand/5 px-3 text-brand"
              >
                <SparklesIcon aria-hidden />
                India-first expense sharing
              </Badge>
              <h1 className="mt-5 font-heading text-4xl leading-[1.05] font-semibold tracking-tighter text-balance xl:text-5xl">
                Money between friends,
                <span className="sn-gradient-text block">
                  minus the awkward.
                </span>
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Track every trip, flat, and team in one calm place. SplitNest
                does the math; you keep the memories.
              </p>
            </div>

            <div className="sn-rise sn-delay-2 relative mt-8 max-w-md">
              <div
                aria-hidden
                className="absolute -inset-2 -z-10 rotate-1 rounded-3xl bg-linear-to-br from-brand/25 via-primary/10 to-success/15 blur-xl"
              />
              <div className="sn-glass relative rounded-3xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-brand/15 to-primary/10 text-xl ring-1 ring-brand/15">
                      🏝️
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Goa trip</p>
                      <p className="text-xs text-muted-foreground">
                        5 people · 1 nest
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Settled up</Badge>
                </div>

                <div className="mt-4 rounded-2xl sn-tint-brand p-3.5">
                  <p className="text-[0.65rem] font-semibold tracking-[0.14em] uppercase opacity-70">
                    Net balance
                  </p>
                  <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">
                    <Amount value={980} />
                  </p>
                </div>

                <ul className="mt-3 space-y-2">
                  {sampleBalances.map((person) => (
                    <li
                      key={person.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <MemberAvatar name={person.name} size="sm" />
                        {person.name}
                      </span>
                      <Amount value={person.amount} className="text-sm" />
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                  <AvatarGroup aria-hidden>
                    {["Aarav", "Priya", "Rohan", "Neha"].map((name) => (
                      <MemberAvatar key={name} name={name} size="sm" />
                    ))}
                  </AvatarGroup>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <LockKeyholeIcon className="size-3.5" aria-hidden />
                    Only your nest sees it
                  </span>
                </div>
              </div>
            </div>

            <ul className="sn-rise sn-delay-3 mt-8 grid max-w-md gap-3">
              {proofPoints.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg sn-tint-brand">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="w-full">
            <div className="mb-6 lg:hidden">
              <p className="sn-eyebrow">Welcome to SplitNest</p>
              <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">
                Split expenses, not friendships.
              </h1>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
