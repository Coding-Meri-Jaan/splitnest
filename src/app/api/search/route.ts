import { connection, NextResponse } from "next/server";

import { searchEverything } from "@/lib/data/search";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_SUGGESTIONS = 20;
const DEFAULT_SUGGESTIONS = 8;

function suggestionLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SUGGESTIONS;
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_SUGGESTIONS);
}

/**
 * Typeahead for the search boxes. It returns the same ranked results as
 * `/dashboard/search`, trimmed to a short list, so a half-typed word already
 * shows the groups, people, expenses, and settlements it could become.
 */
export async function GET(request: Request) {
  // Reading request data keeps this handler dynamic under Cache Components.
  await connection();

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = suggestionLimit(url.searchParams.get("limit"));
  const noStore = { "Cache-Control": "private, no-store" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email_confirmed_at) {
    return NextResponse.json(
      { query, total: 0, suggestions: [] },
      { headers: noStore },
    );
  }

  const outcome = await searchEverything(user.id, query);

  return NextResponse.json(
    {
      query: outcome.query,
      total: outcome.results.length,
      suggestions: outcome.results.slice(0, limit),
    },
    { headers: noStore },
  );
}
