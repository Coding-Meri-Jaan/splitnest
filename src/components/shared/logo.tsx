import { SplitIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className, showText = true }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <SplitIcon className="size-4" />
      </span>
      {showText ? (
        <span className="font-heading text-lg font-semibold tracking-tight">
          SplitNest
        </span>
      ) : null}
    </span>
  );
}
