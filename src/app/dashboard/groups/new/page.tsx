import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { CreateGroupForm } from "@/components/dashboard/create-group-form";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "New group",
};

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/dashboard/groups" />}>
        <ArrowLeftIcon />
        Back to groups
      </Button>
      <PageHeader
        title="New group"
        description="Name the nest, then invite the people you share it with."
      />
      <CreateGroupForm />
    </div>
  );
}
