"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { updateNotificationPreferencesAction } from "@/lib/data/discussion-actions";
import { initialFormState } from "@/lib/form-state";
import type { NotificationPreferenceView } from "@/lib/data/discussion";

interface NotificationPreferencesFormProps {
  preferences: NotificationPreferenceView;
}

const OPTIONS = [
  {
    name: "expenseComments",
    label: "Comments on my expenses",
    description: "When someone comments on an expense you added.",
  },
  {
    name: "commentReplies",
    label: "Replies to my comments",
    description: "When someone replies directly to something you wrote.",
  },
  {
    name: "mentions",
    label: "Mentions",
    description: "When a group member @mentions you in a comment.",
  },
  {
    name: "reactions",
    label: "Reactions to my expenses and comments",
    description:
      "When someone reacts to an expense you added or a comment you wrote.",
  },
  {
    name: "pollUpdates",
    label: "Group polls",
    description: "New polls, closing reminders, and final results.",
  },
] as const;

export function NotificationPreferencesForm({
  preferences,
}: NotificationPreferencesFormProps) {
  const [state, formAction] = useActionState(
    updateNotificationPreferencesAction,
    initialFormState,
  );

  const values: Record<string, boolean> = {
    expenseComments: preferences.expenseComments,
    commentReplies: preferences.commentReplies,
    mentions: preferences.mentions,
    reactions: preferences.reactions,
    pollUpdates: preferences.pollUpdates,
  };
  const options = preferences.pollsAvailable
    ? OPTIONS
    : OPTIONS.filter((option) => option.name !== "pollUpdates");

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} message={state.message} />
      {preferences.pollsAvailable ? (
        <input type="hidden" name="pollUpdatesPresent" value="1" />
      ) : null}

      <ul className="space-y-2">
        {options.map((option) => (
          <li key={option.name}>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/55 bg-background/40 px-3.5 py-3 transition-colors hover:border-brand/25">
              <input
                type="checkbox"
                name={option.name}
                defaultChecked={values[option.name]}
                className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <SubmitButton className="w-auto" pendingLabel="Saving…">
        Save preferences
      </SubmitButton>
    </form>
  );
}
