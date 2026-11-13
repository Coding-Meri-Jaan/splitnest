import { ArrowDownLeftIcon, ArrowUpRightIcon, ScaleIcon } from "lucide-react";

import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PaidVsShareProps {
  paidPaise: number;
  sharePaise: number;
  differencePaise: number;
  averageExpensePaise: number;
  averageSharePaise: number;
}

export function PaidVsShare({
  paidPaise,
  sharePaise,
  differencePaise,
  averageExpensePaise,
  averageSharePaise,
}: PaidVsShareProps) {
  if (paidPaise === 0 && sharePaise === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground/70">
          <ScaleIcon className="size-4.5" aria-hidden />
        </span>
        <p className="max-w-xs text-sm text-muted-foreground">
          Nothing to compare yet. Log an expense and this card shows whether you
          fronted more than your share.
        </p>
      </div>
    );
  }

  const max = Math.max(paidPaise, sharePaise, 1);
  const fronted = differencePaise > 0;

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="space-y-3.5">
        <ComparisonBar
          label="You paid"
          valuePaise={paidPaise}
          widthPercent={(paidPaise / max) * 100}
          color="var(--chart-1)"
        />
        <ComparisonBar
          label="Your share"
          valuePaise={sharePaise}
          widthPercent={(sharePaise / max) * 100}
          color="var(--chart-2)"
        />
      </div>

      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-sm",
          differencePaise === 0
            ? "bg-muted/50 text-muted-foreground"
            : fronted
              ? "bg-success/8 text-success"
              : "bg-brand/8 text-brand",
        )}
      >
        {differencePaise === 0 ? (
          <ScaleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : fronted ? (
          <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <ArrowDownLeftIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        <p>
          {differencePaise === 0
            ? "You paid exactly your share across these expenses."
            : fronted
              ? `You fronted ${formatPaise(differencePaise)} more than your share. The group owes that back once your settlements are applied.`
              : `Others covered ${formatPaise(-differencePaise)} of your share. You owe that back unless it was a treat.`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 border-t border-border/50 pt-3">
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Average bill
          </dt>
          <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
            {formatPaise(averageExpensePaise)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Average share
          </dt>
          <dd className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
            {formatPaise(averageSharePaise)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

interface ComparisonBarProps {
  label: string;
  valuePaise: number;
  widthPercent: number;
  color: string;
}

function ComparisonBar({
  label,
  valuePaise,
  widthPercent,
  color,
}: ComparisonBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold tabular-nums">{formatPaise(valuePaise)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(widthPercent, valuePaise > 0 ? 2 : 0)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
