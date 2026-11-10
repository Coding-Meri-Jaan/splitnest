import { CallToAction } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="absolute top-4 left-4 z-50 -translate-y-24 rounded-md bg-background px-4 py-2 text-sm font-medium shadow-lg ring-1 ring-border transition-transform focus:translate-y-0 focus:ring-2 focus:ring-ring focus:outline-none"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Hero />
        <Features />
        <HowItWorks />
        <CallToAction />
      </main>
      <SiteFooter />
    </div>
  );
}
