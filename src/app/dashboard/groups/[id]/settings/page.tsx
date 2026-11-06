import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";

import { DeleteGroupForm } from "@/components/dashboard/delete-group-form";
import { GroupSettingsForm } from "@/components/dashboard/group-settings-form";
import { MemberManageList } from "@/components/dashboard/member-manage-list";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroupDetail } from "@/lib/data/groups";

export const metadata: Metadata = {
  title: "Group settings",
};

interface GroupSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default function GroupSettingsPage({ params }: GroupSettingsPageProps) {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <GroupSettingsContent params={params} />
    </Suspense>
  );
}

async function GroupSettingsContent({ params }: GroupSettingsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getGroupDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const { group } = detail;
  const isOwner = group.creatorId === user.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/groups/${group.id}`} />}
      >
        <ArrowLeftIcon />
        {group.name}
      </Button>

      <PageHeader
        title="Group settings"
        description={
          isOwner
            ? "Rename the group, manage members, or delete it."
            : "See who is in this group or leave it."
        }
      />

      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Group details</CardTitle>
            <CardDescription>The name and emoji everyone sees.</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupSettingsForm groupId={group.id} name={group.name} emoji={group.emoji} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {isOwner
              ? "Remove people who have no expenses or settlements here."
              : "Only the owner can remove other people."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemberManageList
            groupId={group.id}
            members={group.members}
            ownerId={group.creatorId}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Delete this group</CardTitle>
            <CardDescription>
              Removing the nest also removes its history. There is no undo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteGroupForm groupId={group.id} groupName={group.name} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-16 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
