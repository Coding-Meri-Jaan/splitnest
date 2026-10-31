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

interface NewExpensePageProps {
  params: Promise<{ id: string }>;
}

export default function NewExpensePage({ params }: NewExpensePageProps) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
      <NewExpenseContent params={params} />
    </Suspense>
  );
}

async function NewExpenseContent({ params }: NewExpensePageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getGroupDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link href={`/dashboard/groups/${id}`} />}>
        <ArrowLeftIcon />
        {detail.group.name}
      </Button>

      <PageHeader title="Add expense" description="Split it equally between the people you pick." />

      <Card>
        <CardContent className="pt-6">
          <ExpenseForm
            groupId={detail.group.id}
            members={detail.group.members}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
