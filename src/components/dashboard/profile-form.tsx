"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";

interface ProfileFormProps {
  fullName: string;
  city: string | null;
  upiId: string | null;
}

export function ProfileForm({ fullName, city, upiId }: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage error={state.error} message={state.message} />

      <div className="space-y-2">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full name
        </label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          placeholder="Devesh Sharma"
          autoComplete="name"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="city" className="text-sm font-medium">
          City <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input id="city" name="city" defaultValue={city ?? ""} placeholder="Bengaluru" />
      </div>

      <div className="space-y-2">
        <label htmlFor="upiId" className="text-sm font-medium">
          UPI id <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="upiId"
          name="upiId"
          defaultValue={upiId ?? ""}
          placeholder="name@okhdfcbank"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Used to build &ldquo;Pay via UPI&rdquo; links for people who owe you. SplitNest never stores
          payment credentials.
        </p>
      </div>

      <SubmitButton className="w-auto" pendingLabel="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
