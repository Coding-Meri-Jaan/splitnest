import Link from "next/link";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
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
import { SPLIT_MODE_LABELS } from "@/lib/splits";
import type { ExpenseView } from "@/types";

interface ExpenseTableProps {
  expenses: ExpenseView[];
  showGroup?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  currentUserId?: string;
  isGroupOwner?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function ExpenseTable({
  expenses,
  showGroup = true,
  showEdit = false,
  showDelete = false,
  currentUserId,
  isGroupOwner = false,
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
          const canEdit = showEdit && expense.createdById === currentUserId;
          const canDelete =
            showDelete &&
            (expense.createdById === currentUserId || isGroupOwner);

          return (
            <TableRow key={expense.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <CategoryIcon className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">{expense.title}</span>
                    <span className="text-xs text-muted-foreground">
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
              <TableCell className="text-muted-foreground">
                {expense.paidByName}
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

