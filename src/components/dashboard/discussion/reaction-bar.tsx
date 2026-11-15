"use client";

import { useState, useTransition } from "react";

import { EmojiPicker } from "@/components/dashboard/discussion/emoji-picker";
import { toggleReactionAction } from "@/lib/data/discussion-actions";
import { QUICK_REACTIONS } from "@/lib/discussion";
import { cn } from "@/lib/utils";
import type { ReactionEmoji, ReactionSummary } from "@/types";

interface ReactionBarProps {
  expenseId: string;
  groupId: string;
  commentId?: string;
  reactions: ReactionSummary[];
  /** Comments stay compact; the expense itself shows every choice. */
  variant?: "expense" | "comment";
}

function reactionLabel(
  emoji: ReactionEmoji,
  count: number,
  reactedByMe: boolean,
  names: string[],
): string {
  const people = names.length > 0 ? ` by ${names.join(", ")}` : "";
  return `${emoji} reaction${count === 1 ? "" : "s"}${people}${
    reactedByMe ? ", including you" : ""
  }`;
}

/**
 * Quick reactions are revealed on hover or keyboard focus. Existing reaction
 * counts stay visible, and the "+" trigger is always there so a first-time
 * visitor can discover the full picker. Touch devices show the quick row
 * without needing a hover.
 */
const QUICK_ROW_CLASS = cn(
  "flex items-center gap-0.5 overflow-hidden opacity-0 transition-[max-width,opacity] duration-150 motion-reduce:transition-none",
  "max-w-0",
  "group-hover/reactions:max-w-[20rem] group-hover/reactions:opacity-100",
  "group-focus-within/reactions:max-w-[20rem] group-focus-within/reactions:opacity-100",
  "[@media(hover:none)]:max-w-[20rem] [@media(hover:none)]:opacity-100",
);

export function ReactionBar({
  expenseId,
  groupId,
  commentId,
  reactions,
  variant = "expense",
}: ReactionBarProps) {
  const [pending, startTransition] = useTransition();
  const [pendingEmoji, setPendingEmoji] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byEmoji = new Map(reactions.map((reaction) => [reaction.emoji, reaction]));
  const quickReactions = QUICK_REACTIONS.filter(
    (emoji) => !byEmoji.has(emoji),
  );

  function toggle(emoji: ReactionEmoji) {
    const formData = new FormData();
    formData.set("expenseId", expenseId);
    formData.set("groupId", groupId);
    formData.set("emoji", emoji);
    if (commentId) formData.set("commentId", commentId);

    setPendingEmoji(emoji);
    startTransition(async () => {
      const result = await toggleReactionAction(formData);
      setPendingEmoji(null);
      setError(result.error);
    });
  }

  function chip(emoji: ReactionEmoji, size: "sm" | "xs") {
    const summary = byEmoji.get(emoji);
    const count = summary?.count ?? 0;
    const active = summary?.reactedByMe ?? false;
    const busy = pending && pendingEmoji === emoji;
    const label =
      count > 0
        ? reactionLabel(emoji, count, active, summary?.names ?? [])
        : `React with ${emoji}`;

    return (
      <button
        key={emoji}
        type="button"
        onClick={() => toggle(emoji)}
        disabled={pending}
        aria-pressed={count > 0 ? active : undefined}
        aria-label={label}
        title={summary?.names.join(", ") || `React with ${emoji}`}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60",
          size === "xs" ? "text-[0.7rem]" : "",
          active
            ? "border-brand/35 bg-brand/10 text-brand shadow-sm"
            : count > 0
              ? "border-border/70 bg-card/70 text-foreground hover:border-brand/30 hover:bg-card"
              : "border-transparent bg-foreground/[0.04] text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground",
          busy && "animate-pulse",
        )}
      >
        <span aria-hidden>{emoji}</span>
        {count > 0 ? (
          <span className="tabular-nums">{count}</span>
        ) : (
          <span className="sr-only">No reactions yet</span>
        )}
      </button>
    );
  }

  const quickRow = quickReactions.length > 0 ? (
    <div className={QUICK_ROW_CLASS} data-testid="quick-reactions">
      {quickReactions.map((emoji) =>
        chip(emoji, variant === "comment" ? "xs" : "sm"),
      )}
    </div>
  ) : null;

  if (variant === "comment") {
    return (
      <div className="group/reactions space-y-1">
        <div
          role="group"
          aria-label="React to this comment"
          className="flex flex-wrap items-center gap-1"
        >
          {reactions.map((reaction) => chip(reaction.emoji, "xs"))}
          {quickRow}

          <EmojiPicker
            onSelect={toggle}
            disabled={pending}
            label={`React to ${commentId ? "this comment" : "this expense"}`}
          />
        </div>

        {error ? (
          <p role="alert" className="text-[0.7rem] text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="group/reactions space-y-1">
      <div
        role="group"
        aria-label="React to this expense"
        className="flex flex-wrap items-center gap-1.5"
      >
        {reactions.map((reaction) => chip(reaction.emoji, "sm"))}
        {quickRow}

        <EmojiPicker
          onSelect={toggle}
          disabled={pending}
          label="More reactions"
          showLabel
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
