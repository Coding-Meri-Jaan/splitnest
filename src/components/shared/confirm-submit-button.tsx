"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { ComponentProps } from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

interface ConfirmSubmitButtonProps extends Omit<ButtonProps, "type"> {
  /** Body copy shown inside the confirmation dialog. */
  confirmMessage: string;
  /** Label of the destructive confirm button. Defaults to "Delete". */
  confirmLabel?: string;
  /** Heading of the confirmation dialog. */
  confirmTitle?: string;
  /** Label shown on the confirm button while the form submits. */
  pendingLabel?: string;
}

/**
 * A submit button that asks for confirmation first.
 *
 * The confirmation is rendered as an in-page alert dialog rather than
 * `window.confirm`, because browsers let people suppress native dialogs for a
 * site. When that happens every later `window.confirm` silently returns false
 * and the button looks broken. An in-app dialog always appears.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  confirmLabel = "Delete",
  confirmTitle = "Are you sure?",
  pendingLabel = "Deleting…",
  onClick,
  children,
  disabled,
  ...props
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function submit() {
    const form = triggerRef.current?.form;
    if (!form) {
      setSubmitting(false);
      return;
    }

    setSubmitting(true);
    form.requestSubmit();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger
        ref={triggerRef}
        disabled={disabled || submitting}
        onClick={onClick}
        render={<Button type="button" {...props} />}
      >
        {children}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-zinc-950/35 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <AlertDialog.Popup className="sn-glass fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 text-popover-foreground transition duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <AlertDialog.Title className="font-heading text-lg font-semibold tracking-tight text-foreground">
            {confirmTitle}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {confirmMessage}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close render={<Button variant="outline" />}>
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close
              render={
                <Button
                  variant="destructive"
                  disabled={submitting}
                  onClick={submit}
                />
              }
            >
              {submitting ? pendingLabel : confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
