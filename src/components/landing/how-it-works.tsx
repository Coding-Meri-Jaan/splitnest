import { HandCoinsIcon, ReceiptIcon, UsersIcon } from "lucide-react";

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

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Up and running in three steps
          </h2>
          <p className="text-muted-foreground">
            No spreadsheets, no mental math, no awkward reminders.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.step}
              className="relative rounded-xl bg-background p-6 ring-1 ring-foreground/10"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="font-heading text-3xl font-semibold text-muted-foreground/40">
                  {step.step}
                </span>
              </div>
              <h3 className="mt-4 font-heading text-lg font-medium">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
