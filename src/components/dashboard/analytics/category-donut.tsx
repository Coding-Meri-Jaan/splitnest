import { formatCompactINR, formatPaise } from "@/lib/format";
import type { CategorySlice } from "@/lib/analytics";
import { getCategoryMeta } from "@/lib/categories";

import { ChartEmpty } from "./chart-empty";

interface CategoryDonutProps {
  slices: CategorySlice[];
  totalSharePaise: number;
}

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "oklch(0.64 0.17 250)",
  "oklch(0.7 0.14 195)",
  "oklch(0.68 0.13 125)",
];

export function CategoryDonut({ slices, totalSharePaise }: CategoryDonutProps) {
  if (slices.length === 0 || totalSharePaise <= 0) {
    return (
      <ChartEmpty message="No shared spending in this view yet. Categories appear once you're part of an expense." />
    );
  }

  const radius = 44;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 2.4 : 0;

  const arcs = slices.reduce<
    { slice: CategorySlice; length: number; offset: number }[]
  >((acc, slice) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    return [
      ...acc,
      { slice, length: slice.fraction * circumference, offset },
    ];
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          className="size-44"
          role="img"
          aria-label="Your personal share by category"
        >
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={strokeWidth}
          />
          {arcs.map(({ slice, length, offset }, index) => {
            const dash = Math.max(length - gap, 0.8);
            return (
              <circle
                key={slice.category}
                cx={60}
                cy={60}
                r={radius}
                fill="none"
                stroke={SLICE_COLORS[index % SLICE_COLORS.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${Math.max(circumference - dash, 0)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
                strokeLinecap="butt"
                className="transition-opacity hover:opacity-70"
              >
                <title>
                  {`${getCategoryMeta(slice.category).label}: ${formatPaise(slice.sharePaise)} (${Math.round(slice.fraction * 100)}%)`}
                </title>
              </circle>
            );
          })}
          <text
            x={60}
            y={57}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            fill="var(--foreground)"
          >
            {formatCompactINR(totalSharePaise)}
          </text>
          <text
            x={60}
            y={72}
            textAnchor="middle"
            fontSize={8}
            fill="var(--muted-foreground)"
            letterSpacing={0.6}
          >
            YOUR SHARE
          </text>
        </svg>
      </div>

      <ul className="space-y-1.5">
        {slices.map((slice, index) => {
          const meta = getCategoryMeta(slice.category);
          const Icon = meta.icon;
          return (
            <li
              key={slice.category}
              className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.03]"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[0.7rem]"
                style={{
                  background: `color-mix(in oklch, ${SLICE_COLORS[index % SLICE_COLORS.length]} 14%, transparent)`,
                  color: SLICE_COLORS[index % SLICE_COLORS.length],
                }}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{meta.label}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round(slice.fraction * 100)}%
              </span>
              <span className="w-16 text-right text-sm font-semibold tabular-nums">
                {formatPaise(slice.sharePaise)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
