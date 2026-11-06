"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { updateGroupAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";

interface GroupSettingsFormProps {
  groupId: string;
  name: string;
  emoji: string;
}

export function GroupSettingsForm({ groupId, name, emoji }: GroupSettingsFormProps) {
  const [state, formAction] = useActionState(updateGroupAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage error={state.error} message={state.message} />

      <div className="grid gap-4 sm:grid-cols-[6rem_1fr]">
        <div className="space-y-2">
          <label htmlFor="emoji" className="text-sm font-medium">
            Emoji
          </label>
          <Input
            id="emoji"
            name="emoji"
            defaultValue={emoji}
            maxLength={16}
            aria-label="Group emoji"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Group name
          </label>
          <Input
            id="name"
            name="name"
            defaultValue={name}
            maxLength={80}
            required
          />
        </div>
      </div>

      <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
    </form>
  );
}
