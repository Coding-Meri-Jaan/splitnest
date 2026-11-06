"use client";

import { Loader2 } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import { useFormStatus } from "react-dom";

import { Button, buttonVariants } from "@/components/ui/button";

type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: ButtonVariant;
}

export function SubmitButton({
  children,
  pendingLabel = "Please wait",
  className = "w-full",
  variant = "default",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
