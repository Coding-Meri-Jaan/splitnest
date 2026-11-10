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
      ? "text-success"
      : value < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        signed && tone,
        className
      )}
    >
      {signed ? formatSignedINR(value) : formatINR(value)}
    </span>
  );
}
