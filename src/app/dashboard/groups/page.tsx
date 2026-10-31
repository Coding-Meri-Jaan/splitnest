import type { Metadata } from "next";
import { PlusIcon } from "lucide-react";

import { GroupCard } from "@/components/dashboard/group-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { groups } from "@/data/sample-data";

export const metadata: Metadata = {
  title: "Groups",
};

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Every nest you share with friends, family, and flatmates."
        action={
          <Button type="button">
            <PlusIcon />
            New group
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
}
