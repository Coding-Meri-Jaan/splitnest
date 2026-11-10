"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Badge } from "@/components/ui/badge";
import { removeMemberAction, updateMemberRoleAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import {
  GROUP_ROLES,
  ROLE_LABELS,
  canChangeRole,
  canRemoveMember,
  normalizeRole,
  type GroupRole,
} from "@/lib/roles";
import type { Person } from "@/types";

const ASSIGNABLE_ROLES = GROUP_ROLES.filter((role) => role !== "owner");

interface MemberManageListProps {
  groupId: string;
  members: Person[];
  ownerId: string;
  currentUserId: string;
  /** The signed-in user's role in this group. */
  currentUserRole: GroupRole | null;
}

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function MemberManageList({
  groupId,
  members,
  ownerId,
  currentUserId,
  currentUserRole,
}: MemberManageListProps) {
  const [state, formAction, pending] = useActionState(
    removeMemberAction,
    initialFormState,
  );

  return (
    <div className="space-y-3">
      <FormMessage error={state.error} message={state.message} />
      <ul className="space-y-4">
        {members.map((member) => {
          const memberRole = normalizeRole(member.role);
          const memberIsOwner = memberRole === "owner" || member.id === ownerId;
          const isSelf = member.id === currentUserId;
          const canRemove = canRemoveMember(
            currentUserRole,
            memberRole,
            isSelf,
          );
          const canChange = canChangeRole(currentUserRole, memberRole);

          return (
            <li key={member.id} className="space-y-2">
              <div className="flex items-center gap-2.5">
                <MemberAvatar name={member.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <span className="truncate">{member.name}</span>
                    {memberRole ? (
                      <Badge
                        variant={memberIsOwner ? "secondary" : "outline"}
                      >
                        {ROLE_LABELS[memberRole]}
                      </Badge>
                    ) : null}
                    {isSelf ? <Badge variant="outline">You</Badge> : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {canChange ? (
                    <RoleEditor
                      groupId={groupId}
                      memberId={member.id}
                      memberName={member.name}
                      role={memberRole ?? "editor"}
                    />
                  ) : null}

                  {canRemove ? (
                    <form action={formAction}>
                      <input type="hidden" name="groupId" value={groupId} />
                      <input type="hidden" name="memberId" value={member.id} />
                      <ConfirmSubmitButton
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        confirmLabel={isSelf ? "Leave group" : "Remove member"}
                        confirmTitle={
                          isSelf
                            ? "Leave this group?"
                            : `Remove ${member.name}?`
                        }
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
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Viewers can only see balances. Editors can add expenses and edit their
        own. Co-owners can rename the group and manage everyone except the
        owner.
      </p>
    </div>
  );
}

interface RoleEditorProps {
  groupId: string;
  memberId: string;
  memberName: string;
  role: GroupRole;
}

/**
 * A tiny per-row form. It lives in its own component so each row gets its own
 * pending state instead of disabling every role selector on the page.
 */
function RoleEditor({ groupId, memberId, memberName, role }: RoleEditorProps) {
  const [state, formAction] = useActionState(
    updateMemberRoleAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="memberId" value={memberId} />
        <select
          key={role}
          name="role"
          defaultValue={role}
          aria-label={`Role for ${memberName}`}
          className={selectClass}
        >
          {ASSIGNABLE_ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <SubmitButton
          variant="outline"
          className="w-auto shrink-0"
          pendingLabel="Saving…"
        >
          Save
        </SubmitButton>
      </div>
      {state.error ? (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      ) : state.message ? (
        <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
