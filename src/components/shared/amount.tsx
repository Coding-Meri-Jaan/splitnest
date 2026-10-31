import { formatINR, formatSignedINR } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AmountProps {
  value: number;
  className?: string;
  signed?: boolean;
}

export function Amount({ value, className, signed = true }: AmountProps) {
  const tone =
    value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : value < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        signed && tone,
        className
      )}
    >
      {signed ? formatSignedINR(value) : formatINR(value)}
    </span>
  );
}
