import { MessagesSquareIcon, SparklesIcon } from "lucide-react";

import { CommentComposer } from "@/components/dashboard/discussion/comment-composer";
import { CommentItem } from "@/components/dashboard/discussion/comment-item";
import { ReactionBar } from "@/components/dashboard/discussion/reaction-bar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getExpenseDiscussion } from "@/lib/data/discussion";
import { DISCUSSION_SETUP_MESSAGE } from "@/lib/data/errors";
import { cn } from "@/lib/utils";
import type { CommentView, DiscussionMember } from "@/types";

interface ExpenseDiscussionProps {
  expenseId: string;
  groupId: string;
  currentUserId: string;
  members: DiscussionMember[];
  /** Owners and co-owners can remove any comment. */
  canModerate: boolean;
}

/**
 * The expense's discussion: how the group talks about one shared cost.
 * It is intentionally not a group chat - everything here hangs off this
 * expense, and the thread resets when the page moves to another expense.
 */
export async function ExpenseDiscussion({
  expenseId,
  groupId,
  currentUserId,
  members,
  canModerate,
}: ExpenseDiscussionProps) {
  const discussion = await getExpenseDiscussion(
    expenseId,
    currentUserId,
    members,
    canModerate,
  );

  const topLevel = discussion.comments.filter(
    (comment) => comment.parentId === null,
  );
  const repliesByParent = new Map<string, CommentView[]>();
  for (const comment of discussion.comments) {
    if (comment.parentId === null) continue;
    const bucket = repliesByParent.get(comment.parentId) ?? [];
    bucket.push(comment);
    repliesByParent.set(comment.parentId, bucket);
  }

  const total = discussion.comments.length;

  return (
    <Card id="discussion" className="sn-rise scroll-mt-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquareIcon className="size-4 text-brand" aria-hidden />
          Discussion
          {total > 0 ? (
            <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground tabular-nums">
              {total}
            </span>
          ) : null}
        </CardTitle>
        <CardDescription>
          Ask who paid for what, add context, or react. Only people in{" "}
          this group can see this thread.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {!discussion.available ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <SparklesIcon className="size-4 text-brand" aria-hidden />
              Discussions are almost ready
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {DISCUSSION_SETUP_MESSAGE}
            </p>
          </div>
        ) : (
          <>
            {discussion.error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/25 bg-destructive/8 px-3.5 py-2.5 text-sm text-destructive"
              >
                {discussion.error}
              </p>
            ) : null}

            <div className="space-y-2.5 rounded-2xl border border-border/55 bg-background/40 px-3.5 py-3">
              <p className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Reactions
              </p>
              <ReactionBar
                expenseId={expenseId}
                groupId={groupId}
                reactions={discussion.expenseReactions}
              />
            </div>

            <CommentComposer
              expenseId={expenseId}
              groupId={groupId}
              members={members}
              currentUserId={currentUserId}
            />

            {topLevel.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
                <p className="text-sm font-medium">No comments yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  Start the thread if something about this expense needs a
                  note. Mention a member with <span className="font-medium text-foreground">@</span> to
                  bring them in.
                </p>
              </div>
            ) : (
              <div className={cn("space-y-6")}>
                {topLevel.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={repliesByParent.get(comment.id) ?? []}
                    expenseId={expenseId}
                    groupId={groupId}
                    members={members}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
