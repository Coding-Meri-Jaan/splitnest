import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon } from "lucide-react";

import { PollForm } from "@/components/dashboard/polls/poll-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getPollDetail } from "@/lib/data/polls";

export const metadata: Metadata = {
  title: "Edit poll",
};

interface EditPollPageProps {
  params: Promise<{ id: string; pollId: string }>;
}

export default function EditPollPage({ params }: EditPollPageProps) {
  return (
    <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
      <EditPollContent params={params} />
    </Suspense>
  );
}

async function EditPollContent({ params }: EditPollPageProps) {
  const { id, pollId } = await params;
  const user = await getCurrentUser();
  const data = await getPollDetail(user.id, id, pollId);

  if (!data?.poll || !data.poll.canEdit) {
    notFound();
  }

  const { group, poll } = data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={
          <Link href={`/dashboard/groups/${group.id}/polls/${poll.id}`} />
        }
      >
        <ArrowLeftIcon />
        {poll.title}
      </Button>

      <PageHeader
        eyebrow="Edit poll"
        title="Edit poll"
        description="Saving updates the question and options. This stays available only until the first vote."
      />

      <Card>
        <CardContent className="pt-6">
          <PollForm groupId={group.id} poll={poll} />
        </CardContent>
      </Card>
    </div>
  );
}
