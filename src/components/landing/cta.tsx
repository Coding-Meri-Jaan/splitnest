import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function CallToAction() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <div className="overflow-hidden rounded-2xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
        <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to settle up faster?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
          Create a free account, start a nest, and settle up over UPI. No card
          needed.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg", variant: "secondary" })}
          >
            Get started free
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
