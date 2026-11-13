import { getCategoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import {
  matchesSearch,
  normalizeSearchQuery,
  rankSearchResults,
  type SearchResult,
} from "@/lib/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { loadLedger, memberMap } from "./groups";

export interface SearchOutcome {
  query: string;
  results: SearchResult[];
  groups: SearchResult[];
  people: SearchResult[];
  expenses: SearchResult[];
  settlements: SearchResult[];
}

function emptyOutcome(query: string): SearchOutcome {
  return {
    query,
    results: [],
    groups: [],
    people: [],
    expenses: [],
    settlements: [],
  };
}

/**
 * Searches every part of the signed-in user's ledger: group names, the people
 * they share nests with, expense titles/notes/categories, and settlements.
 */
export async function searchEverything(
  userId: string,
  rawQuery: string | string[] | null | undefined,
): Promise<SearchOutcome> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) return emptyOutcome(query);

  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);
  const people = memberMap(ledger);
  const groupNames = new Map(ledger.groups.map((group) => [group.id, group.name]));
  const groupEmojis = new Map(ledger.groups.map((group) => [group.id, group.emoji]));

  const memberCounts = new Map<string, number>();
  const sharedGroups = new Map<string, Set<string>>();
  for (const membership of ledger.memberships) {
    memberCounts.set(
      membership.group_id,
      (memberCounts.get(membership.group_id) ?? 0) + 1,
    );

    if (membership.user_id === userId) continue;
    const nestIds = sharedGroups.get(membership.user_id) ?? new Set<string>();
    nestIds.add(membership.group_id);
    sharedGroups.set(membership.user_id, nestIds);
  }

  const results: SearchResult[] = [];

  for (const group of ledger.groups) {
    if (!matchesSearch(query, [group.name])) continue;

    const memberCount = memberCounts.get(group.id) ?? 0;
    results.push({
      id: `group-${group.id}`,
      kind: "group",
      title: group.name,
      subtitle: `${memberCount} ${
        memberCount === 1 ? "member" : "members"
      } · ${group.emoji}`,
      href: `/dashboard/groups/${group.id}`,
      emoji: group.emoji,
    });
  }

  for (const [personId, nestIds] of sharedGroups) {
    const person = people.get(personId);
    if (!person) continue;
    if (!matchesSearch(query, [person.name, person.email])) continue;

    const sharedGroupLabel = `${nestIds.size} ${
      nestIds.size === 1 ? "shared nest" : "shared nests"
    }`;
    results.push({
      id: `person-${person.id}`,
      kind: "person",
      title: person.name,
      subtitle: [person.email, sharedGroupLabel].filter(Boolean).join(" · "),
      href: `/dashboard/people?q=${encodeURIComponent(person.name)}`,
    });
  }

  for (const expense of ledger.expenses) {
    const groupName = groupNames.get(expense.group_id) ?? "Group";
    const paidByName = people.get(expense.paid_by)?.name ?? "Member";
    const category = getCategoryMeta(expense.category).label;

    if (
      !matchesSearch(query, [
        expense.title,
        expense.notes,
        category,
        groupName,
        paidByName,
      ])
    ) {
      continue;
    }

    results.push({
      id: `expense-${expense.id}`,
      kind: "expense",
      title: expense.title,
      subtitle: `${groupName} · paid by ${paidByName} · ${formatDate(
        expense.spent_at,
      )}`,
      href: `/dashboard/groups/${expense.group_id}`,
      amount: expense.amount_paise / 100,
      date: expense.spent_at,
      emoji: groupEmojis.get(expense.group_id),
    });
  }

  for (const settlement of ledger.settlements) {
    const groupName = groupNames.get(settlement.group_id) ?? "Group";
    const fromName = people.get(settlement.from_user)?.name ?? "Someone";
    const toName = people.get(settlement.to_user)?.name ?? "someone";

    if (
      !matchesSearch(query, [
        fromName,
        toName,
        settlement.note,
        settlement.method,
        groupName,
      ])
    ) {
      continue;
    }

    results.push({
      id: `settlement-${settlement.id}`,
      kind: "settlement",
      title: `${fromName} paid ${toName}`,
      subtitle: `${groupName} · ${formatDate(settlement.settled_at)}`,
      href: `/dashboard/groups/${settlement.group_id}`,
      amount: settlement.amount_paise / 100,
      date: settlement.settled_at,
      emoji: groupEmojis.get(settlement.group_id),
    });
  }

  const ranked = rankSearchResults(query, results);

  return {
    query,
    results: ranked,
    groups: ranked.filter((result) => result.kind === "group"),
    people: ranked.filter((result) => result.kind === "person"),
    expenses: ranked.filter((result) => result.kind === "expense"),
    settlements: ranked.filter((result) => result.kind === "settlement"),
  };
}
