import type { Metadata } from "next";

import { ExpenseTable } from "@/components/dashboard/expense-table";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { expenses } from "@/data/sample-data";

export const metadata: Metadata = {
  title: "Activity",
};

export default function ActivityPage() {
  const sortedExpenses = [...expenses].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="All expenses recorded across your groups."
      />
      <Card>
        <ExpenseTable expenses={sortedExpenses} />
      </Card>
    </div>
  );
}
