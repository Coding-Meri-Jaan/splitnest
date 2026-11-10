import type { Metadata } from "next";
import { Suspense } from "react";

import { WhoOwesWhom } from "@/components/dashboard/who-owes-whom";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getPeople } from "@/lib/data/groups";

export const metadata: Metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your circle"
        title="People"
        description="Everyone in your nests and how you stand with each of them."
      />
      <Suspense fallback={<PeopleSkeleton />}>
        <PeopleList />
      </Suspense>
    </div>
  );
}

async function PeopleList() {
  const user = await getCurrentUser();
  const people = await getPeople(user.id);

  if (people.length === 0) {
    return (
      <Card className="sn-rise p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nobody here yet. Create a group and invite a friend.
        </p>
      </Card>
    );
  }

  return (
    <div className="sn-rise">
      <WhoOwesWhom
        people={people.map((person) => ({
          id: person.id,
          name: person.name,
          email: person.email,
          amount: person.netBalance,
          groupCount: person.sharedGroups,
        }))}
      />
    </div>
  );
}

function PeopleSkeleton() {
  return <div className="h-[32rem] sn-skeleton rounded-2xl" />;
}
