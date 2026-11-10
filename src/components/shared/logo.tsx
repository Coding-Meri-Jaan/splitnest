import { SplitIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-primary via-brand to-fuchsia-500 text-white shadow-lg shadow-brand/30 ring-1 ring-white/25">
        <span
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.55),transparent_55%)]"
        />
        <SplitIcon className="relative size-4.5" strokeWidth={2.4} />
      </span>
      {showText ? (
        <span className="font-heading text-lg font-semibold tracking-tight">
          Split<span className="sn-gradient-text">Nest</span>
        </span>
      ) : null}
    </span>
  );
}
