"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { addMemberAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";

interface AddMemberFormProps {
  groupId: string;
}

export function AddMemberForm({ groupId }: AddMemberFormProps) {
  const [state, formAction] = useActionState(addMemberAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage error={state.error} message={state.message} />
      <div className="flex gap-2">
        <Input
          name="email"
          type="email"
          placeholder="friend@example.com"
          aria-label="Email address to add"
          required
        />
        <SubmitButton className="w-auto shrink-0" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        They need a SplitNest account already. Only the group owner can add people.
      </p>
    </form>
  );
}
