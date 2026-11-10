import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";

import { ExpenseForm } from "@/components/dashboard/expense-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroupBasics } from "@/lib/data/groups";
import { canEditLedger } from "@/lib/roles";

interface NewExpensePageProps {
  params: Promise<{ id: string }>;
}

export default function NewExpensePage({ params }: NewExpensePageProps) {
  return (
    <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
      <NewExpenseContent params={params} />
    </Suspense>
  );
}

async function NewExpenseContent({ params }: NewExpensePageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const group = await getGroupBasics(user.id, id);

  if (!group) {
    notFound();
  }

  if (!canEditLedger(group.role)) {
    redirect(`/dashboard/groups/${group.id}`);
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
        {group.name}
      </Button>

      <PageHeader
        eyebrow="New expense"
        title="Add expense"
        description="Split it equally, by exact amounts, by percentages, or by shares."
      />

      <Card>
        <CardContent className="pt-6">
          <ExpenseForm
            groupId={group.id}
            members={group.members}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
