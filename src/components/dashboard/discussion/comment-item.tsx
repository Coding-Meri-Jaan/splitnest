"use client";

import {
  useActionState,
  useState,
  useTransition,
} from "react";
import {
  CheckIcon,
  PencilIcon,
  ReplyIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Textarea } from "@/components/ui/textarea";
import { CommentComposer } from "@/components/dashboard/discussion/comment-composer";
import { ReactionBar } from "@/components/dashboard/discussion/reaction-bar";
import {
  deleteCommentAction,
  editCommentAction,
} from "@/lib/data/discussion-actions";
import { mentionSegments } from "@/lib/discussion";
import { formatDateTime } from "@/lib/format";
import { initialFormState, type FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";
import type { CommentView, DiscussionMember } from "@/types";

interface CommentItemProps {
  comment: CommentView;
  replies?: CommentView[];
  isReply?: boolean;
  expenseId: string;
  groupId: string;
  members: DiscussionMember[];
  currentUserId: string;
}

export function CommentItem({
  comment,
  replies = [],
  isReply = false,
  expenseId,
  groupId,
  members,
  currentUserId,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [editState, editAction] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const result = await editCommentAction(previous, formData);
      if (!result.error) {
        setEditing(false);
      }
      return result;
    },
    initialFormState,
  );

  function removeComment() {
    if (
      !window.confirm(
        isReply
          ? "Delete this reply?"
          : "Delete this comment? Any replies underneath it will also be removed.",
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("commentId", comment.id);

    startDelete(async () => {
      const result = await deleteCommentAction(formData);
      setDeleteError(result.error);
    });
  }

  return (
    <article
      className={cn(
        "sn-rise relative",
        isReply ? "ml-3 border-l-2 border-border/50 pl-3 sm:ml-10 sm:pl-4" : "",
      )}
    >
      <div className="flex gap-3">
        <MemberAvatar
          name={comment.authorName}
          size="sm"
          className={cn("mt-0.5 shrink-0", isReply && "size-7")}
        />

        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-md border border-border/55 bg-background/55 px-3.5 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold">
                {comment.isMine ? "You" : comment.authorName}
              </span>
              <span className="text-[0.68rem] text-muted-foreground">
                {formatDateTime(comment.createdAt)}
                {comment.editedAt ? " · edited" : ""}
              </span>
            </div>

            {editing ? (
              <form action={editAction} className="mt-2 space-y-2">
                <input type="hidden" name="commentId" value={comment.id} />
                <FormMessage error={editState.error} message={editState.message} />
                <Textarea
                  name="body"
                  defaultValue={comment.body}
                  rows={3}
                  maxLength={2000}
                  required
                  className="min-h-20 text-sm"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                  >
                    <XIcon className="size-3.5" aria-hidden />
                    Cancel
                  </button>
                  <SubmitButton
                    className="w-auto"
                    pendingLabel="Saving…"
                    variant="outline"
                  >
                    <CheckIcon />
                    Save
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {mentionSegments(comment.body, members).map((segment, index) =>
                  segment.mentioned ? (
                    <span
                      key={index}
                      className="rounded bg-brand/10 px-0.5 font-medium text-brand"
                    >
                      {segment.text}
                    </span>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  ),
                )}
              </p>
            )}
          </div>

          {!editing ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <ReactionBar
                expenseId={expenseId}
                groupId={groupId}
                commentId={comment.id}
                reactions={comment.reactions}
                variant="comment"
              />

              {!isReply ? (
                <button
                  type="button"
                  onClick={() => setReplying((open) => !open)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                >
                  <ReplyIcon className="size-3.5" aria-hidden />
                  Reply
                </button>
              ) : null}

              {comment.canEdit ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                >
                  <PencilIcon className="size-3.5" aria-hidden />
                  Edit
                </button>
              ) : null}

              {comment.canDelete ? (
                <button
                  type="button"
                  onClick={removeComment}
                  disabled={deletePending}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                  {deletePending ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </div>
          ) : null}

          {deleteError ? (
            <p role="alert" className="mt-1 text-[0.7rem] text-destructive">
              {deleteError}
            </p>
          ) : null}

          {replying ? (
            <div className="mt-2.5">
              <CommentComposer
                expenseId={expenseId}
                groupId={groupId}
                parentId={comment.id}
                members={members}
                currentUserId={currentUserId}
                placeholder={`Reply to ${comment.isMine ? "your comment" : comment.authorName}…`}
                submitLabel="Post reply"
                compact
                onPosted={() => setReplying(false)}
              />
            </div>
          ) : null}

          {replies.length > 0 ? (
            <div className="mt-3 space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply
                  expenseId={expenseId}
                  groupId={groupId}
                  members={members}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
