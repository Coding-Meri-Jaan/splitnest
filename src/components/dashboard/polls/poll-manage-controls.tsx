"use client";

import { CheckCircle2Icon, XCircleIcon } from "lucide-react";

import { SubmitButton } from "@/components/auth/submit-button";
import {
  cancelPollAction,
  closePollAction,
} from "@/lib/data/poll-actions";

interface PollManageControlsProps {
  groupId: string;
  pollId: string;
  /** True while members are still voting. */
  open: boolean;
}

export function PollManageControls({
  groupId,
  pollId,
  open,
}: PollManageControlsProps) {
  if (!open) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <form action={closePollAction}>
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="pollId" value={pollId} />
        <SubmitButton
          className="w-auto"
          variant="outline"
          pendingLabel="Closing…"
        >
          <CheckCircle2Icon />
          Close voting
        </SubmitButton>
      </form>

      <form
        action={cancelPollAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Cancel this poll? Votes stop counting and members will be notified.",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="groupId" value={groupId} />
        <input type="hidden" name="pollId" value={pollId} />
        <SubmitButton
          className="w-auto"
          variant="destructive"
          pendingLabel="Cancelling…"
        >
          <XCircleIcon />
          Cancel poll
        </SubmitButton>
      </form>
    </div>
  );
}
