"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { categoryMeta } from "@/lib/categories";
import { createExpenseAction, updateExpenseAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import { formatINRPrecise } from "@/lib/format";
import type { CategoryId, ExpenseView, Person } from "@/types";

interface ExpenseFormProps {
  groupId: string;
  members: Person[];
  currentUserId: string;
  /** Present when editing an existing expense instead of creating one. */
  expense?: ExpenseView;
}

const CATEGORY_IDS = Object.keys(categoryMeta) as CategoryId[];

export function ExpenseForm({
  groupId,
  members,
  currentUserId,
  expense,
}: ExpenseFormProps) {
  const editing = Boolean(expense);
  const [state, formAction] = useActionState(
    editing ? updateExpenseAction : createExpenseAction,
    initialFormState,
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [selected, setSelected] = useState<string[]>(
    expense?.splitUserIds ?? members.map((member) => member.id),
  );
  const spentAtRef = useRef<HTMLInputElement>(null);

  // Reading the clock during render is not allowed while prerendering. Fill
  // today's date directly on the input after hydration, leaving an existing
  // date (when editing) untouched.
  useEffect(() => {
    const input = spentAtRef.current;
    if (input && !input.value) {
      input.value = new Date().toISOString().slice(0, 10);
    }
  }, []);

  const parsed = Number(amount.replace(/[₹,\s]/g, ""));
  const share =
    Number.isFinite(parsed) && parsed > 0 && selected.length > 0
      ? parsed / selected.length
      : null;

  function toggleMember(memberId: string) {
    setSelected((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="groupId" value={groupId} />
      {expense ? <input type="hidden" name="expenseId" value={expense.id} /> : null}
      <FormMessage error={state.error} message={state.message} />

      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          What was it for?
        </label>
        <Input
          id="title"
          name="title"
          placeholder="Beach shack dinner"
          maxLength={120}
          defaultValue={expense?.title}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount (₹)
          </label>
          <Input
            id="amount"
            name="amount"
            inputMode="decimal"
            placeholder="1200.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="spentAt" className="text-sm font-medium">
            Date
          </label>
          <Input
            ref={spentAtRef}
            id="spentAt"
            name="spentAt"
            type="date"
            defaultValue={expense?.date ?? ""}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="paidBy" className="text-sm font-medium">
            Paid by
          </label>
          <select
            id="paidBy"
            name="paidBy"
            defaultValue={expense?.paidById ?? currentUserId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.id === currentUserId ? `${member.name} (you)` : member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={expense?.category ?? "food"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {categoryMeta[id].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Split equally between</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="splitAmong"
                value={member.id}
                checked={selected.includes(member.id)}
                onChange={() => toggleMember(member.id)}
                className="size-4 accent-[var(--primary)]"
              />
              {member.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {share !== null
            ? `About ${formatINRPrecise(Number(share.toFixed(2)))} each (${selected.length} people). Leftover paise are assigned automatically.`
            : "Select at least one person."}
        </p>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={expense?.notes ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <SubmitButton pendingLabel="Saving…">
        {editing ? "Save changes" : "Save expense"}
      </SubmitButton>
    </form>
  );
}
