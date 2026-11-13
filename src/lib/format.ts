const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatINR(amount: number): string {
  // Round to the nearest paisa first so a tiny floating-point residue cannot
  // turn a whole rupee into a two-decimal string. Whole rupees stay compact;
  // anything with paise keeps them, so ₹0.01 never collapses to ₹0.
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? inrFormatter.format(rounded)
    : inrPreciseFormatter.format(rounded);
}

export function formatINRPrecise(amount: number): string {
  return inrPreciseFormatter.format(amount);
}

export function formatSignedINR(amount: number): string {
  const formatted = formatINR(Math.abs(amount));
  if (amount > 0) {
    return `+${formatted}`;
  }
  if (amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/** Formats integer paise for display, converting exactly at the edge. */
export function formatPaise(paise: number): string {
  return formatINR(paise / 100);
}

export function formatSignedPaise(paise: number): string {
  return formatSignedINR(paise / 100);
}

/**
 * Compact rupee label for chart axes ("₹1.2L", "₹8k"). Accepts paise because
 * every caller in the dashboard works in paise.
 */
export function formatCompactINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  const sign = paise < 0 ? "-" : "";

  if (rupees >= 1_00_00_000) {
    return `${sign}₹${trimZero(rupees / 1_00_00_000)}Cr`;
  }
  if (rupees >= 1_00_000) {
    return `${sign}₹${trimZero(rupees / 1_00_000)}L`;
  }
  if (rupees >= 1_000) {
    return `${sign}₹${trimZero(rupees / 1_000)}k`;
  }
  return `${sign}₹${Math.round(rupees)}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return dateFormatter.format(date);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
