import { HandCoinsIcon, ReceiptIcon, SmartphoneIcon, UsersIcon } from "lucide-react";

import { proofMembers } from "@/components/landing/preview-data";
import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    step: "01",
    icon: UsersIcon,
    title: "Create a group",
    description:
      "Start a nest for a trip, flat, or team and add the people involved.",
  },
  {
    step: "02",
    icon: ReceiptIcon,
    title: "Add expenses",
    description:
      "Log who paid and how to split it. SplitNest keeps a running total per person.",
  },
  {
    step: "03",
    icon: HandCoinsIcon,
    title: "Settle up",
    description:
      "See the simplest set of transfers that closes every balance.",
  },
];

function StepVisual({ step }: { step: string }) {
  if (step === "01") {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Goa trip</p>
          <Badge variant="outline" className="rounded-full">
            New nest
          </Badge>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <AvatarGroup aria-hidden>
            {proofMembers.map((member) => (
              <MemberAvatar key={member.id} name={member.name} size="sm" />
            ))}
          </AvatarGroup>
          <span className="text-xs text-muted-foreground">Add your crew</span>
        </div>
      </div>
    );
  }

  if (step === "02") {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ReceiptIcon className="size-4 text-muted-foreground" aria-hidden />
            Dinner
          </p>
          <Amount value={2400} signed={false} className="text-sm" />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Paid by Aarav</span>
          <span aria-hidden>·</span>
          <Badge variant="secondary" className="rounded-full">
            Equal · 4 ways
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <MemberAvatar name="Rohan Mehta" size="sm" />
          <span className="truncate">
            <span className="font-medium">Rohan</span> pays{" "}
            <span className="font-medium">Priya</span>
          </span>
        </span>
        <Amount value={900} signed={false} className="shrink-0 text-sm" />
      </div>
      <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand/10 px-2 py-1 text-xs font-medium text-brand">
        <SmartphoneIcon className="size-3.5" aria-hidden />
        Open UPI app
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            From chaos to clear
          </p>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in three steps
          </h2>
          <p className="text-muted-foreground">
            No spreadsheets, no mental math, no awkward reminders.
          </p>
        </div>

        <div className="relative mt-12">
          <div
            aria-hidden
            className="pointer-events-none absolute top-5 right-[16.6667%] left-[16.6667%] hidden h-px bg-linear-to-r from-transparent via-brand/40 to-transparent md:block"
          />

          <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map((step) => (
              <li
                key={step.step}
                className="relative flex flex-col items-start md:items-center"
              >
                <span className="relative z-10 flex size-10 items-center justify-center rounded-full border bg-background text-brand shadow-sm ring-4 ring-muted/40">
                  <step.icon className="size-4" aria-hidden />
                </span>
                <p className="mt-3 text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                  Step {step.step}
                </p>

                <Card className="mt-4 w-full text-left">
                  <CardContent className="space-y-3">
                    <div>
                      <h3 className="font-heading text-lg font-medium">
                        {step.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    <StepVisual step={step.step} />
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
