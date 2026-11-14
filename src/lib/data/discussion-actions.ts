"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/user";
import {
  DISCUSSION_SETUP_MESSAGE,
  isMissingSchemaMessage,
} from "@/lib/data/errors";
import { loadDiscussionMembers } from "@/lib/data/discussion";
import {
  findMentionedMembers,
  isReactionEmoji,
} from "@/lib/discussion";
import { canManageGroup, normalizeRole } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/form-state";
import type { MemberRole } from "@/types/database";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_COMMENT_LENGTH = 2000;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

async function membershipRole(
  supabase: SupabaseServerClient,
  groupId: string,
  userId: string,
): Promise<MemberRole | null> {
  const { data } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  return normalizeRole(data?.role ?? null);
}

function revalidateDiscussion(groupId: string, expenseId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/notifications");
  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath(`/dashboard/groups/${groupId}/expenses/${expenseId}`);
}

function validateBody(body: string): string | null {
  if (body.length === 0) {
    return "Write something before posting.";
  }
  if (body.length > MAX_COMMENT_LENGTH) {
    return `Keep comments under ${MAX_COMMENT_LENGTH} characters.`;
  }
  return null;
}

/**
 * Replaces the mention rows for a comment. Mentions are secondary: if the
 * mention table is unavailable, the comment itself must still post.
 */
async function syncMentions(
  supabase: SupabaseServerClient,
  commentId: string,
  groupId: string,
  authorId: string,
  body: string,
) {
  await supabase
    .from("expense_comment_mentions")
    .delete()
    .eq("comment_id", commentId);

  const members = await loadDiscussionMembers(groupId);
  const mentionedIds = findMentionedMembers(body, members).filter(
    (id) => id !== authorId,
  );

  if (mentionedIds.length === 0) return;

  await supabase.from("expense_comment_mentions").insert(
    mentionedIds.map((id) => ({
      comment_id: commentId,
      mentioned_user_id: id,
    })),
  );
}

export async function createCommentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const expenseId = text(formData, "expenseId");
  const groupId = text(formData, "groupId");
  const parentIdValue = text(formData, "parentId");
  const parentId = parentIdValue.length > 0 ? parentIdValue : null;
  const body = text(formData, "body");

  if (!isUuid(expenseId) || !isUuid(groupId)) {
    return { error: "That expense could not be found.", message: null };
  }
  if (parentId !== null && !isUuid(parentId)) {
    return { error: "That reply target could not be found.", message: null };
  }

  const bodyError = validateBody(body);
  if (bodyError) {
    return { error: bodyError, message: null };
  }

  const supabase = await createSupabaseServerClient();
  const role = await membershipRole(supabase, groupId, userId);

  if (!role) {
    return {
      error: "You need to be a member of this group to join the discussion.",
      message: null,
    };
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id, group_id")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (expenseError || !expense) {
    return { error: "That expense could not be found.", message: null };
  }

  if (parentId) {
    const { data: parent, error: parentError } = await supabase
      .from("expense_comments")
      .select("id, expense_id, parent_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parent || parent.expense_id !== expenseId) {
      return { error: "That comment could not be found.", message: null };
    }
    if (parent.parent_id !== null) {
      return {
        error: "Reply to the main comment so the thread stays readable.",
        message: null,
      };
    }
  }

  const { data: created, error } = await supabase
    .from("expense_comments")
    .insert({
      expense_id: expenseId,
      group_id: groupId,
      author_id: userId,
      parent_id: parentId,
      body,
    })
    .select("id")
    .single();

  if (error || !created) {
    if (error && isMissingSchemaMessage(error.message)) {
      return { error: DISCUSSION_SETUP_MESSAGE, message: null };
    }
    return {
      error: "Could not post that comment. Please try again.",
      message: null,
    };
  }

  await syncMentions(supabase, created.id, groupId, userId, body);
  revalidateDiscussion(groupId, expenseId);

  return {
    error: null,
    message: parentId ? "Reply posted." : "Comment posted.",
  };
}

export async function editCommentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const commentId = text(formData, "commentId");
  const body = text(formData, "body");

  if (!isUuid(commentId)) {
    return { error: "That comment could not be found.", message: null };
  }

  const bodyError = validateBody(body);
  if (bodyError) {
    return { error: bodyError, message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: comment, error: loadError } = await supabase
    .from("expense_comments")
    .select("id, group_id, expense_id, author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (loadError || !comment) {
    return { error: "That comment could not be found.", message: null };
  }
  if (comment.author_id !== userId) {
    return { error: "You can only edit your own comments.", message: null };
  }

  const { data: updated, error } = await supabase
    .from("expense_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("author_id", userId)
    .select("id");

  if (error || !updated || updated.length === 0) {
    if (error && isMissingSchemaMessage(error.message)) {
      return { error: DISCUSSION_SETUP_MESSAGE, message: null };
    }
    return {
      error: "Could not update that comment. Please try again.",
      message: null,
    };
  }

  await syncMentions(supabase, commentId, comment.group_id, userId, body);
  revalidateDiscussion(comment.group_id, comment.expense_id);

  return { error: null, message: "Comment updated." };
}

export async function deleteCommentAction(
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const commentId = text(formData, "commentId");

  if (!isUuid(commentId)) {
    return { error: "That comment could not be found.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: comment, error: loadError } = await supabase
    .from("expense_comments")
    .select("id, group_id, expense_id, author_id")
    .eq("id", commentId)
    .maybeSingle();

  if (loadError || !comment) {
    return { error: "That comment could not be found.", message: null };
  }

  if (comment.author_id !== userId) {
    const role = await membershipRole(supabase, comment.group_id, userId);
    if (!canManageGroup(role)) {
      return {
        error: "Only the comment author or a group admin can delete it.",
        message: null,
      };
    }
  }

  const { data: deleted, error } = await supabase
    .from("expense_comments")
    .delete()
    .eq("id", commentId)
    .select("id");

  if (error || !deleted || deleted.length === 0) {
    return {
      error: "Could not delete that comment. Please try again.",
      message: null,
    };
  }

  revalidateDiscussion(comment.group_id, comment.expense_id);
  return { error: null, message: "Comment deleted." };
}

export async function toggleReactionAction(
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const expenseId = text(formData, "expenseId");
  const groupId = text(formData, "groupId");
  const commentIdValue = text(formData, "commentId");
  const commentId = commentIdValue.length > 0 ? commentIdValue : null;
  const emoji = text(formData, "emoji");

  if (!isUuid(expenseId) || !isUuid(groupId)) {
    return { error: "That expense could not be found.", message: null };
  }
  if (commentId !== null && !isUuid(commentId)) {
    return { error: "That comment could not be found.", message: null };
  }
  if (!isReactionEmoji(emoji)) {
    return { error: "Choose one of the available reactions.", message: null };
  }

  const supabase = await createSupabaseServerClient();
  const role = await membershipRole(supabase, groupId, userId);

  if (!role) {
    return {
      error: "You need to be a member of this group to react.",
      message: null,
    };
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .select("id, group_id")
    .eq("id", expenseId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (expenseError || !expense) {
    return { error: "That expense could not be found.", message: null };
  }

  if (commentId) {
    const { data: comment, error: commentError } = await supabase
      .from("expense_comments")
      .select("id, expense_id, group_id")
      .eq("id", commentId)
      .maybeSingle();

    if (
      commentError ||
      !comment ||
      comment.expense_id !== expenseId ||
      comment.group_id !== groupId
    ) {
      return { error: "That comment could not be found.", message: null };
    }
  }

  let existingQuery = supabase
    .from("expense_reactions")
    .select("id, emoji")
    .eq("user_id", userId);

  existingQuery = commentId
    ? existingQuery.eq("comment_id", commentId)
    : existingQuery.eq("expense_id", expenseId).is("comment_id", null);

  const { data: existing, error: existingError } =
    await existingQuery.maybeSingle();

  if (existingError) {
    if (isMissingSchemaMessage(existingError.message)) {
      return { error: DISCUSSION_SETUP_MESSAGE, message: null };
    }
    return {
      error: "Could not update that reaction. Please try again.",
      message: null,
    };
  }

  if (existing) {
    if (existing.emoji === emoji) {
      const { error } = await supabase
        .from("expense_reactions")
        .delete()
        .eq("id", existing.id)
        .eq("user_id", userId);

      if (error) {
        return {
          error: "Could not remove that reaction. Please try again.",
          message: null,
        };
      }

      revalidateDiscussion(groupId, expenseId);
      return { error: null, message: "Reaction removed." };
    }

    const { error } = await supabase
      .from("expense_reactions")
      .update({ emoji })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (error) {
      return {
        error: "Could not change that reaction. Please try again.",
        message: null,
      };
    }

    revalidateDiscussion(groupId, expenseId);
    return { error: null, message: "Reaction updated." };
  }

  const { error } = await supabase.from("expense_reactions").insert({
    expense_id: expenseId,
    comment_id: commentId,
    group_id: groupId,
    user_id: userId,
    emoji,
  });

  if (error && error.code !== "23505") {
    if (isMissingSchemaMessage(error.message)) {
      return { error: DISCUSSION_SETUP_MESSAGE, message: null };
    }
    return {
      error: "Could not add that reaction. Please try again.",
      message: null,
    };
  }

  revalidateDiscussion(groupId, expenseId);
  return { error: null, message: "Reaction added." };
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (!error) {
    revalidatePath("/dashboard", "layout");
  }
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<void> {
  const userId = await requireUserId();
  const notificationId = text(formData, "notificationId");

  if (!isUuid(notificationId)) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .is("read_at", null);

  if (!error) {
    revalidatePath("/dashboard", "layout");
  }
}

export async function updateNotificationPreferencesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      expense_comments: formData.get("expenseComments") === "on",
      comment_replies: formData.get("commentReplies") === "on",
      mentions: formData.get("mentions") === "on",
      reactions: formData.get("reactions") === "on",
    },
    { onConflict: "user_id" },
  );

  if (error) {
    if (isMissingSchemaMessage(error.message)) {
      return { error: DISCUSSION_SETUP_MESSAGE, message: null };
    }
    return {
      error: "Could not save your notification preferences.",
      message: null,
    };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard", "layout");
  return { error: null, message: "Notification preferences saved." };
}
