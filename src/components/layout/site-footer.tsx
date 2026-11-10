import Link from "next/link";
import { IndianRupeeIcon, ShieldCheckIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";

async function getCopyrightYear(): Promise<number> {
  "use cache";
  return new Date().getFullYear();
}

const linkClass =
  "rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none";

export async function SiteFooter() {
  const year = await getCopyrightYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm space-y-4">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              India-first expense sharing for trips, flats, and teams. Track who
              paid, who owes, and settle up over UPI.
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-4 text-success" aria-hidden />
              Settlements recorded, not processed.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.18em] uppercase">
              Product
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="#features" className={linkClass}>
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={linkClass}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#security" className={linkClass}>
                  Security
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold tracking-[0.18em] uppercase">
              Get started
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/signup" className={linkClass}>
                  Create an account
                </Link>
              </li>
              <li>
                <Link href="/login" className={linkClass}>
                  Log in
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {year} SplitNest. Settlements are recorded, not processed — UPI
            links open your own payment app.
          </p>
          <p className="flex items-center gap-1.5">
            <IndianRupeeIcon className="size-3.5" aria-hidden />
            Built for India
          </p>
        </div>
      </div>
    </footer>
  );
}
