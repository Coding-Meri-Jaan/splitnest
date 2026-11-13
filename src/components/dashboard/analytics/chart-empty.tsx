import { ChartNoAxesColumnIcon } from "lucide-react";

interface ChartEmptyProps {
  message: string;
  className?: string;
}

/** Consistent empty state for every analytics visual. */
export function ChartEmpty({ message, className }: ChartEmptyProps) {
  return (
    <div
      className={
        "flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center " +
        (className ?? "")
      }
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground/70">
        <ChartNoAxesColumnIcon className="size-4.5" aria-hidden />
      </span>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
