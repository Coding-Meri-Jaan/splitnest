"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createGroupAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";

const EMOJI_CHOICES = ["🏠", "🏖️", "🍱", "🪔", "✈️", "🎉", "🏢", "🚗"];

export function CreateGroupForm() {
  const [state, formAction] = useActionState(createGroupAction, initialFormState);

  return (
    <Card className="sn-rise">
      <CardHeader>
        <CardTitle>Group details</CardTitle>
        <CardDescription>
          You can add members right after creating it.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <FormMessage error={state.error} message={state.message} />

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Group name
            </label>
            <Input
              id="name"
              name="name"
              placeholder="Goa Trip 2026"
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="emoji" className="text-sm font-medium">
              Icon
            </label>
            <select
              id="emoji"
              name="emoji"
              defaultValue="🏠"
              className="sn-select"
            >
              {EMOJI_CHOICES.map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji}
                </option>
              ))}
            </select>
          </div>

          <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
        </CardContent>
      </form>
    </Card>
  );
}
