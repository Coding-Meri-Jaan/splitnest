/**
 * Money helpers for SplitNest.
 *
 * Rule: every stored or computed amount is an integer number of paise.
 * Rupees only exist at the edges (parsing user input, formatting output).
 * This keeps split arithmetic exact - no floating point drift.
 */

export interface LedgerExpense {
  paidBy: string;
  amountPaise: number;
  splits: { userId: string; sharePaise: number }[];
}

export interface LedgerSettlement {
  fromUser: string;
  toUser: string;
  amountPaise: number;
}

export interface Transfer {
  fromUser: string;
  toUser: string;
  amountPaise: number;
}

function parseRupeeString(input: string): number | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (cleaned === "" || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const [whole, fraction = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
}

/**
 * Parses a rupee amount typed by a human ("1,234.5", "₹ 1234", "1234.56")
 * into integer paise. Returns null when the input is not a valid amount.
 */
export function parseRupeesToPaise(input: string): number | null {
  const paise = parseRupeeString(input);
  return paise !== null && paise > 0 ? paise : null;
}

/**
 * Same as `parseRupeesToPaise`, but accepts zero. Used for exact split
 * amounts, where one participant may legitimately owe nothing.
 */
export function parseRupeesToPaiseAllowZero(input: string): number | null {
  return parseRupeeString(input);
}

/** Formats paise as an exact rupee string with two decimals, no symbol. */
export function paiseToAmountString(paise: number): string {
  return (paise / 100).toFixed(2);
}

/**
 * Splits `totalPaise` equally between `userIds`.
 *
 * The remainder (at most n-1 paise) is handed out one paise at a time to
 * members sorted by id, so the same group always produces the same shares
 * and the sum is exactly `totalPaise`.
 */
export function splitEqually(
  totalPaise: number,
  userIds: string[],
): Record<string, number> {
  if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
    throw new Error("splitEqually: total must be a positive integer");
  }
  const unique = [...new Set(userIds)].sort();
  if (unique.length === 0) {
    throw new Error("splitEqually: at least one member is required");
  }

  const base = Math.floor(totalPaise / unique.length);
  let remainder = totalPaise - base * unique.length;

  return unique.reduce<Record<string, number>>((shares, id) => {
    shares[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return shares;
  }, {});
}

/**
 * Net position per member across a group's whole ledger.
 *
 * Positive = the group owes this member. Negative = they owe the group.
 * Settlements reduce the debt of the payer and the credit of the receiver.
 */
export function computeNetBalances(
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): Record<string, number> {
  const net: Record<string, number> = {};

  const add = (userId: string, amount: number) => {
    net[userId] = (net[userId] ?? 0) + amount;
  };

  for (const expense of expenses) {
    add(expense.paidBy, expense.amountPaise);
    for (const split of expense.splits) {
      add(split.userId, -split.sharePaise);
    }
  }

  for (const settlement of settlements) {
    add(settlement.fromUser, settlement.amountPaise);
    add(settlement.toUser, -settlement.amountPaise);
  }

  return net;
}

/**
 * Turns net balances into the transfers that settle the group with the
 * fewest payments: repeatedly match the largest creditor with the largest
 * debtor.
 */
export function simplifyDebts(netBalances: Record<string, number>): Transfer[] {
  const creditors = Object.entries(netBalances)
    .filter(([, amount]) => amount > 0)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const debtors = Object.entries(netBalances)
    .filter(([, amount]) => amount < 0)
    .map(([userId, amount]) => ({ userId, amount: -amount }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId));

  const transfers: Transfer[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountPaise = Math.min(creditor.amount, debtor.amount);

    if (amountPaise > 0) {
      transfers.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amountPaise,
      });
    }

    creditor.amount -= amountPaise;
    debtor.amount -= amountPaise;

    if (creditor.amount === 0) creditorIndex += 1;
    if (debtor.amount === 0) debtorIndex += 1;
  }

  return transfers;
}
