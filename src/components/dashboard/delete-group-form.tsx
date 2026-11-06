"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/shared/form-message";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { deleteGroupAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";

interface DeleteGroupFormProps {
  groupId: string;
  groupName: string;
}

export function DeleteGroupForm({ groupId, groupName }: DeleteGroupFormProps) {
  const [state, formAction] = useActionState(deleteGroupAction, initialFormState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage error={state.error} message={state.message} />
      <p className="text-sm text-muted-foreground">
        This permanently deletes <span className="font-medium text-foreground">{groupName}</span>,
        every expense, split, and settlement in it. This cannot be undone.
      </p>
      <ConfirmSubmitButton
        variant="destructive"
        confirmMessage={`Delete "${groupName}" and all of its expenses? This cannot be undone.`}
      >
        Delete group
      </ConfirmSubmitButton>
    </form>
  );
}
