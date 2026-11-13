import { formatPaise, formatSignedPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PaiseAmountProps {
  /** Integer paise. */
  value: number;
  className?: string;
  signed?: boolean;
}

/** Same visual language as `Amount`, but for values that live in paise. */
export function PaiseAmount({ value, className, signed = true }: PaiseAmountProps) {
  const tone =
    value > 0
      ? "text-success"
      : value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        signed && tone,
        className,
      )}
    >
      {signed ? formatSignedPaise(value) : formatPaise(value)}
    </span>
  );
}
