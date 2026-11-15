import { QUICK_REACTIONS, isReactionEmoji } from "@/lib/emoji";
import type {
  CommentThread,
  CommentView,
  DiscussionMember,
  NotificationKind,
  ReactionSummary,
} from "@/types";

export { QUICK_REACTIONS, isReactionEmoji } from "@/lib/emoji";

const QUICK_REACTION_ORDER = new Map<string, number>(
  QUICK_REACTIONS.map((emoji, index) => [emoji, index]),
);

export interface ReactionRow {
  emoji: string;
  userId: string;
  userName: string;
}

/**
 * Collapses raw reaction rows into the compact summary the UI renders.
 * A person appears at most once per emoji even if a duplicate row slipped in.
 * Quick reactions stay in their familiar order; everything else is ranked by
 * how many people used it, then by first appearance.
 */
export function summarizeReactions(
  rows: ReactionRow[],
  currentUserId: string,
): ReactionSummary[] {
  const byEmoji = new Map<
    string,
    { people: Map<string, string>; firstSeen: number }
  >();
  let seen = 0;

  for (const row of rows) {
    const emoji = row.emoji.trim();
    if (!isReactionEmoji(emoji)) continue;

    let entry = byEmoji.get(emoji);
    if (!entry) {
      entry = { people: new Map<string, string>(), firstSeen: seen++ };
      byEmoji.set(emoji, entry);
    }
    entry.people.set(row.userId, row.userName);
  }

  return [...byEmoji.entries()]
    .sort(([emojiA, a], [emojiB, b]) => {
      const quickA = QUICK_REACTION_ORDER.get(emojiA);
      const quickB = QUICK_REACTION_ORDER.get(emojiB);

      if (quickA !== undefined || quickB !== undefined) {
        if (quickA === undefined) return 1;
        if (quickB === undefined) return -1;
        return quickA - quickB;
      }

      if (a.people.size !== b.people.size) {
        return b.people.size - a.people.size;
      }
      return a.firstSeen - b.firstSeen;
    })
    .map(([emoji, entry]) => ({
      emoji,
      count: entry.people.size,
      reactedByMe: entry.people.has(currentUserId),
      names: [...entry.people.values()].sort((a, b) => a.localeCompare(b)),
    }));
}

/**
 * Turns the flat comment rows into an arbitrarily deep reply tree. The
 * database returns comments oldest-first, so siblings keep their natural
 * conversation order.
 *
 * A reply whose parent is missing (for example a row filtered by RLS) becomes
 * a root instead of disappearing.
 */
export function buildCommentTree(comments: CommentView[]): CommentThread[] {
  const nodes = new Map<string, CommentThread>();
  for (const comment of comments) {
    nodes.set(comment.id, { ...comment, replies: [] });
  }

  const roots: CommentThread[] = [];
  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) continue;

    const parent =
      comment.parentId === null ? undefined : nodes.get(comment.parentId);

    if (parent && parent.id !== node.id) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
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
    value === "comment_reaction" ||
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
    case "comment_reaction":
      return `${actorName} reacted ${reactionEmoji ?? "to"} to your comment on “${title}”`;
    case "expense_reaction":
      return `${actorName} reacted ${reactionEmoji ?? "to"} “${title}”`;
    case "expense_comment":
    default:
      return `${actorName} commented on “${title}”`;
  }
}
