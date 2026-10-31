import {
  ActivityIcon,
  HandCoinsIcon,
  IndianRupeeIcon,
  ShieldCheckIcon,
  SplitIcon,
  UsersIcon,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: UsersIcon,
    title: "Groups for every crew",
    description:
      "Trips, flats, office lunches, and festive get-togethers — each gets its own nest of people.",
  },
  {
    icon: HandCoinsIcon,
    title: "Clear balances",
    description:
      "See who owes whom at a glance, in Indian Rupees, with simple signed totals.",
  },
  {
    icon: SplitIcon,
    title: "Flexible splitting",
    description:
      "Designed to support equal, unequal, share-based, and percentage splits.",
  },
  {
    icon: IndianRupeeIcon,
    title: "Made for India",
    description:
      "Amounts formatted with the Indian numbering system, ready for UPI-era workflows.",
  },
  {
    icon: ActivityIcon,
    title: "Activity feed",
    description:
      "Every expense and settlement lands in one timeline, so nothing gets lost.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Privacy first",
    description:
      "A clean data boundary from day one, so adding real accounts later stays safe.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything you need to stay square
        </h2>
        <p className="text-muted-foreground">
          SplitNest focuses on the few things that make group money painless,
          and does them well.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="size-5" />
              </span>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
