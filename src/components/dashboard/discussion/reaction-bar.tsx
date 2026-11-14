"use client";

import { useState, useTransition } from "react";
import { SmilePlusIcon } from "lucide-react";

import { toggleReactionAction } from "@/lib/data/discussion-actions";
import { REACTION_EMOJIS } from "@/lib/discussion";
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

    return (
      <button
        key={emoji}
        type="button"
        onClick={() => toggle(emoji)}
        disabled={pending}
        aria-pressed={active}
        aria-label={reactionLabel(
          emoji,
          count,
          active,
          summary?.names ?? [],
        )}
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

  if (variant === "comment") {
    const present = reactions.map((reaction) => reaction.emoji);

    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {present.map((emoji) => chip(emoji, "xs"))}

          <details className="group/react relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <SmilePlusIcon className="size-3.5" aria-hidden />
              React
            </summary>
            <div className="mt-1.5 flex max-w-64 flex-wrap gap-1 rounded-xl border border-border/60 bg-card/95 p-1.5 shadow-lg shadow-foreground/10">
              {REACTION_EMOJIS.map((emoji) => chip(emoji, "sm"))}
            </div>
          </details>
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
    <div className="space-y-1">
      <div
        role="group"
        aria-label="React to this expense"
        className="flex flex-wrap items-center gap-1.5"
      >
        {REACTION_EMOJIS.map((emoji) => chip(emoji, "sm"))}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
