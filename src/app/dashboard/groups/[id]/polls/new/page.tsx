import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { PollForm } from "@/components/dashboard/polls/poll-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroupBasics } from "@/lib/data/groups";
import { canEditLedger } from "@/lib/roles";

export const metadata: Metadata = {
  title: "New poll",
};

interface NewPollPageProps {
  params: Promise<{ id: string }>;
}

export default function NewPollPage({ params }: NewPollPageProps) {
  return (
    <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
      <NewPollContent params={params} />
    </Suspense>
  );
}

async function NewPollContent({ params }: NewPollPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const group = await getGroupBasics(user.id, id);

  if (!group) {
    notFound();
  }

  if (!canEditLedger(group.role)) {
    redirect(`/dashboard/groups/${group.id}/polls`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/groups/${group.id}/polls`} />}
      >
        <ArrowLeftIcon />
        Polls
      </Button>

      <PageHeader
        eyebrow="New poll"
        title="Ask the group"
        description="Add a few options, set a deadline, and let everyone vote. You can edit it until the first vote comes in."
      />

      <Card>
        <CardContent className="pt-6">
          <PollForm groupId={group.id} />
        </CardContent>
      </Card>
    </div>
  );
}
