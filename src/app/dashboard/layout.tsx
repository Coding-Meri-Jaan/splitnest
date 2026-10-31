import { Suspense, type ReactNode } from "react";

import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbarUser } from "@/components/layout/dashboard-topbar-user";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full bg-muted/30">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r bg-background md:flex">
        <Suspense fallback={<div className="h-full w-full" />}>
          <DashboardSidebar />
        </Suspense>
      </aside>
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <Suspense fallback={<div className="h-16 border-b bg-background" />}>
          <DashboardTopbarUser />
        </Suspense>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
