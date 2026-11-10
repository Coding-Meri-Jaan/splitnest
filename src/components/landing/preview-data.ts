/**
 * Derived marketing-only preview data for the landing page.
 * Everything here comes from the existing demo fixture so the mockups stay
 * consistent with the rest of the app.
 */

import { balances, getMember, members } from "@/data/sample-data";
import type { DemoBalance, DemoMember } from "@/data/sample-data";

export interface PreviewBalance {
  balance: DemoBalance;
  member: DemoMember;
}

export const previewBalances: PreviewBalance[] = balances
  .map((balance) => {
    const member = getMember(balance.memberId);
    return member ? { balance, member } : null;
  })
  .filter((item): item is PreviewBalance => item !== null);

/**
 * A compact, mixed-sign slice for the landing page mockups: two people who owe
 * you and one person you owe, so the preview mirrors the real balance list.
 */
export const balancePreview: PreviewBalance[] = [
  ...previewBalances.filter(({ balance }) => balance.amount > 0).slice(0, 2),
  ...previewBalances.filter(({ balance }) => balance.amount < 0).slice(0, 1),
];

export const proofMembers = members.slice(0, 4);
