import type { Metadata } from "next";
import { Suspense } from "react";

import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
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
        title="People"
        description="Everyone in your nests and how you stand with each of them."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
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
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nobody here yet. Create a group and invite a friend.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y">
        {people.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <MemberAvatar name={person.name} />
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {person.name}
                  {person.id === user.id ? <Badge variant="secondary">You</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {person.email} · {person.sharedGroups}{" "}
                  {person.sharedGroups === 1 ? "shared group" : "shared groups"}
                </p>
              </div>
            </div>

            {person.netBalance === 0 ? (
              <span className="text-sm text-muted-foreground">Settled up</span>
            ) : (
              <div className="text-right">
                <Amount value={person.netBalance} />
                <p className="text-xs text-muted-foreground">
                  {person.netBalance > 0 ? "owes you" : "you owe"}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
