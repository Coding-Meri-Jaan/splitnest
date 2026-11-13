export type SearchKind = "group" | "person" | "expense" | "settlement";

export interface SearchResult {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
  /** Rupees. Present for money results. */
  amount?: number;
  /** ISO date. Present for activity results. */
  date?: string;
  emoji?: string;
}

/** `searchParams.q` can arrive as a string or an array of strings. */
export function normalizeSearchQuery(
  value: string | string[] | null | undefined,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").replace(/\s+/g, " ").trim();
}

export function searchTokens(query: string): string[] {
  return normalizeSearchQuery(query).toLowerCase().split(" ").filter(Boolean);
}

/**
 * Every token has to appear somewhere in the searchable fields. That makes
 * "goa pizza" find a pizza expense inside the Goa Trip nest, while a single
 * word still works as a normal contains search.
 */
export function matchesSearch(
  query: string,
  fields: readonly (string | null | undefined)[],
): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return false;

  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function titleScore(query: string, title: string): number {
  const normalizedTitle = title.toLowerCase();
  const normalizedQuery = normalizeSearchQuery(query).toLowerCase();

  let score = 0;
  for (const token of searchTokens(query)) {
    if (normalizedTitle === token) score += 60;
    else if (normalizedTitle.startsWith(token)) score += 40;
    else if (normalizedTitle.includes(token)) score += 25;
    else score += 10;
  }

  if (normalizedTitle === normalizedQuery) score += 30;
  else if (normalizedTitle.startsWith(normalizedQuery)) score += 20;

  return score;
}

const KIND_BOOST: Record<SearchKind, number> = {
  group: 4,
  person: 3,
  expense: 2,
  settlement: 1,
};

/** Best title matches first; ties fall back to the newest activity. */
export function rankSearchResults(
  query: string,
  results: readonly SearchResult[],
): SearchResult[] {
  return [...results].sort((a, b) => {
    const scoreDifference =
      titleScore(query, b.title) +
      KIND_BOOST[b.kind] -
      (titleScore(query, a.title) + KIND_BOOST[a.kind]);
    if (scoreDifference !== 0) return scoreDifference;

    if (a.date && b.date && a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.title.localeCompare(b.title);
  });
}
