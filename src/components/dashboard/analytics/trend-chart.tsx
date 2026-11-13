import { formatCompactINR, formatPaise } from "@/lib/format";
import type { TrendGranularity, TrendPoint } from "@/lib/analytics";

import { ChartEmpty } from "./chart-empty";

interface TrendChartProps {
  points: TrendPoint[];
  maxPaise: number;
  granularity: TrendGranularity;
  truncated: boolean;
}

function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 2.5
          ? 2.5
          : normalized <= 5
            ? 5
            : 10;
  return step * magnitude;
}

/**
 * Two-series column chart drawn as plain SVG. No chart dependency and no
 * client JavaScript: `<title>` gives every bar a native tooltip, and the
 * legend plus screen-reader summary keep it usable without hovering.
 */
export function TrendChart({
  points,
  maxPaise,
  granularity,
  truncated,
}: TrendChartProps) {
  if (points.length === 0 || maxPaise <= 0) {
    return (
      <ChartEmpty message="No expenses match these filters yet. Try a wider period or clear a filter." />
    );
  }

  const width = Math.max(points.length * 62, 360);
  const height = 250;
  const padding = { top: 16, right: 14, bottom: 38, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const slot = plotWidth / points.length;
  const barWidth = Math.min(16, Math.max(7, slot * 0.26));
  const gap = Math.max(2, barWidth * 0.22);
  const axisMax = niceCeil(maxPaise);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => axisMax * fraction);
  const labelEvery = Math.max(1, Math.ceil(points.length / 10));

  const periodLabel = granularity === "monthly" ? "month" : "year";

  return (
    <figure className="space-y-3">
      <div className="sn-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Spending by ${periodLabel}. Two bars per ${periodLabel}: amount you paid and your personal share.`}
          className="h-auto max-w-none"
        >
          <text
            x={0}
            y={12}
            fontSize={10}
            fill="var(--muted-foreground)"
            className="font-semibold tracking-wide uppercase"
          >
            ₹
          </text>

          {ticks.map((tick) => {
            const y = padding.top + plotHeight - (tick / axisMax) * plotHeight;
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={1}
                  strokeDasharray={tick === 0 ? undefined : "3 5"}
                  opacity={tick === 0 ? 0.9 : 0.55}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--muted-foreground)"
                >
                  {formatCompactINR(tick)}
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const center = padding.left + slot * (index + 0.5);
            const paidHeight = (point.paidPaise / axisMax) * plotHeight;
            const shareHeight = (point.sharePaise / axisMax) * plotHeight;
            const baseline = padding.top + plotHeight;
            const showLabel = index % labelEvery === 0 || index === points.length - 1;

            return (
              <g key={point.key}>
                {point.paidPaise > 0 ? (
                  <rect
                    x={center - barWidth - gap / 2}
                    y={baseline - paidHeight}
                    width={barWidth}
                    height={Math.max(paidHeight, 1.5)}
                    rx={3}
                    fill="var(--chart-1)"
                    className="transition-opacity hover:opacity-70"
                  >
                    <title>
                      {`${point.label}: you paid ${formatPaise(point.paidPaise)} across ${point.count} ${point.count === 1 ? "expense" : "expenses"}`}
                    </title>
                  </rect>
                ) : null}
                {point.sharePaise > 0 ? (
                  <rect
                    x={center + gap / 2}
                    y={baseline - shareHeight}
                    width={barWidth}
                    height={Math.max(shareHeight, 1.5)}
                    rx={3}
                    fill="var(--chart-2)"
                    className="transition-opacity hover:opacity-70"
                  >
                    <title>
                      {`${point.label}: your share was ${formatPaise(point.sharePaise)}`}
                    </title>
                  </rect>
                ) : null}
                {showLabel ? (
                  <text
                    x={center}
                    y={height - 14}
                    textAnchor="middle"
                    fontSize={10.5}
                    fill="var(--muted-foreground)"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm"
              style={{ background: "var(--chart-1)" }}
            />
            You paid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 rounded-sm"
              style={{ background: "var(--chart-2)" }}
            />
            Your share
          </span>
        </span>
        <span>
          {truncated
            ? `Showing the latest ${points.length} ${periodLabel}s`
            : `${points.length} ${periodLabel}${points.length === 1 ? "" : "s"}`}
        </span>
      </figcaption>

      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.key}>
            {point.label}: you paid {formatPaise(point.paidPaise)}, your share{" "}
            {formatPaise(point.sharePaise)} across {point.count}{" "}
            {point.count === 1 ? "expense" : "expenses"}.
          </li>
        ))}
      </ul>
    </figure>
  );
}
