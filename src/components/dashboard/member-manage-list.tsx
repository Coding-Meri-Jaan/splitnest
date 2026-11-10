"use client";

import { useActionState } from "react";

import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { removeMemberAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import type { Person } from "@/types";

interface MemberManageListProps {
  groupId: string;
  members: Person[];
  ownerId: string;
  currentUserId: string;
}

export function MemberManageList({
  groupId,
  members,
  ownerId,
  currentUserId,
}: MemberManageListProps) {
  const [state, formAction, pending] = useActionState(
    removeMemberAction,
    initialFormState,
  );
  const isOwner = currentUserId === ownerId;

  return (
    <div className="space-y-3">
      <FormMessage error={state.error} message={state.message} />
      <ul className="space-y-3">
        {members.map((member) => {
          const memberIsOwner = member.id === ownerId;
          const isSelf = member.id === currentUserId;
          const canRemove = !memberIsOwner && (isOwner || isSelf);

          return (
            <li key={member.id} className="flex items-center gap-2.5">
              <MemberAvatar name={member.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{member.name}</span>
                  {memberIsOwner ? <Badge variant="secondary">Owner</Badge> : null}
                  {isSelf ? <Badge variant="outline">You</Badge> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
              {canRemove ? (
                <form action={formAction}>
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <ConfirmSubmitButton
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    confirmLabel={isSelf ? "Leave group" : "Remove member"}
                    confirmTitle={isSelf ? "Leave this group?" : `Remove ${member.name}?`}
                    confirmMessage={
                      isSelf
                        ? "Leave this group? Your balance must be ₹0. Past expenses and settlements stay in the group."
                        : `Remove ${member.name} from this group? They can be added back later.`
                    }
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
