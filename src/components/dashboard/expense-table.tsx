import { Trash2Icon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
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
import type { ExpenseView } from "@/types";

interface ExpenseTableProps {
  expenses: ExpenseView[];
  showGroup?: boolean;
  showDelete?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function ExpenseTable({
  expenses,
  showGroup = true,
  showDelete = false,
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

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Expense</TableHead>
          {showGroup ? <TableHead>Group</TableHead> : null}
          <TableHead>Paid by</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showDelete ? <TableHead className="w-10" /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const category = getCategoryMeta(expense.category);
          const CategoryIcon = category.icon;

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
              {showDelete ? (
                <TableCell className="text-right">
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="expenseId" value={expense.id} />
                    <input type="hidden" name="groupId" value={expense.groupId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${expense.title}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </form>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
