import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Suspense } from "react";

import { AddMemberForm } from "@/components/dashboard/add-member-form";
import { DeleteGroupForm } from "@/components/dashboard/delete-group-form";
import { GroupSettingsForm } from "@/components/dashboard/group-settings-form";
import { MemberManageList } from "@/components/dashboard/member-manage-list";
import { RoleBadge } from "@/components/dashboard/role-badge";
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
import { getGroupBasics } from "@/lib/data/groups";
import {
  assignableRoles,
  canDeleteGroup,
  canManageGroup,
} from "@/lib/roles";

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
  const group = await getGroupBasics(user.id, id);

  if (!group) {
    notFound();
  }

  const canManage = canManageGroup(group.role);
  const canDelete = canDeleteGroup(group.role);
  const rolesToAssign = assignableRoles(group.role);

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
        eyebrow="Nest settings"
        title="Group settings"
        description={
          canDelete
            ? "Rename the group, manage roles, or delete it."
            : canManage
              ? "Rename the group, manage members, or leave."
              : "See who is in this group or leave it."
        }
      />

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        You are a <RoleBadge role={group.role} withDescription /> here.
      </p>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Group details</CardTitle>
            <CardDescription>The name and emoji everyone sees.</CardDescription>
          </CardHeader>
          <CardContent>
            <GroupSettingsForm
              groupId={group.id}
              name={group.name}
              emoji={group.emoji}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {canDelete
              ? "Change roles, remove people, or leave once your balance is ₹0."
              : canManage
                ? "Add editors and viewers, or leave once your balance is ₹0."
                : "Only admins can change this list. You can leave once your balance here is ₹0."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {rolesToAssign.length > 0 ? (
            <AddMemberForm
              groupId={group.id}
              assignableRoles={rolesToAssign}
            />
          ) : null}

          <MemberManageList
            groupId={group.id}
            members={group.members}
            ownerId={group.creatorId}
            currentUserId={user.id}
            currentUserRole={group.role}
          />
        </CardContent>
      </Card>

      {canDelete ? (
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
      <div className="h-8 w-24 sn-skeleton rounded-full" />
      <div className="h-16 w-full max-w-lg sn-skeleton rounded-2xl" />
      <div className="h-56 sn-skeleton rounded-2xl" />
      <div className="h-56 sn-skeleton rounded-2xl" />
    </div>
  );
}
