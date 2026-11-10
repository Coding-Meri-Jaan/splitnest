import Link from "next/link";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategoryMeta } from "@/lib/categories";
import { deleteExpenseAction } from "@/lib/data/actions";
import { formatDate } from "@/lib/format";
import { canEditRow, type GroupRole } from "@/lib/roles";
import { SPLIT_MODE_LABELS } from "@/lib/splits";
import type { CategoryId, ExpenseView } from "@/types";

interface ExpenseTableProps {
  expenses: ExpenseView[];
  showGroup?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  currentUserId?: string;
  /** The signed-in user's role in the group that produced these rows. */
  role?: GroupRole | null;
  className?: string;
  emptyMessage?: string;
}

const categoryTints: Record<CategoryId, string> = {
  food: "from-rose-500/15 to-orange-500/10 text-rose-600 ring-rose-500/15 dark:text-rose-300",
  travel: "from-sky-500/15 to-blue-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
  groceries:
    "from-emerald-500/15 to-teal-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  rent: "from-violet-500/15 to-indigo-500/10 text-violet-600 ring-violet-500/15 dark:text-violet-300",
  utilities:
    "from-amber-400/20 to-orange-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-300",
  entertainment:
    "from-fuchsia-500/15 to-pink-500/10 text-fuchsia-600 ring-fuchsia-500/15 dark:text-fuchsia-300",
  shopping:
    "from-pink-500/15 to-rose-500/10 text-pink-600 ring-pink-500/15 dark:text-pink-300",
  other:
    "from-slate-500/15 to-zinc-500/10 text-slate-600 ring-slate-500/15 dark:text-slate-300",
};

export function ExpenseTable({
  expenses,
  showGroup = true,
  showEdit = false,
  showDelete = false,
  currentUserId,
  role = null,
  className,
  emptyMessage = "No expenses yet. Add the first one.",
}: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const showActions = showEdit || showDelete;

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Expense</TableHead>
          {showGroup ? <TableHead>Group</TableHead> : null}
          <TableHead>Paid by</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showActions ? <TableHead className="w-20" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const category = getCategoryMeta(expense.category);
          const CategoryIcon = category.icon;
          const splitLabel =
            expense.splitMode === "equal"
              ? null
              : SPLIT_MODE_LABELS[expense.splitMode];
          const canEdit =
            showEdit && canEditRow(role, expense.createdById === currentUserId);
          const canDelete =
            showDelete && canEditRow(role, expense.createdById === currentUserId);

          return (
            <TableRow key={expense.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1 ${categoryTints[expense.category]}`}
                  >
                    <CategoryIcon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="max-w-52 truncate font-medium">
                      {expense.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatDate(expense.date)} · {category.label}
                      {splitLabel ? ` · ${splitLabel}` : ""}
                    </span>
                  </div>
                </div>
              </TableCell>
              {showGroup ? (
                <TableCell className="text-muted-foreground">
                  {expense.groupName}
                </TableCell>
              ) : null}
              <TableCell>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MemberAvatar name={expense.paidByName} size="sm" />
                  <span className="max-w-32 truncate">
                    {expense.paidByName}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Amount value={expense.amount} signed={false} />
              </TableCell>
              {showActions ? (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        nativeButton={false}
                        aria-label={`Edit ${expense.title}`}
                        render={
                          <Link
                            href={`/dashboard/groups/${expense.groupId}/expenses/${expense.id}/edit`}
                          />
                        }
                      >
                        <PencilIcon />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <form action={deleteExpenseAction}>
                        <input type="hidden" name="expenseId" value={expense.id} />
                        <input type="hidden" name="groupId" value={expense.groupId} />
                        <ConfirmSubmitButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${expense.title}`}
                          confirmMessage={`Delete "${expense.title}"? This cannot be undone.`}
                        >
                          <Trash2Icon />
                        </ConfirmSubmitButton>
                      </form>
                    ) : null}
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
