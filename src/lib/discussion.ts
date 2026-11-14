import type {
  DiscussionMember,
  NotificationKind,
  ReactionEmoji,
  ReactionSummary,
} from "@/types";

export const REACTION_EMOJIS: readonly ReactionEmoji[] = [
  "👍",
  "❤️",
  "😂",
  "👀",
  "🙌",
  "😮",
];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value);
}

export interface ReactionRow {
  emoji: string;
  userId: string;
  userName: string;
}

/**
 * Collapses raw reaction rows into the compact summary the UI renders.
 * A person appears at most once per emoji even if a duplicate row slipped in.
 */
export function summarizeReactions(
  rows: ReactionRow[],
  currentUserId: string,
): ReactionSummary[] {
  const byEmoji = new Map<ReactionEmoji, Map<string, string>>();

  for (const row of rows) {
    if (!isReactionEmoji(row.emoji)) continue;
    const people = byEmoji.get(row.emoji) ?? new Map<string, string>();
    people.set(row.userId, row.userName);
    byEmoji.set(row.emoji, people);
  }

  return REACTION_EMOJIS.flatMap((emoji) => {
    const people = byEmoji.get(emoji);
    if (!people || people.size === 0) return [];

    return [
      {
        emoji,
        count: people.size,
        reactedByMe: people.has(currentUserId),
        names: [...people.values()].sort((a, b) => a.localeCompare(b)),
      },
    ];
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface MentionAlias {
  alias: string;
  memberId: string;
}

/**
 * Full names always work. A first name also works when it is unique inside the
 * group, which keeps "@Rishabh" useful without making "@R" ambiguous.
 *
 * The returned aliases are sorted longest-first so "@Rishabh Sharma" is matched
 * before "@Rishabh".
 */
function mentionAliases(members: DiscussionMember[]): MentionAlias[] {
  const cleaned = members
    .map((member) => ({ ...member, name: member.name.trim() }))
    .filter((member) => member.name.length > 0 && member.name !== "Member");

  const aliases: MentionAlias[] = cleaned.map((member) => ({
    alias: member.name,
    memberId: member.id,
  }));

  const firstNames = new Map<string, { name: string; ids: Set<string> }>();
  for (const member of cleaned) {
    const parts = member.name.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;

    const first = parts[0];
    if (first.length < 2) continue;

    const key = first.toLowerCase();
    const entry = firstNames.get(key) ?? { name: first, ids: new Set<string>() };
    entry.ids.add(member.id);
    firstNames.set(key, entry);
  }

  for (const entry of firstNames.values()) {
    if (entry.ids.size !== 1) continue;
    const [id] = entry.ids;
    aliases.push({ alias: entry.name, memberId: id });
  }

  return aliases.sort((a, b) => b.alias.length - a.alias.length);
}

/** A case-insensitive pattern that matches every valid @mention. */
export function buildMentionPattern(
  members: DiscussionMember[],
): RegExp | null {
  const aliases = mentionAliases(members);
  if (aliases.length === 0) return null;

  const alternatives = aliases.map((entry) => escapeRegExp(entry.alias));
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])@(?:${alternatives.join("|")})(?=$|[^\\p{L}\\p{N}_])`,
    "giu",
  );
}

/** Member ids named in a comment body, in roster order. */
export function findMentionedMembers(
  body: string,
  members: DiscussionMember[],
): string[] {
  const pattern = buildMentionPattern(members);
  if (!pattern) return [];

  const aliasToIds = new Map<string, string[]>();
  for (const entry of mentionAliases(members)) {
    const key = entry.alias.toLowerCase();
    const ids = aliasToIds.get(key) ?? [];
    ids.push(entry.memberId);
    aliasToIds.set(key, ids);
  }

  const mentioned = new Set<string>();
  for (const match of body.matchAll(pattern)) {
    const ids = aliasToIds.get(match[0].slice(1).toLowerCase());
    for (const id of ids ?? []) mentioned.add(id);
  }

  return members
    .map((member) => member.id)
    .filter((id) => mentioned.has(id));
}

export interface MentionSegment {
  text: string;
  mentioned: boolean;
}

/** Splits a body into plain and @mention runs for rendering. */
export function mentionSegments(
  body: string,
  members: DiscussionMember[],
): MentionSegment[] {
  const pattern = buildMentionPattern(members);
  if (!pattern) return [{ text: body, mentioned: false }];

  const segments: MentionSegment[] = [];
  let cursor = 0;

  for (const match of body.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      segments.push({ text: body.slice(cursor, index), mentioned: false });
    }
    segments.push({ text: match[0], mentioned: true });
    cursor = index + match[0].length;
  }

  if (cursor < body.length) {
    segments.push({ text: body.slice(cursor), mentioned: false });
  }

  return segments;
}

export function isNotificationKind(value: string): value is NotificationKind {
  return (
    value === "expense_comment" ||
    value === "comment_reply" ||
    value === "mention" ||
    value === "expense_reaction" ||
    value === "poll_created" ||
    value === "poll_deadline" ||
    value === "poll_closed" ||
    value === "poll_cancelled"
  );
}

export function notificationText(
  kind: NotificationKind,
  actorName: string,
  expenseTitle: string | null,
  reactionEmoji: string | null,
  pollTitle?: string | null,
): string {
  const title = expenseTitle?.trim() || "an expense";
  const poll = pollTitle?.trim() || "a group poll";

  switch (kind) {
    case "poll_created":
      return `${actorName} started a poll “${poll}”`;
    case "poll_deadline":
      return `Voting on “${poll}” closes within 24 hours`;
    case "poll_closed":
      return `“${poll}” has closed — results are ready`;
    case "poll_cancelled":
      return `${actorName} cancelled the poll “${poll}”`;
    case "comment_reply":
      return `${actorName} replied to your comment on “${title}”`;
    case "mention":
      return `${actorName} mentioned you on “${title}”`;
    case "expense_reaction":
      return `${actorName} reacted ${reactionEmoji ?? "to"} “${title}”`;
    case "expense_comment":
    default:
      return `${actorName} commented on “${title}”`;
  }
}
