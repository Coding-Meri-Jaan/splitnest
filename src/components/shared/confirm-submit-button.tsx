"use client";

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

type ButtonProps = ComponentProps<typeof Button>;

interface ConfirmSubmitButtonProps extends ButtonProps {
  confirmMessage: string;
}

/**
 * A submit button that asks for confirmation first. Destructive Server
 * Actions are irreversible, so this adds a guard before the form posts.
 */
export function ConfirmSubmitButton({
  confirmMessage,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
