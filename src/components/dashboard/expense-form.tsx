"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { Input } from "@/components/ui/input";
import { categoryMeta } from "@/lib/categories";
import { createExpenseAction, updateExpenseAction } from "@/lib/data/actions";
import { initialFormState } from "@/lib/form-state";
import { formatINRPrecise } from "@/lib/format";
import { parseRupeesToPaise } from "@/lib/money";
import {
  SPLIT_MODE_DESCRIPTIONS,
  buildDefaultSplitValues,
  buildSplitShares,
} from "@/lib/splits";
import type {
  CategoryId,
  ExpenseSplitMode,
  ExpenseView,
  Person,
} from "@/types";

interface ExpenseFormProps {
  groupId: string;
  members: Person[];
  currentUserId: string;
  /** Present when editing an existing expense instead of creating one. */
  expense?: ExpenseView;
}

const CATEGORY_IDS = Object.keys(categoryMeta) as CategoryId[];

const SPLIT_MODES: { value: ExpenseSplitMode; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "amount", label: "Exact amounts (₹)" },
  { value: "percentage", label: "Percentages (%)" },
  { value: "shares", label: "Shares (weights)" },
];

function initialValues(expense?: ExpenseView): Record<string, string> {
  if (!expense || expense.splitMode === "equal") return {};

  return Object.fromEntries(
    expense.splits.map((split) => [
      split.userId,
      expense.splitMode === "amount"
        ? split.share.toFixed(2)
        : split.inputValue === null
          ? "0"
          : String(split.inputValue),
    ]),
  );
}

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
  const [mode, setMode] = useState<ExpenseSplitMode>(
    expense?.splitMode ?? "equal",
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    initialValues(expense),
  );
  const [valuesCustomized, setValuesCustomized] = useState(
    Boolean(expense && expense.splitMode !== "equal"),
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

  const totalPaise = parseRupeesToPaise(amount);
  const memberById = new Map(members.map((member) => [member.id, member]));

  const preview =
    totalPaise && selected.length > 0
      ? buildSplitShares({
          totalPaise,
          mode,
          participants: selected.map((userId) => ({
            userId,
            value: values[userId] ?? "",
          })),
        })
      : null;

  const previewShares =
    preview && "splits" in preview
      ? Object.fromEntries(
          preview.splits.map((split) => [split.userId, split.sharePaise]),
        )
      : null;
  const previewError =
    preview && "error" in preview ? preview.error : null;

  function handleModeChange(nextMode: ExpenseSplitMode) {
    setMode(nextMode);
    setValuesCustomized(false);
    setValues(
      buildDefaultSplitValues(nextMode, totalPaise ?? 0, selected),
    );
  }

  function handleAmountChange(nextAmount: string) {
    setAmount(nextAmount);
    if (mode !== "equal" && !valuesCustomized) {
      setValues(
        buildDefaultSplitValues(
          mode,
          parseRupeesToPaise(nextAmount) ?? 0,
          selected,
        ),
      );
    }
  }

  function toggleMember(memberId: string) {
    const next = selected.includes(memberId)
      ? selected.filter((id) => id !== memberId)
      : [...selected, memberId];

    setSelected(next);

    if (mode === "equal") return;

    if (!valuesCustomized) {
      setValues(buildDefaultSplitValues(mode, totalPaise ?? 0, next));
      return;
    }

    setValues((current) => {
      const copy = { ...current };
      if (next.includes(memberId)) {
        copy[memberId] = copy[memberId] ?? "0";
      } else {
        delete copy[memberId];
      }
      return copy;
    });
  }

  function setSplitValue(memberId: string, value: string) {
    setValuesCustomized(true);
    setValues((current) => ({ ...current, [memberId]: value }));
  }

  function fillEvenly() {
    setValuesCustomized(false);
    setValues(buildDefaultSplitValues(mode, totalPaise ?? 0, selected));
  }

  const equalShares = previewShares
    ? Object.values(previewShares)
    : [];
  const equalLabel =
    equalShares.length > 0
      ? (() => {
          const min = Math.min(...equalShares) / 100;
          const max = Math.max(...equalShares) / 100;
          return min === max
            ? formatINRPrecise(min)
            : `${formatINRPrecise(min)}–${formatINRPrecise(max)}`;
        })()
      : null;

  const unit = mode === "amount" ? "₹" : mode === "percentage" ? "%" : "×";

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
            onChange={(event) => handleAmountChange(event.target.value)}
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
            className="sn-select"
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
            className="sn-select"
          >
            {CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {categoryMeta[id].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="splitMode" className="text-sm font-medium">
          Split method
        </label>
        <select
          id="splitMode"
          name="splitMode"
          value={mode}
          onChange={(event) =>
            handleModeChange(event.target.value as ExpenseSplitMode)
          }
          className="sn-select"
        >
          {SPLIT_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {SPLIT_MODE_DESCRIPTIONS[mode]}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Split between</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 bg-card/50 px-3 py-2 text-sm transition-colors hover:border-brand/30 hover:bg-brand/[0.04]"
            >
              <input
                type="checkbox"
                name="splitAmong"
                value={member.id}
                checked={selected.includes(member.id)}
                onChange={() => toggleMember(member.id)}
                className="size-4 accent-[var(--brand)]"
              />
              {member.name}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {mode === "equal"
            ? equalLabel
              ? `About ${equalLabel} each (${selected.length} people). Leftover paise are assigned automatically.`
              : "Select at least one person."
            : "Select who shares this expense, then set each person’s value below."}
        </p>
      </fieldset>

      {mode !== "equal" && selected.length > 0 ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {mode === "amount"
                ? "Exact amount per person"
                : mode === "percentage"
                  ? "Percentage per person"
                  : "Shares per person"}
            </p>
            <button
              type="button"
              onClick={fillEvenly}
              className="text-xs font-medium text-foreground underline underline-offset-4"
            >
              Split evenly
            </button>
          </div>

          <div className="space-y-2">
            {selected.map((memberId) => {
              const member = memberById.get(memberId);
              const sharePaise = previewShares?.[memberId];

              return (
                <div key={memberId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {member?.name ?? "Member"}
                  </span>
                  <Input
                    name={`splitValue_${memberId}`}
                    value={values[memberId] ?? ""}
                    onChange={(event) =>
                      setSplitValue(memberId, event.target.value)
                    }
                    inputMode="decimal"
                    aria-label={`${
                      member?.name ?? "Member"
                    } ${mode === "amount" ? "amount in rupees" : mode}`}
                    className="w-24 text-right"
                  />
                  <span className="w-4 text-xs text-muted-foreground">
                    {unit}
                  </span>
                  <span className="w-20 text-right text-xs text-muted-foreground">
                    {sharePaise !== undefined
                      ? formatINRPrecise(sharePaise / 100)
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>

          <p
            className={
              previewError
                ? "text-xs font-medium text-destructive"
                : "text-xs text-muted-foreground"
            }
          >
            {previewError
              ? previewError
              : previewShares && totalPaise
                ? `All ₹${(totalPaise / 100).toFixed(2)} allocated.`
                : "Enter the amount and each person’s value."}
          </p>
        </div>
      ) : null}

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
          className="sn-textarea"
        />
      </div>

      <SubmitButton pendingLabel="Saving…">
        {editing ? "Save changes" : "Save expense"}
      </SubmitButton>
    </form>
  );
}
