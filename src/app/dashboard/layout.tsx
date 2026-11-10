import { Suspense, type ReactNode } from "react";

import {
  DashboardSidebar,
  MobileBottomNav,
} from "@/components/layout/dashboard-sidebar";
import { DashboardTopbarUser } from "@/components/layout/dashboard-topbar-user";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sn-aurora flex min-h-svh w-full">
      <aside className="sticky top-0 hidden h-svh w-[17.5rem] shrink-0 p-3 md:flex">
        <div className="sn-glass flex h-full w-full flex-col overflow-hidden rounded-3xl">
          <Suspense fallback={<div className="h-full w-full" />}>
            <DashboardSidebar />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <Suspense
          fallback={
            <div className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/60 backdrop-blur-xl" />
          }
        >
          <DashboardTopbarUser />
        </Suspense>
        <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 md:px-8 md:pt-8 md:pb-10">
          {children}
        </main>
      </div>

      <Suspense fallback={null}>
        <MobileBottomNav />
      </Suspense>
    </div>
  );
}
