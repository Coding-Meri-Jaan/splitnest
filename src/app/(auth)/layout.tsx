import Link from "next/link";

import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col bg-muted/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,color-mix(in_oklch,var(--primary),transparent_88%),transparent_55%),radial-gradient(circle_at_80%_100%,color-mix(in_oklch,var(--primary),transparent_92%),transparent_50%)]"
      />

      <header className="relative flex items-center justify-between px-6 py-5">
        <Link href="/" aria-label="SplitNest home">
          <Logo />
        </Link>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to home
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
