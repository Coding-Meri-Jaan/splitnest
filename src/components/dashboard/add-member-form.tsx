"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { addMemberAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import { ROLE_LABELS, type GroupRole } from "@/lib/roles";

interface AddMemberFormProps {
  groupId: string;
  /** Roles this person may hand out. Empty means they cannot invite. */
  assignableRoles: GroupRole[];
}

export function AddMemberForm({ groupId, assignableRoles }: AddMemberFormProps) {
  const [state, formAction] = useActionState(addMemberAction, initialFormState);
  const defaultRole = assignableRoles.includes("viewer")
    ? "viewer"
    : (assignableRoles[0] ?? "viewer");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage error={state.error} message={state.message} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="email"
          type="email"
          placeholder="friend@example.com"
          aria-label="Email address to add"
          required
        />
        <select
          name="role"
          defaultValue={defaultRole}
          aria-label="Role for the new member"
          className="sn-select shrink-0 sm:w-36"
        >
          {assignableRoles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <SubmitButton className="w-auto shrink-0" pendingLabel="Adding…">
          Add
        </SubmitButton>
      </div>
      <p className="text-xs text-muted-foreground">
        {defaultRole === "viewer"
          ? "New people start as Viewer and can only look around. Choose Editor to let them add expenses."
          : "Choose the role this person needs. Editors can add expenses and edit their own."}
      </p>
    </form>
  );
}
