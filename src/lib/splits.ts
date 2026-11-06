import type { ExpenseSplitMode } from "@/types";
import {
  paiseToAmountString,
  parseRupeesToPaiseAllowZero,
  splitEqually,
} from "./money";

export const SPLIT_MODE_LABELS: Record<ExpenseSplitMode, string> = {
  equal: "Equally",
  amount: "Exact amounts",
  percentage: "Percentages",
  shares: "Shares",
};

const SPLIT_MODES = Object.keys(SPLIT_MODE_LABELS) as ExpenseSplitMode[];

export function isSplitMode(value: string): value is ExpenseSplitMode {
  return (SPLIT_MODES as string[]).includes(value);
}

export const SPLIT_MODE_DESCRIPTIONS: Record<ExpenseSplitMode, string> = {
  equal: "Divide the total evenly and assign any leftover paise automatically.",
  amount: "Enter exactly what each person owes. The amounts must add up to the total.",
  percentage: "Enter each person's percentage. The percentages must add up to 100%.",
  shares: "Enter a weight for each person. A person with 2 shares owes twice as much as one with 1.",
};

const PERCENT_SCALE = 100;
const SHARE_DECIMALS = 4;
const SHARE_SCALE = 10 ** SHARE_DECIMALS;
const MAX_PERCENT_BPS = 100 * PERCENT_SCALE;

export interface SplitParticipant {
  userId: string;
  /** Raw form value: rupees, percent, or share weight depending on mode. */
  value?: string;
}

export interface BuiltSplit {
  userId: string;
  sharePaise: number;
  /** Percent or share weight to persist; null for equal/exact splits. */
  splitValue: number | null;
}

export type BuildSplitsResult =
  | { splits: BuiltSplit[] }
  | { error: string };

function parseScaledDecimal(input: string, decimals: number): number | null {
  const cleaned = input.replace(/[,₹%\s]/g, "");
  if (cleaned === "") return 0;
  if (!new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(cleaned)) {
    return null;
  }

  const [whole, fraction = ""] = cleaned.split(".");
  const scale = 10 ** decimals;
  const scaled = Number(whole) * scale + Number(fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(scaled) ? scaled : null;
}

function uniqueParticipants(
  participants: SplitParticipant[],
): SplitParticipant[] {
  const byId = new Map<string, SplitParticipant>();
  for (const participant of participants) {
    if (!byId.has(participant.userId)) byId.set(participant.userId, participant);
  }
  return [...byId.values()].sort((a, b) => a.userId.localeCompare(b.userId));
}

/**
 * Divides `totalPaise` in proportion to integer weights.
 *
 * Uses largest-remainder rounding: every share is a whole number of paise,
 * the shares always sum to `totalPaise`, and a tie is broken by user id so the
 * result is deterministic.
 */
export function splitProportionally(
  totalPaise: number,
  weights: { userId: string; weight: number }[],
): Record<string, number> {
  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
    throw new Error("splitProportionally: total must be a positive integer");
  }

  const byId = new Map<string, number>();
  for (const { userId, weight } of weights) {
    if (!Number.isSafeInteger(weight) || weight < 0) {
      throw new Error("splitProportionally: weights must be non-negative integers");
    }
    byId.set(userId, (byId.get(userId) ?? 0) + weight);
  }

  const rows = [...byId.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([userId, weight]) => ({ userId, weight }));

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
    throw new Error("splitProportionally: at least one positive weight is required");
  }

  const totalBig = BigInt(totalPaise);
  const weightBig = BigInt(totalWeight);

  const calculated = rows.map((row) => {
    const numerator = totalBig * BigInt(row.weight);
    return {
      userId: row.userId,
      sharePaise: Number(numerator / weightBig),
      remainder: numerator % weightBig,
    };
  });

  const allocated = calculated.reduce((sum, row) => sum + row.sharePaise, 0);
  const remaining = totalPaise - allocated;

  const byRemainder = [...calculated].sort((a, b) => {
    if (a.remainder === b.remainder) return a.userId.localeCompare(b.userId);
    return a.remainder > b.remainder ? -1 : 1;
  });

  for (let index = 0; index < remaining; index += 1) {
    byRemainder[index].sharePaise += 1;
  }

  return Object.fromEntries(
    calculated.map((row) => [row.userId, row.sharePaise]),
  );
}

/**
 * Turns a split mode plus raw form values into exact paise shares.
 * All money checks happen here so the client preview and the server action
 * agree on the result.
 */
export function buildSplitShares({
  totalPaise,
  mode,
  participants,
}: {
  totalPaise: number;
  mode: ExpenseSplitMode;
  participants: SplitParticipant[];
}): BuildSplitsResult {
  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
    return { error: "Enter an amount greater than ₹0." };
  }

  const people = uniqueParticipants(participants);
  if (people.length === 0) {
    return { error: "Select at least one person to split with." };
  }

  if (mode === "equal") {
    const shares = splitEqually(
      totalPaise,
      people.map((person) => person.userId),
    );
    return {
      splits: people.map((person) => ({
        userId: person.userId,
        sharePaise: shares[person.userId],
        splitValue: null,
      })),
    };
  }

  if (mode === "amount") {
    const parsed = people.map((person) => ({
      userId: person.userId,
      sharePaise: parseRupeesToPaiseAllowZero(person.value ?? ""),
    }));
    if (parsed.some((person) => person.sharePaise === null)) {
      return { error: "Enter a valid amount for every selected person." };
    }

    const allocated = parsed.reduce(
      (sum, person) => sum + (person.sharePaise ?? 0),
      0,
    );

    if (allocated !== totalPaise) {
      return {
        error: `Exact amounts must add up to ₹${paiseToAmountString(
          totalPaise,
        )} (currently ₹${paiseToAmountString(allocated)}).`,
      };
    }

    return {
      splits: parsed.map((person) => ({
        userId: person.userId,
        sharePaise: person.sharePaise as number,
        splitValue: null,
      })),
    };
  }

  if (mode === "percentage") {
    const parsed = people.map((person) => ({
      userId: person.userId,
      basisPoints: parseScaledDecimal(person.value ?? "", 2),
    }));

    if (
      parsed.some(
        (person) =>
          person.basisPoints === null ||
          person.basisPoints < 0 ||
          person.basisPoints > MAX_PERCENT_BPS,
      )
    ) {
      return { error: "Enter a percentage between 0 and 100 for every person." };
    }

    const totalBasisPoints = parsed.reduce(
      (sum, person) => sum + (person.basisPoints ?? 0),
      0,
    );

    if (totalBasisPoints !== MAX_PERCENT_BPS) {
      return {
        error: `Percentages must add up to 100% (currently ${(
          totalBasisPoints / PERCENT_SCALE
        ).toFixed(2)}%).`,
      };
    }

    const shares = splitProportionally(
      totalPaise,
      parsed.map((person) => ({
        userId: person.userId,
        weight: person.basisPoints as number,
      })),
    );

    return {
      splits: parsed.map((person) => ({
        userId: person.userId,
        sharePaise: shares[person.userId],
        splitValue: (person.basisPoints as number) / PERCENT_SCALE,
      })),
    };
  }

  const parsed = people.map((person) => ({
    userId: person.userId,
    weight: parseScaledDecimal(person.value ?? "", SHARE_DECIMALS),
  }));

  if (parsed.some((person) => person.weight === null)) {
    return { error: "Enter valid share values (up to 4 decimals)." };
  }

  const totalWeight = parsed.reduce(
    (sum, person) => sum + (person.weight ?? 0),
    0,
  );

  if (!Number.isSafeInteger(totalWeight)) {
    return { error: "Share values are too large. Use smaller weights." };
  }

  if (totalWeight <= 0) {
    return { error: "Add at least one share greater than 0." };
  }

  const shares = splitProportionally(
    totalPaise,
    parsed.map((person) => ({
      userId: person.userId,
      weight: person.weight as number,
    })),
  );

  return {
    splits: parsed.map((person) => ({
      userId: person.userId,
      sharePaise: shares[person.userId],
      splitValue: (person.weight as number) / SHARE_SCALE,
    })),
  };
}

/** Sensible starting values when someone switches split mode. */
export function buildDefaultSplitValues(
  mode: ExpenseSplitMode,
  totalPaise: number,
  userIds: string[],
): Record<string, string> {
  const unique = [...new Set(userIds)].sort();
  if (mode === "equal" || unique.length === 0) return {};

  if (mode === "amount") {
    if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
      return Object.fromEntries(unique.map((id) => [id, "0.00"]));
    }
    const shares = splitEqually(totalPaise, unique);
    return Object.fromEntries(
      unique.map((id) => [id, (shares[id] / 100).toFixed(2)]),
    );
  }

  if (mode === "percentage") {
    const shares = splitEqually(MAX_PERCENT_BPS, unique);
    return Object.fromEntries(
      unique.map((id) => [id, (shares[id] / PERCENT_SCALE).toFixed(2)]),
    );
  }

  return Object.fromEntries(unique.map((id) => [id, "1"]));
}
