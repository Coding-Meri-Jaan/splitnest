import Link from "next/link";

import { Logo } from "@/components/shared/logo";

async function getCopyrightYear(): Promise<number> {
  "use cache";
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const year = await getCopyrightYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            India-first expense sharing for trips, flats, and teams. Track who
            paid, who owes, and settle up over UPI.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-foreground"
          >
            How it works
          </a>
          <Link href="/login" className="transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link
            href="/signup"
            className="transition-colors hover:text-foreground"
          >
            Get started
          </Link>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          © {year} SplitNest. Settlements are recorded, not processed — UPI links
          open your own payment app.
        </p>
      </div>
    </footer>
  );
}
