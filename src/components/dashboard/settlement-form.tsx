"use client";

import { useActionState, useEffect, useRef } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { recordSettlementAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import type { Person } from "@/types";

interface SettlementFormProps {
  groupId: string;
  members: Person[];
  currentUserId: string;
}

export function SettlementForm({ groupId, members, currentUserId }: SettlementFormProps) {
  const [state, formAction] = useActionState(recordSettlementAction, initialFormState);
  const settledAtRef = useRef<HTMLInputElement>(null);
  const otherMember = members.find((member) => member.id !== currentUserId)?.id ?? "";

  // Reading the clock during render is not allowed while prerendering. Fill
  // today's date directly on the input after hydration.
  useEffect(() => {
    const input = settledAtRef.current;
    if (input && !input.value) {
      input.value = new Date().toISOString().slice(0, 10);
    }
  }, []);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      <FormMessage error={state.error} message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="fromUser" className="text-sm font-medium">
            Who paid
          </label>
          <select
            id="fromUser"
            name="fromUser"
            defaultValue={currentUserId}
            className="sn-select"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="toUser" className="text-sm font-medium">
            Who received
          </label>
          <select
            id="toUser"
            name="toUser"
            defaultValue={otherMember}
            className="sn-select"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount (₹)
          </label>
          <Input id="amount" name="amount" inputMode="decimal" placeholder="500.00" required />
        </div>

        <div className="space-y-2">
          <label htmlFor="settledAt" className="text-sm font-medium">
            Date
          </label>
          <Input ref={settledAtRef} id="settledAt" name="settledAt" type="date" />
        </div>

        <div className="space-y-2">
          <label htmlFor="method" className="text-sm font-medium">
            Method
          </label>
          <select
            id="method"
            name="method"
            defaultValue="upi"
            className="sn-select"
          >
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="note" className="text-sm font-medium">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Input id="note" name="note" placeholder="Paid via GPay" maxLength={200} />
        </div>
      </div>

      <SubmitButton pendingLabel="Recording…">Record settlement</SubmitButton>
    </form>
  );
}
