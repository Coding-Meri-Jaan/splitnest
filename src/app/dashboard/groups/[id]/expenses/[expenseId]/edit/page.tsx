import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";

import { ExpenseForm } from "@/components/dashboard/expense-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroupDetail } from "@/lib/data/groups";

interface EditExpensePageProps {
  params: Promise<{ id: string; expenseId: string }>;
}

export default function EditExpensePage({ params }: EditExpensePageProps) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <EditExpenseContent params={params} />
    </Suspense>
  );
}

async function EditExpenseContent({ params }: EditExpensePageProps) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  const detail = await getGroupDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const expense = detail.expenses.find((item) => item.id === expenseId);
  if (!expense || expense.createdById !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/groups/${id}`} />}
      >
        <ArrowLeftIcon />
        {detail.group.name}
      </Button>

      <PageHeader
        title="Edit expense"
        description="Saving replaces this expense and recalculates everyone's share."
      />

      <Card>
        <CardContent className="pt-6">
          <ExpenseForm
            groupId={detail.group.id}
            members={detail.group.members}
            currentUserId={user.id}
            expense={expense}
          />
        </CardContent>
      </Card>
    </div>
  );
}
