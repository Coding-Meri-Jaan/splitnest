import type { ComponentType, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SummaryTone = "positive" | "negative" | "neutral";

const toneStyles: Record<SummaryTone, string> = {
  positive: "bg-success/12 text-success ring-1 ring-success/20",
  negative: "bg-destructive/10 text-destructive ring-1 ring-destructive/15",
  neutral: "sn-tint-brand ring-1 ring-brand/15",
};

const glowStyles: Record<SummaryTone, string> = {
  positive: "bg-success/15",
  negative: "bg-destructive/10",
  neutral: "bg-brand/15",
};

interface SummaryCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: SummaryTone;
  className?: string;
}

export function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: SummaryCardProps) {
  return (
    <Card
      size="sm"
      className={cn("sn-hover-lift relative overflow-hidden", className)}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-8 size-28 rounded-full blur-2xl",
          glowStyles[tone]
        )}
      />
      <CardContent className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading text-2xl font-semibold tracking-tight">
            {value}
          </p>
          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            toneStyles[tone]
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  );
}
