import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const proofPoints = [
  { label: "Free to start", icon: CheckIcon },
  { label: "Private by design", icon: ShieldCheckIcon },
  { label: "UPI-ready", icon: SmartphoneIcon },
];

export function CallToAction() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="relative isolate overflow-hidden rounded-3xl bg-zinc-950 px-6 py-14 text-center text-zinc-50 ring-1 ring-white/10 sm:px-12 md:py-20 dark:bg-zinc-900">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 size-72 rounded-full bg-brand/30 blur-3xl dark:bg-brand/20" />
          <div className="absolute -right-20 -bottom-24 size-72 rounded-full bg-success/20 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent)]" />
        </div>

        <Badge className="h-7 gap-1.5 rounded-full bg-white/10 px-3 text-white ring-1 ring-white/15">
          <SparklesIcon aria-hidden />
          Your first nest is free
        </Badge>

        <h2 className="mx-auto mt-5 max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ready to settle up faster?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-300 sm:text-lg">
          Create a free account, start a nest, and settle up over UPI. No card
          needed.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 gap-2 bg-white px-5 text-sm text-zinc-950 shadow-lg shadow-black/20 hover:bg-zinc-200 focus-visible:ring-white/40"
            )}
          >
            Get started free
            <ArrowRightIcon aria-hidden />
          </Link>
          <Link
            href="/login"
            className="group inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-zinc-300 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none dark:focus-visible:ring-offset-zinc-900"
          >
            Already have an account? Log in
            <ArrowUpRightIcon
              className="size-4 transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        <ul className="mx-auto mt-8 flex max-w-md flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-400">
          {proofPoints.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-1.5">
              <Icon className="size-3.5 text-zinc-300" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
