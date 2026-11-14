import { isMissingSchemaMessage } from "@/lib/data/errors";
import { isNotificationKind, summarizeReactions } from "@/lib/discussion";
import { displayName } from "@/lib/display-name";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CommentView,
  DiscussionMember,
  NotificationView,
  ReactionSummary,
} from "@/types";
import type { Database } from "@/types/database";

type CommentRow = Database["public"]["Tables"]["expense_comments"]["Row"];
type ReactionRow = Database["public"]["Tables"]["expense_reactions"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export interface ExpenseDiscussionData {
  /** False when migration 0006 has not been applied yet. */
  available: boolean;
  error: string | null;
  comments: CommentView[];
  expenseReactions: ReactionSummary[];
}

/**
 * Loads a single expense thread. The caller has already proved group access
 * through getExpenseDetail, and RLS repeats that proof for every row here.
 */
export async function getExpenseDiscussion(
  expenseId: string,
  currentUserId: string,
  members: DiscussionMember[],
  canModerate: boolean,
): Promise<ExpenseDiscussionData> {
  const supabase = await createSupabaseServerClient();
  const [commentsResult, reactionsResult] = await Promise.all([
    supabase
      .from("expense_comments")
      .select(
        "id, expense_id, group_id, author_id, parent_id, body, edited_at, created_at",
      )
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("expense_reactions")
      .select("id, expense_id, comment_id, user_id, emoji, created_at")
      .eq("expense_id", expenseId)
      .order("created_at", { ascending: true }),
  ]);

  if (commentsResult.error) {
    if (isMissingSchemaMessage(commentsResult.error.message)) {
      return {
        available: false,
        error: null,
        comments: [],
        expenseReactions: [],
      };
    }

    return {
      available: true,
      error: "Could not load this discussion. Please refresh and try again.",
      comments: [],
      expenseReactions: [],
    };
  }

  const comments = (commentsResult.data ?? []) as CommentRow[];
  const reactions = reactionsResult.error
    ? []
    : ((reactionsResult.data ?? []) as ReactionRow[]);

  const nameById = new Map(members.map((member) => [member.id, member.name]));
  const reactionsByComment = new Map<string, ReactionRow[]>();
  const expenseReactionRows: ReactionRow[] = [];

  for (const reaction of reactions) {
    if (reaction.comment_id === null) {
      expenseReactionRows.push(reaction);
      continue;
    }

    const bucket = reactionsByComment.get(reaction.comment_id);
    if (bucket) bucket.push(reaction);
    else reactionsByComment.set(reaction.comment_id, [reaction]);
  }

  const mentionRows: {
    comment_id: string;
    mentioned_user_id: string;
  }[] = [];

  if (comments.length > 0) {
    const { data, error } = await supabase
      .from("expense_comment_mentions")
      .select("comment_id, mentioned_user_id")
      .in(
        "comment_id",
        comments.map((comment) => comment.id),
      );

    // Mentions are an enhancement. A partial migration should not hide the
    // comments that were already saved successfully.
    if (!error && data) {
      mentionRows.push(...data);
    }
  }

  const mentionsByComment = new Map<string, { id: string; name: string }[]>();
  for (const mention of mentionRows) {
    const bucket = mentionsByComment.get(mention.comment_id) ?? [];
    bucket.push({
      id: mention.mentioned_user_id,
      name: nameById.get(mention.mentioned_user_id) ?? "Former member",
    });
    mentionsByComment.set(mention.comment_id, bucket);
  }

  const toReactionRows = (rows: ReactionRow[]) =>
    rows.map((row) => ({
      emoji: row.emoji,
      userId: row.user_id,
      userName: nameById.get(row.user_id) ?? "Former member",
    }));

  const commentViews: CommentView[] = comments.map((comment) => {
    const isMine = comment.author_id === currentUserId;

    return {
      id: comment.id,
      expenseId: comment.expense_id,
      parentId: comment.parent_id,
      authorId: comment.author_id,
      authorName: nameById.get(comment.author_id) ?? "Former member",
      body: comment.body,
      createdAt: comment.created_at,
      editedAt: comment.edited_at,
      isMine,
      canEdit: isMine,
      canDelete: isMine || canModerate,
      mentions: [...(mentionsByComment.get(comment.id) ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      reactions: summarizeReactions(
        toReactionRows(reactionsByComment.get(comment.id) ?? []),
        currentUserId,
      ),
    };
  });

  return {
    available: true,
    error: reactionsResult.error && !isMissingSchemaMessage(reactionsResult.error.message)
      ? "Reactions could not be loaded right now."
      : null,
    comments: commentViews,
    expenseReactions: summarizeReactions(
      toReactionRows(expenseReactionRows),
      currentUserId,
    ),
  };
}

/**
 * Mention candidates for a group, with a real name only. Profiles that fall
 * back to "Member" are skipped because @Member would be ambiguous.
 */
export async function loadDiscussionMembers(
  groupId: string,
): Promise<DiscussionMember[]> {
  const supabase = await createSupabaseServerClient();
  const [membersResult, profilesResult] = await Promise.all([
    supabase.from("group_members").select("user_id").eq("group_id", groupId),
    supabase.from("profiles").select("id, email, full_name"),
  ]);

  if (membersResult.error || profilesResult.error) {
    return [];
  }

  const names = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      displayName(profile, ""),
    ]),
  );

  return (membersResult.data ?? [])
    .map((member) => ({
      id: member.user_id,
      name: names.get(member.user_id) ?? "",
    }))
    .filter((member) => member.name.length > 0 && member.name !== "Member")
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  // The bell is part of every dashboard header. A pending migration must not
  // take the whole shell down.
  if (error) return 0;
  return count ?? 0;
}

export interface NotificationsData {
  available: boolean;
  items: NotificationView[];
}

export async function getNotifications(
  userId: string,
): Promise<NotificationsData> {
  const supabase = await createSupabaseServerClient();
  const selectColumns =
    "id, user_id, actor_id, type, group_id, group_name, expense_id, expense_title, comment_id, reaction_emoji, poll_id, poll_title, read_at, created_at";
  const legacyColumns =
    "id, user_id, actor_id, type, group_id, group_name, expense_id, expense_title, comment_id, reaction_emoji, read_at, created_at";

  const primary = await supabase
    .from("notifications")
    .select(selectColumns)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);
  let data = (primary.data ?? null) as NotificationRow[] | null;
  let error = primary.error;
  let pollsSupported = true;

  // Migration 0007 adds poll_id/poll_title. Without it, keep the existing
  // discussion notifications working instead of blanking the whole page.
  if (error && isMissingSchemaMessage(error.message)) {
    pollsSupported = false;
    const legacy = await supabase
      .from("notifications")
      .select(legacyColumns)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    data = legacy.error
      ? null
      : ((legacy.data ?? []) as Omit<
          NotificationRow,
          "poll_id" | "poll_title"
        >[]).map((row) => ({ ...row, poll_id: null, poll_title: null }));
    error = legacy.error;
  }

  if (error) {
    if (isMissingSchemaMessage(error.message)) {
      return { available: false, items: [] };
    }
    throw new Error(`Could not load notifications: ${error.message}`);
  }

  const rows = data ?? [];
  const actorIds = [
    ...new Set(rows.map((row) => row.actor_id).filter(Boolean)),
  ] as string[];
  const expenseIds = [
    ...new Set(rows.map((row) => row.expense_id).filter(Boolean)),
  ] as string[];
  const pollIds = pollsSupported
    ? ([...new Set(rows.map((row) => row.poll_id).filter(Boolean))] as string[])
    : [];

  const [actorsResult, expensesResult, pollsResult] = await Promise.all([
    actorIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),
    expenseIds.length > 0
      ? supabase.from("expenses").select("id").in("id", expenseIds)
      : Promise.resolve({ data: [], error: null }),
    pollIds.length > 0
      ? supabase.from("polls").select("id").in("id", pollIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const actorNames = new Map(
    (actorsResult.data ?? []).map((profile) => [
      profile.id,
      displayName(profile, "Someone"),
    ]),
  );
  const visibleExpenses = new Set(
    (expensesResult.data ?? []).map((expense) => expense.id),
  );
  const visiblePolls = new Set(
    pollsSupported ? (pollsResult.data ?? []).map((poll) => poll.id) : [],
  );

  return {
    available: true,
    items: rows.map((row) => {
      const kind = isNotificationKind(row.type)
        ? row.type
        : "expense_comment";
      const pollId = row.poll_id ?? null;
      const pollTitle = row.poll_title ?? null;
      const isPoll = kind.startsWith("poll_");
      const href = isPoll
        ? row.group_id && pollId && visiblePolls.has(pollId)
          ? `/dashboard/groups/${row.group_id}/polls/${pollId}`
          : null
        : row.group_id && row.expense_id && visibleExpenses.has(row.expense_id)
          ? `/dashboard/groups/${row.group_id}/expenses/${row.expense_id}`
          : null;

      return {
        id: row.id,
        kind,
        actorId: row.actor_id,
        actorName: actorNames.get(row.actor_id ?? "") ?? "Someone",
        groupId: row.group_id,
        groupName: row.group_name,
        expenseId: row.expense_id,
        expenseTitle: row.expense_title,
        commentId: row.comment_id,
        reactionEmoji: row.reaction_emoji,
        pollId,
        pollTitle,
        read: row.read_at !== null,
        createdAt: row.created_at,
        href,
      };
    }),
  };
}

export interface NotificationPreferenceView {
  available: boolean;
  error: string | null;
  expenseComments: boolean;
  commentReplies: boolean;
  mentions: boolean;
  reactions: boolean;
  pollUpdates: boolean;
  /** False when migration 0007 has not been applied yet. */
  pollsAvailable: boolean;
}

const DEFAULT_PREFERENCES = {
  expenseComments: true,
  commentReplies: true,
  mentions: true,
  reactions: true,
  pollUpdates: true,
};

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferenceView> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select(
      "expense_comments, comment_replies, mentions, reactions, poll_updates",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (!isMissingSchemaMessage(error.message)) {
      return {
        available: false,
        pollsAvailable: false,
        error: "Could not load your notification preferences.",
        ...DEFAULT_PREFERENCES,
      };
    }

    // Poll updates arrived in 0007. Keep the existing four toggles usable
    // while the migration is pending.
    const legacy = await supabase
      .from("notification_preferences")
      .select("expense_comments, comment_replies, mentions, reactions")
      .eq("user_id", userId)
      .maybeSingle();

    if (legacy.error) {
      return {
        available: false,
        pollsAvailable: false,
        error: null,
        ...DEFAULT_PREFERENCES,
      };
    }

    return {
      available: true,
      pollsAvailable: false,
      error: null,
      expenseComments: legacy.data?.expense_comments ?? true,
      commentReplies: legacy.data?.comment_replies ?? true,
      mentions: legacy.data?.mentions ?? true,
      reactions: legacy.data?.reactions ?? true,
      pollUpdates: true,
    };
  }

  return {
    available: true,
    pollsAvailable: true,
    error: null,
    expenseComments: data?.expense_comments ?? true,
    commentReplies: data?.comment_replies ?? true,
    mentions: data?.mentions ?? true,
    reactions: data?.reactions ?? true,
    pollUpdates: data?.poll_updates ?? true,
  };
}
