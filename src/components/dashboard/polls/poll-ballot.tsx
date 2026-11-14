"use client";

import { useActionState, useState } from "react";
import { CheckIcon, TrophyIcon } from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { savePollVotesAction } from "@/lib/data/poll-actions";
import { initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";
import type { PollView } from "@/types";

interface PollBallotProps {
  poll: PollView;
}

/**
 * The live ballot. Selection state is local so a member can line up a
 * multi-choice answer before saving; the database still validates every
 * write, so this is only a convenience.
 */
export function PollBallot({ poll }: PollBallotProps) {
  const [state, formAction] = useActionState(
    savePollVotesAction,
    initialFormState,
  );
  const [selected, setSelected] = useState<string[]>(poll.myOptionIds);
  const multiple = poll.selection === "multiple";

  function toggle(optionId: string) {
    setSelected((current) => {
      if (!multiple) {
        return [optionId];
      }
      return current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={poll.groupId} />
      <input type="hidden" name="pollId" value={poll.id} />
      <FormMessage error={state.error} message={state.message} />

      {poll.isClosingSoon ? (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          Voting closes within 24 hours. Save your choice before the deadline.
        </p>
      ) : null}

      <ul className="space-y-2">
        {poll.options.map((option) => {
          const checked = selected.includes(option.id);

          return (
            <li key={option.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors",
                  checked
                    ? "border-brand/45 bg-brand/[0.06]"
                    : "border-border/70 bg-card/40 hover:border-brand/25 hover:bg-brand/[0.03]",
                )}
              >
                <input
                  type={multiple ? "checkbox" : "radio"}
                  name="optionIds"
                  value={option.id}
                  checked={checked}
                  onChange={() => toggle(option.id)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
                />

                {option.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.imageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg border border-border/60 object-cover"
                  />
                ) : null}

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium break-words">
                      {option.label}
                    </span>
                    {option.isWinner && poll.canSeeResults ? (
                      <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-warning">
                        <TrophyIcon className="size-3" aria-hidden />
                        {poll.isTie ? "Tied" : "Leading"}
                      </span>
                    ) : null}
                    {option.isMine ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[0.68rem] font-semibold text-brand">
                        <CheckIcon className="size-3" aria-hidden />
                        Your pick
                      </span>
                    ) : null}
                  </span>

                  {poll.canSeeResults ? (
                    <span className="mt-2 block space-y-1">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn(
                            "block h-full rounded-full transition-all",
                            option.isWinner ? "bg-brand" : "bg-brand/45",
                          )}
                          style={{ width: `${option.percent}%` }}
                        />
                      </span>
                      <span className="flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground">
                        <span>
                          {option.count}{" "}
                          {option.count === 1 ? "vote" : "votes"}
                        </span>
                        <span className="tabular-nums">{option.percent}%</span>
                      </span>
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {poll.hasVoted
            ? "You can change your vote until the deadline."
            : multiple
              ? "Select every option that works for you."
              : "Select one option."}
        </p>
        <SubmitButton
          className="w-auto"
          pendingLabel="Saving…"
          disabled={selected.length === 0}
        >
          {poll.hasVoted ? "Update vote" : "Cast vote"}
        </SubmitButton>
      </div>
    </form>
  );
}
