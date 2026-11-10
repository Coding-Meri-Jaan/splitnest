import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";

import { SettlementForm } from "@/components/dashboard/settlement-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroupBasics } from "@/lib/data/groups";
import { canEditLedger } from "@/lib/roles";

interface SettlePageProps {
  params: Promise<{ id: string }>;
}

export default function SettlePage({ params }: SettlePageProps) {
  return (
    <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
      <SettleContent params={params} />
    </Suspense>
  );
}

async function SettleContent({ params }: SettlePageProps) {
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
        eyebrow="Settle up"
        title="Record a settlement"
        description="Log money that has already changed hands, in cash or over UPI."
      />

      <Card>
        <CardContent className="pt-6">
          <SettlementForm
            groupId={group.id}
            members={group.members}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
