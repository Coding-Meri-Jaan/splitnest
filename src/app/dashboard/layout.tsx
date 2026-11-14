import { Suspense, type ReactNode } from "react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbarUser } from "@/components/layout/dashboard-topbar-user";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      sidebar={
        <Suspense fallback={<div className="h-full w-full" />}>
          <DashboardSidebar />
        </Suspense>
      }
      topbar={
        <Suspense
          fallback={
            <div className="sticky top-0 z-50 h-16 border-b border-border/50 bg-background/60 backdrop-blur-xl" />
          }
        >
          <DashboardTopbarUser />
        </Suspense>
      }
    >
      {children}
    </DashboardShell>
  );
}
