import { Amount } from "@/components/shared/amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getGroup, getMember } from "@/data/sample-data";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import type { Expense } from "@/types";

interface ExpenseTableProps {
  expenses: Expense[];
  showGroup?: boolean;
  className?: string;
}

export function ExpenseTable({
  expenses,
  showGroup = true,
  className,
}: ExpenseTableProps) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead>Expense</TableHead>
          {showGroup ? <TableHead>Group</TableHead> : null}
          <TableHead>Paid by</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => {
          const category = getCategoryMeta(expense.category);
          const CategoryIcon = category.icon;
          const payer = getMember(expense.paidById);
          const group = getGroup(expense.groupId);

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
                  {group?.name ?? "—"}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground">
                {payer?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <Amount value={expense.amount} signed={false} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
